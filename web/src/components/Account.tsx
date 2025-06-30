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
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  deleteDoc,
  deleteField,
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
  const navigate = useNavigate();
  const uid = user?.uid;
  const profileRef = useMemo(() => (uid ? doc(db, 'users', uid) : null), [uid]);
  const photoDoc = useMemo(
    () => (uid ? doc(db, 'users', uid, 'profile') : null),
    [uid],
  );
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!auth.currentUser) navigate('/account');
  }, [navigate, user]);

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

  const refs: Record<keyof typeof values, React.RefObject<HTMLDivElement | null>> = {
    displayName: useRef<HTMLDivElement | null>(null),
    bio: useRef<HTMLDivElement | null>(null),
    pronouns: useRef<HTMLDivElement | null>(null),
    username: useRef<HTMLDivElement | null>(null),
    email: useRef<HTMLDivElement | null>(null),
  };

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

        let url = data.photoURL || auth.currentUser?.photoURL || null;
        if (photoDoc) {
          const photoSnap = await getDoc(photoDoc);
          url = (photoSnap.data() as { photoURL?: string })?.photoURL || url;
        }
        setProfile({ ...data, photoURL: url || undefined });
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
        setUsername(uname);
        setPreviewURL(url);
      } catch (err) {
        const msg = (err as FirebaseError).message ?? String(err);
        message.error(msg);

      } finally {
        setLoadingUser(false);
      }
    })();
  }, [uid]);



  const beforeUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Images only');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('File too large (max 5 MB)');
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
        maxWidthOrHeight: 1024,
        initialQuality: 0.8,
        maxSizeMB: 0.2,
        fileType: 'image/jpeg',
        alwaysKeepResolution: true,
      });
      if (!cancelled) setPreviewURL(URL.createObjectURL(compressed));
    })();
    return () => {
      cancelled = true;
    };
  }, [photoFile, croppedArea]);

  if (!user) return <LoadingSpinner />;

  const savePhoto = async () => {
    if (!uid || !photoFile || !profileRef) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const blob = await getCropped(photoFile, croppedArea);
      const croppedFile = new File([blob], `${uid}.jpg`, { type: 'image/jpeg' });
      const compressed = await imageCompression(croppedFile, {
        maxWidthOrHeight: 1024,
        initialQuality: 0.8,
        maxSizeMB: 0.2,
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
        photoDoc ? setDoc(photoDoc, { photoURL: url }) : Promise.resolve(),
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

  const removePhoto = async () => {
    if (!uid || !photoDoc) return;
    try {
      await deleteObject(storageRef(storage, `avatars/${uid}.jpg`));
    } catch {
      /* ignore */
    }
    try {
      await updateProfile(auth.currentUser!, { photoURL: '' });
      await updateDoc(photoDoc, { photoURL: deleteField() });
      setPreviewURL(null);
      setProfile((p) => (p ? { ...p, photoURL: undefined } : p));
      message.success('Photo removed');
    } catch (e) {
      const msg = (e as FirebaseError).message ?? String(e);
      message.error(msg);
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
      const userCol = collection(db, 'users');

      // potential fields where username might live
      const checks = [
        query(userCol, where('usernameLower', '==', lower)),
        query(userCol, where('profile.usernameLower', '==', lower)),
        query(userCol, where('username', '==', value)),
        query(userCol, where('profile.username', '==', value)),
      ];

      for (const q of checks) {
        const snap = await getDocs(q);
        const taken = snap.docs.find((d) => d.id !== uid);
        if (taken) return 'This username is already taken.';
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
    const err = await validateField(field, value);
    setErrors((e) => ({ ...e, [field]: err || undefined }));
    if (err || value === original[field]) return;
    setSavingField(field);
    try {
      const data: Record<string, unknown> = { [field]: value };
      if (field === 'username') data.usernameLower = value.toLowerCase();
      await updateDoc(profileRef, data as DocumentData);
      if (field === 'displayName')
        await updateProfile(auth.currentUser!, { displayName: value });
      if (field === 'email') await updateEmail(auth.currentUser!, value);
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

  return (
    <Row gutter={[16, 16]} style={{ margin: '2rem' }}>
      <Col xs={24} md={12}>
        <Card title="Preview" className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Spin spinning={loadingUser}>
              <Avatar
                src={
                  previewURL ||
                  profile?.photoURL ||
                  user?.photoURL ||
                  undefined
                }
                size={96}
              />
            </Spin>

          </div>
          <p><strong>{values.displayName}</strong></p>
          <p>{values.bio}</p>
          <p>{values.pronouns}</p>
          <p>@{username}</p>
          <p>{values.email}</p>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Edit Profile" className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Upload showUploadList={false} beforeUpload={beforeUpload} accept="image/*">
              <Button icon={<UploadOutlined />}>Upload Photo</Button>
            </Upload>
          </div>
          {profile?.photoURL && !photoFile && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Button danger onClick={removePhoto}>Remove Photo</Button>
            </div>
          )}
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
                  onBlur={() => saveField('username')}
                />
                <Button size="small" type="primary" onClick={() => saveField('username')} disabled={values.username === original.username || !!errors.username} loading={savingField === 'username'}>
                  Save
                </Button>
              </div>
            </Form.Item>
          </div>

          <div ref={refs.email} style={{ marginTop: 16 }}>
            <Form.Item label="Email" validateStatus={errors.email ? 'error' : ''} help={errors.email || ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  style={{ flex: 1 }}
                  value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                  onBlur={() => saveField('email')}
                />
                <Button size="small" type="primary" onClick={() => saveField('email')} disabled={values.email === original.email || !!errors.email} loading={savingField === 'email'}>
                  Save
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
  );
}
