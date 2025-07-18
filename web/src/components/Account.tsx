import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Card,
  Avatar,
  Button,
  Spin,
  Row,
  Col,
  Form,
  Input,
  Upload,
  Modal,
  Collapse,
  message,
  Progress,
  Tag,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  collection,
  deleteDoc,
  type Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { toast } from '../lib/toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const LoadingSpinner = Spin;

async function getCropped(file: File, area: Area | null): Promise<Blob> {

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.crossOrigin = 'anonymous';
    i.src = url;
  });
  const a = area ?? {
    x: 0,
    y: 0,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
  const canvas = document.createElement('canvas');
  canvas.width = a.width;
  canvas.height = a.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    a.x,
    a.y,
    a.width,
    a.height,
    0,
    0,
    a.width,
    a.height,

  );
  return new Promise((resolve) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      URL.revokeObjectURL(url);
    }, 'image/jpeg');
  });
}

interface Profile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  pronouns?: string;
  username?: string;
  lastSignedInAt?: Timestamp;
}

export function Account() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const profileRef = useMemo(() => (uid ? doc(db, 'users', uid) : null), [uid]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // username stored separately for easy display
  const [username, setUsername] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  // controlled fields for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // local email value and saving state
  const [email, setEmail] = useState('');

  // change email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm] = Form.useForm();
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [values, setValues] = useState({
    displayName: '',
    bio: '',
    pronouns: '',
    username: '',
    email: '',
  });
  const [original, setOriginal] = useState({
    displayName: '',
    bio: '',
    pronouns: '',
    username: '',
    email: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [savingField, setSavingField] = useState<keyof typeof values | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [groups, setGroups] = useState<
    Array<{ id: string; name: string; isDeleted?: boolean; deletedAt?: Timestamp }>
  >([]);

  const refs: Record<keyof typeof values, React.RefObject<HTMLDivElement | null>> = {
    displayName: useRef<HTMLDivElement | null>(null),
    bio: useRef<HTMLDivElement | null>(null),
    pronouns: useRef<HTMLDivElement | null>(null),
    username: useRef<HTMLDivElement | null>(null),
    email: useRef<HTMLDivElement | null>(null),
  };

  // show success toast when redirected from verification
  useEffect(() => {
    if (window.location.hash === '#emailUpdated') {
      toast.success('Your email has been updated successfully.');
      window.location.hash = '';
    }
  }, []);

  // Fetch profile once on mount to avoid resetting values on each keystroke
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    (async () => {
      setLoadingUser(true);
      try {
        const snap = await getDoc(ref);

        const raw = (snap.data() || {}) as Partial<Profile> & {
          profile?: Partial<Profile>;
          handle?: string;
        };
        const data: Profile & { handle?: string } = {
          ...(raw.profile || {}),
          ...(raw as Partial<Profile>),
        };

        setProfile(data);
        const uname = (data.username || (data as { handle?: string }).handle || '').toString();
        const merged = {
          displayName: data.displayName || auth.currentUser?.displayName || '',
          bio: data.bio || '',
          pronouns: data.pronouns || '',
          username: uname,
          email: data.email || auth.currentUser?.email || '',
        };
        setValues(merged);
        setOriginal(merged);
        setEmail(merged.email);
        setUsername(uname);
        setPreviewURL(data.photoURL || auth.currentUser?.photoURL || null);
      } catch (err) {
        const msg = (err as FirebaseError).message ?? String(err);
        message.error(msg);

      } finally {
        setLoadingUser(false);
      }
    })();
  }, [uid]);


  // subscribe to user's tags
  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, 'users', uid, 'tags');
    const unsub = onSnapshot(ref, snap => {
      setTags(snap.docs.map(d => d.id));
    });
    return unsub;
  }, [uid]);

  // subscribe to user's groups
  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, 'users', uid, 'groups');
    const unsub = onSnapshot(ref, async snap => {
      const ids = snap.docs.map(d => d.id);
      const results: Array<{ id: string; name: string; isDeleted?: boolean; deletedAt?: Timestamp }> = [];
      for (const id of ids) {
        const g = await getDoc(doc(db, 'groups', id));
        if (g.exists()) {
          const data = g.data() as any;
          const within = data.isDeleted && data.deletedAt && (Date.now() - data.deletedAt.toMillis() <= 15 * 24 * 60 * 60 * 1000);
          if (data.isDeleted && !within) continue;
          results.push({ id, name: within ? 'Group Deleted' : data.name, isDeleted: data.isDeleted, deletedAt: data.deletedAt });
        }
      }
      setGroups(results);
    });
    return unsub;
  }, [uid]);



  const beforeUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Images only');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Max file size 2MB');
      return Upload.LIST_IGNORE;
    }
    setPhotoFile(file);
    setPhotoURL(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    return false;
  };

  useEffect(() => {
    return () => {
      if (photoURL) URL.revokeObjectURL(photoURL);
    };
  }, [photoURL]);

  useEffect(() => {
    return () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
  }, [previewURL]);

  useEffect(() => {
    if (!photoFile) return;
    let cancelled = false;
    (async () => {
      const blob = await getCropped(photoFile, croppedArea);
      const croppedFile = new File([blob], photoFile.name, { type: 'image/jpeg' });
      const compressed = await imageCompression(croppedFile, {
        maxWidthOrHeight: 800,
        initialQuality: 0.8,
        fileType: 'image/jpeg',
        alwaysKeepResolution: true,
      });
      if (!cancelled) setPreviewURL(URL.createObjectURL(compressed));
    })();
    return () => {
      cancelled = true;
    };
  }, [photoFile, croppedArea]);

  if (!user || !profile || loadingUser) return <LoadingSpinner />;

  const savePhoto = async () => {
    if (!uid || !photoFile || !profileRef) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const blob = await getCropped(photoFile, croppedArea);
      const croppedFile = new File([blob], `${uid}.jpg`, { type: 'image/jpeg' });
      const compressed = await imageCompression(croppedFile, {
        maxWidthOrHeight: 800,
        initialQuality: 0.8,
        fileType: 'image/jpeg',
        alwaysKeepResolution: true,
      });
      const ref = storageRef(storage, `avatars/${uid}.jpg`);
      const uploadTask = uploadBytesResumable(ref, compressed);
      const url: string = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          },
          (err) => reject(err),
          async () => {
            try {
              resolve(await getDownloadURL(uploadTask.snapshot.ref));
            } catch (err) {
              reject(err);
            }
          },
        );
      });
      await Promise.all([
        updateProfile(auth.currentUser!, { photoURL: url }),
        updateDoc(profileRef, { photoURL: url }),
      ]);
      setProfile((p) => (p ? { ...p, photoURL: url } : p));
      setPreviewURL(url);
      message.success('Photo updated');
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(msg);

    } finally {
      setUploadProgress(0);
      setUploading(false);
      setPhotoFile(null);
      setPhotoURL(null);
      setCroppedArea(null);
    }
  };

  const validateField = async (
    field: keyof typeof values,
    value: string,
  ): Promise<string | null> => {
    if (field === 'displayName') {
      if (!value) return 'Display name is required';
      if (value.length > 50) return 'Max 50 characters';
    } else if (field === 'bio') {
      if (value.length > 160) return 'Max 160 characters';
    } else if (field === 'pronouns') {
      if (value.length > 20) return 'Max 20 characters';
    } else if (field === 'username') {
      if (!/^[A-Za-z0-9_]{3,32}$/.test(value))
        return '3-32 letters, numbers or _';

      const lower = value.toLowerCase();
      const snap = await getDoc(doc(db, 'usernames', lower));
      if (snap.exists() && snap.data()?.uid !== uid) {
        return 'This username is already taken.';
      }
      // fallback to searching users collection for older accounts
      const existing = await getDocs(
        query(collection(db, 'users'), where('handle', '==', lower)),
      );
      const taken = existing.docs.find(d => d.id !== uid);
      if (taken) {
        return 'This username is already taken.';

      }

    } else if (field === 'email') {
      const re = /[^@]+@[^.]+\..+/;
      if (!re.test(value)) return 'Invalid email';
    }
    return null;
  };

  const animate = (field: keyof typeof values, type: 'success' | 'error') => {
    const el = refs[field].current;
    if (!el) return;
    el.classList.remove('animate-success', 'animate-error');
    void el.offsetWidth; // reset
    el.classList.add(type === 'success' ? 'animate-success' : 'animate-error');
  };


  const saveField = async (field: keyof typeof values) => {
    if (!uid || !profileRef) return;
    const value = values[field];
    setSavingField(field);
    const err = await validateField(field, value);
    setErrors((e) => ({ ...e, [field]: err || undefined }));
    if (err || value === original[field]) {
      setSavingField(null);
      return;
    }
    try {
      if (field === 'username') {
        const lower = value.toLowerCase();
        const ref = doc(db, 'usernames', lower);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data()?.uid !== uid) {
          message.error('Username already taken');
          animate('username', 'error');
          setValues(v => ({ ...v, username: original.username }));
          setUsername(original.username);
          return;
        }
        const existing = await getDocs(
          query(collection(db, 'users'), where('handle', '==', lower)),
        );
        if (existing.docs.find(d => d.id !== uid)) {
          message.error('Username already taken');
          animate('username', 'error');
          setValues(v => ({ ...v, username: original.username }));

          setUsername(original.username);
          return;
        }
        const batchData: Record<string, unknown> = {
          username: value,
          usernameLower: lower,
        };
        await updateDoc(profileRef, batchData as DocumentData);
        await setDoc(ref, { uid });
        const oldLower = original.username.toLowerCase();
        if (oldLower && oldLower !== lower) {
          await deleteDoc(doc(db, 'usernames', oldLower));
        }
      } else if (field === 'email') {
        // Trim the new email
        const newEmail = value.trim();

        // Skip checks if unchanged
        if (
          newEmail.toLowerCase() === (auth.currentUser?.email ?? '').toLowerCase()
        ) {
          setSavingField(null);
          return;
        }

        // Verify the email doesn't already exist

        let methods: string[] = [];
        try {
          methods = await fetchSignInMethodsForEmail(auth, newEmail);
        } catch (e) {
          // Fetch failed
          const msg = (e as FirebaseError).message ?? String(e);
          message.error(msg);
          animate('email', 'error');
          setValues((v) => ({ ...v, email: original.email }));

          setSavingField(null);
          return;
        }

        if (methods.length > 0) {
          // Email belongs to another account
          animate('email', 'error');
          message.error('Email already in use.');
          setValues((v) => ({ ...v, email: auth.currentUser?.email || '' }));

          setSavingField(null);
          return;
        }

        try {
          // Update Firebase Auth and Firestore
          await updateEmail(auth.currentUser!, newEmail);

          await setDoc(
            doc(db, 'users', uid),
            { profile: { email: newEmail } },
            { merge: true },
          );
          message.success('Email updated.');
          animate('email', 'success');
          setOriginal((o) => ({ ...o, email: newEmail }));
        } catch (e) {
          // Error updating
          const msg = (e as FirebaseError).message ?? String(e);
          message.error(msg);
          animate('email', 'error');
          setValues((v) => ({ ...v, email: original.email }));

        }

        setSavingField(null);
        return;
      } else {
        const data: Record<string, unknown> = { [field]: value };
        await updateDoc(profileRef, data as DocumentData);
        if (field === 'displayName')
          await updateProfile(auth.currentUser!, { displayName: value });
      }
      message.success(`${field} updated`);
      animate(field, 'success');
      setOriginal((o) => ({ ...o, [field]: value }));
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(`${field} failed: ${msg}`);
      animate(field, 'error');
    } finally {
      setSavingField(null);
    }
  };


  const strength = (pw: string) => {
    let score = 0;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return (score / 4) * 100;
  };

  const strongEnough = newPassword.length >= 12 && /[^A-Za-z0-9]/.test(newPassword);
  const canChangePw = !!currentPassword && newPassword === confirmPassword && strongEnough;

  const changePassword = async () => {
    if (!user?.email) return;
    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, newPassword);
      message.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwOpen(false);
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const downloadData = async () => {
    if (!uid || !profileRef) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const profileSnap = await getDoc(profileRef);
      const data = {
        ...(userSnap.data() || {}),
        profile: profileSnap.data() || {},
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      saveAs(blob, 'my-data.json');
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(msg);
    }
  };

  const submitEmailChange = async () => {
    try {
      const { newEmail, currentPassword } = await emailForm.validateFields();
      setEmailSubmitting(true);
      const fn = httpsCallable(functions, 'initiateEmailChange');
      await fn({ newEmail, currentPassword });
      toast.success(`Verification email sent to ${newEmail}. Please click the link to confirm.`);
      setPendingEmail(newEmail);
      setEmailModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const resendEmailChange = async () => {
    if (!pendingEmail) return;
    try {
      setEmailSubmitting(true);
      const fn = httpsCallable(functions, 'initiateEmailChange');
      await fn({ newEmail: pendingEmail, currentPassword: '' });
      toast.success(`Verification email sent to ${pendingEmail}. Please click the link to confirm.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const doDelete = async () => {
    if (!uid) return;
    try {
      try {
        await deleteObject(storageRef(storage, `avatars/${uid}.jpg`));
      } catch {
        /* ignore */
      }
      if (profileRef) {
        await deleteDoc(profileRef);
      }

      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(auth.currentUser!);
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(msg);
      return;
    }
    message.success('Account deleted');
  };

  // tag membership changes now handled in Explore page

  return (
    <>
    <Row gutter={[16, 16]} style={{ margin: '2rem' }}>
      <Col xs={24} md={12}>
        <Card title="Preview" className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Avatar
              src={
                previewURL ||
                profile?.photoURL ||
                user?.photoURL ||
                undefined
              }
              size={96}
            />

          </div>
          <p><strong>{values.displayName}</strong></p>
        <p>{values.bio}</p>
        <p>{values.pronouns}</p>
        <p>@{username}</p>
        <p>{email}</p>
        </Card>
        <Card title="My Tags" className="glass-card" style={{ marginTop: 16 }}>
          {tags.map(t => (
            <Tag key={t} style={{ marginBottom: 4 }}>
              #{t}
            </Tag>
          ))}
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => window.location.href='/explore'}>
            Manage Tags
          </Button>
        </Card>
        <Card title="My Ensembles" className="glass-card" style={{ marginTop: 16 }}>
          {groups.map(g => (
            // 4️⃣ Exclude or placeholder-render deleted groups
            <Tag key={g.id} style={{ marginBottom: 4, opacity: g.isDeleted ? 0.5 : 1 }}>
              {g.name}
            </Tag>
          ))}
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => window.location.href='/groups'}>
            Manage
          </Button>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Edit Profile" className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Upload showUploadList={false} beforeUpload={beforeUpload} accept="image/*">
              <Button icon={<UploadOutlined />}>Upload Photo</Button>
            </Upload>
          </div>
          {photoFile && photoURL && (
            <Spin spinning={uploading} tip="Uploading...">
              <div style={{ position: 'relative', width: '100%', height: 200 }}>
                <Cropper
                  image={photoURL}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, area) => setCroppedArea(area)}
                />
              </div>
              {previewURL && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <img src={previewURL} alt="preview" style={{ width: 100, borderRadius: '50%' }} />
                </div>
              )}
              {uploading && (
                <Progress percent={uploadProgress} style={{ marginTop: 8 }} />
              )}
              <Row justify="center" gutter={8} style={{ marginTop: 8 }}>
                <Col>
                  <Button type="primary" onClick={savePhoto} disabled={uploading}>Save Photo</Button>
                </Col>
                <Col>
                  <Button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoURL(null);
                      setPreviewURL(null);
                      setCroppedArea(null);
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>

                </Col>
              </Row>
            </Spin>
          )}

          <Form layout="vertical">
          <div ref={refs.displayName} style={{ marginTop: 16 }}>
            <Form.Item label="Display Name" validateStatus={errors.displayName ? 'error' : ''} help={errors.displayName || ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  style={{ flex: 1 }}
                  value={values.displayName}
                  onChange={(e) => setValues({ ...values, displayName: e.target.value })}
                  onBlur={() => saveField('displayName')}
                />
                <Button size="small" type="primary" onClick={() => saveField('displayName')} disabled={values.displayName === original.displayName || !!errors.displayName} loading={savingField === 'displayName'}>
                  Save
                </Button>
              </div>
            </Form.Item>
          </div>

          <div ref={refs.bio} style={{ marginTop: 16 }}>
            <Form.Item label="Bio" validateStatus={errors.bio ? 'error' : ''} help={errors.bio || ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input.TextArea
                  style={{ flex: 1 }}
                  rows={2}
                  value={values.bio}
                  onChange={(e) => setValues({ ...values, bio: e.target.value })}
                  onBlur={() => saveField('bio')}
                />
                <Button size="small" type="primary" onClick={() => saveField('bio')} disabled={values.bio === original.bio || !!errors.bio} loading={savingField === 'bio'}>
                  Save
                </Button>
              </div>
            </Form.Item>
          </div>

          <div ref={refs.pronouns} style={{ marginTop: 16 }}>
            <Form.Item label="Pronouns" validateStatus={errors.pronouns ? 'error' : ''} help={errors.pronouns || ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  style={{ flex: 1 }}
                  value={values.pronouns}
                  onChange={(e) => setValues({ ...values, pronouns: e.target.value })}
                  onBlur={() => saveField('pronouns')}
                />

                <Button size="small" type="primary" onClick={() => saveField('pronouns')} disabled={values.pronouns === original.pronouns || !!errors.pronouns} loading={savingField === 'pronouns'}>
                  Save
                </Button>
              </div>
            </Form.Item>
          </div>

          <div ref={refs.username} style={{ marginTop: 16 }}>
            <Form.Item label="Username" validateStatus={errors.username ? 'error' : ''} help={errors.username || ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  style={{ flex: 1 }}
                  addonBefore="@"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setValues({ ...values, username: e.target.value });
                  }}
                  disabled={savingField === 'username'}
                  onBlur={() => saveField('username')}
                />
                <Button
                  size="small"
                  type="primary"
                  onClick={() => saveField('username')}
                  disabled={
                    savingField === 'username' ||
                    values.username === original.username ||
                    !!errors.username
                  }
                  loading={savingField === 'username'}
                >
                  Save
                </Button>
              </div>
            </Form.Item>
          </div>

          <div ref={refs.email} style={{ marginTop: 16 }}>
            <Form.Item label="Email">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input style={{ flex: 1 }} value={email} disabled readOnly />
                <Button size="small" type="primary" onClick={() => {
                  emailForm.setFieldsValue({ newEmail: '', currentPassword: '' });
                  setEmailModalOpen(true);
                }}>
                  Change Email
                </Button>
              </div>
            </Form.Item>
          </div>
          </Form>

          <Collapse activeKey={pwOpen ? ['pw'] : []} onChange={() => setPwOpen(!pwOpen)} style={{ marginTop: 24 }}>
            <Collapse.Panel header="Change Password" key="pw">
              <Form layout="vertical">
                <Form.Item label="Current Password">
                  <Input.Password value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </Form.Item>
                <Form.Item label="New Password" help="At least 12 chars & one special" validateStatus={newPassword && newPassword.length < 12 ? 'error' : undefined}>
                  <Input.Password value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </Form.Item>
                <Progress percent={strength(newPassword)} showInfo={false} />
                <Form.Item label="Confirm Password" validateStatus={confirmPassword && confirmPassword !== newPassword ? 'error' : undefined}>
                  <Input.Password value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={changePassword} loading={pwSaving} disabled={!canChangePw}>
                    Update Password
                  </Button>
                </Form.Item>
              </Form>
            </Collapse.Panel>
          </Collapse>

          <Card type="inner" title="Danger Zone" style={{ marginTop: 24 }}>
            <Row gutter={16}>
              <Col>
                <Button onClick={downloadData}>Download My Data</Button>
              </Col>
              <Col>
                <Button danger onClick={() => Modal.confirm({ title: 'Delete account?', okText: 'Delete', okButtonProps: { danger: true }, onOk: doDelete })}>Delete Account</Button>
              </Col>
            </Row>
          </Card>
        </Card>
      </Col>
    </Row>
    <Modal
      open={emailModalOpen}
      title="Change Email"
      onCancel={() => setEmailModalOpen(false)}
      footer={null}
    >
      <Form form={emailForm} layout="vertical" onFinish={submitEmailChange}>
        <Form.Item name="newEmail" label="New Email" rules={[{ required: true, type: 'email' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}> 
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={emailSubmitting} disabled={emailSubmitting}>
            Submit
          </Button>
        </Form.Item>
      </Form>
      {pendingEmail && (
        <Button type="link" onClick={resendEmailChange} disabled={emailSubmitting}>
          Resend verification email
        </Button>
      )}
    </Modal>
    </>
  );
}
