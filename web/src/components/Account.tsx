import { useEffect, useRef, useState } from 'react';
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
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  deleteDoc,
  type Timestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import AvatarEditor from 'react-avatar-editor';
import { saveAs } from 'file-saver';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();
  const editorRef = useRef<any>(null);
  const [photoModal, setPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'profile');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.exists() ? (snap.data() as Profile) : {}) as Profile;
        setProfile(data);
      },
      (err) => message.error(err.message)
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!profile || !user) return;
    form.setFieldsValue({
      displayName: profile.displayName || user.displayName || '',
      bio: profile.bio || '',
      pronouns: profile.pronouns || '',
      username: profile.username || '',
      email: profile.email || user.email || '',
    });
  }, [profile, user, form]);


  if (!user || !profile) return <Spin />;

  const beforeUpload = (file: File) => {
    setPhotoFile(file);
    setPhotoModal(true);
    return false;
  };

  const uploadPhoto = async () => {
    if (!uid || !photoFile || !editorRef.current) return;
    const canvas = editorRef.current.getImageScaledToCanvas();
    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) return;
      try {
        const storage = getStorage();
        const ref = storageRef(storage, `avatars/${uid}.png`);
        await uploadBytes(ref, blob);
        const url = await getDownloadURL(ref);
        await Promise.all([
          updateProfile(auth.currentUser!, { photoURL: url }),
          setDoc(doc(db, 'users', uid, 'profile'), { photoURL: url }, { merge: true }),
        ]);
        message.success('Photo updated');
        setPhotoModal(false);
        setPhotoFile(null);
      } catch (e: any) {
        message.error(e.message);
      }
    }, 'image/png');
  };

  const checkUsername = async (_: unknown, value: string) => {
    if (!value) return Promise.reject('Username is required');
    if (!/^[a-z0-9]{1,32}$/.test(value)) {
      return Promise.reject('Use 1-32 lowercase letters or numbers');
    }
    const snap = await getDocs(
      query(collection(db, 'users'), where('profile.username', '==', value))
    );
    if (!snap.empty && snap.docs[0].id !== uid) {
      return Promise.reject('Username already taken');
    }
    return Promise.resolve();
  };

  const saveProfile = async (vals: any) => {
    if (!uid) return;
    setSaving(true);
    try {
      if (vals.email && vals.email !== user.email) {
        await updateEmail(auth.currentUser!, vals.email);
      }
      if (vals.displayName !== user.displayName) {
        await updateProfile(auth.currentUser!, { displayName: vals.displayName });
      }
      await setDoc(
        doc(db, 'users', uid, 'profile'),
        {
          displayName: vals.displayName,
          bio: vals.bio || '',
          pronouns: vals.pronouns || '',
          username: vals.username,
          email: vals.email,
        },
        { merge: true }
      );
      message.success('Profile updated');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
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

  const changePassword = async (vals: any) => {
    if (!user?.email) return;
    if (vals.new !== vals.confirm) {
      message.error('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, vals.current);
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, vals.new);
      message.success('Password updated');
      pwForm.resetFields();
      setPwOpen(false);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setPwSaving(false);
    }
  };

  const downloadData = async () => {
    if (!uid) return;
    try {
      const profileSnap = await getDoc(doc(db, 'users', uid, 'profile'));
      const userSnap = await getDoc(doc(db, 'users', uid));
      const data = {
        user: userSnap.data(),
        profile: profileSnap.data(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      saveAs(blob, 'my-data.json');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const doDelete = async () => {
    if (!uid) return;
    try {
      const storage = getStorage();
      try {
        await deleteObject(storageRef(storage, `avatars/${uid}.png`));
      } catch {}
      await deleteDoc(doc(db, 'users', uid, 'profile'));
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(auth.currentUser!);
    } catch (e: any) {
      message.error(e.message);
      return;
    }
    message.success('Account deleted');
  };

  return (
    <Card title="Account Settings" className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      <Row gutter={[16, 16]}>
        <Col span={24} style={{ textAlign: 'center' }}>
          <Avatar src={profile.photoURL || user.photoURL || undefined} size={96} />
          <div style={{ marginTop: 8 }}>
            <Upload showUploadList={false} beforeUpload={beforeUpload}>
              <Button icon={<UploadOutlined />}>Change Photo</Button>
            </Upload>
          </div>
        </Col>
        <Col span={24}>
          <Form form={form} layout="vertical" onFinish={saveProfile}>
            <Form.Item name="displayName" label="Full Name" rules={[{ required: true }]}> <Input /> </Form.Item>
            <Form.Item name="bio" label="Bio" rules={[{ max: 160 }]}> <Input.TextArea rows={2} /> </Form.Item>
            <Form.Item name="pronouns" label="Pronouns"> <Input /> </Form.Item>
            <Form.Item name="username" label="Username" rules={[{ validator: checkUsername }]} validateTrigger="onBlur"> <Input /> </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> <Input /> </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
            </Form.Item>
          </Form>
          <Collapse activeKey={pwOpen ? ['pw'] : []} onChange={() => setPwOpen(!pwOpen)}>
            <Collapse.Panel header="Change Password" key="pw">
              <Form form={pwForm} layout="vertical" onFinish={changePassword}>
                <Form.Item name="current" label="Current Password" rules={[{ required: true }]}> <Input.Password /> </Form.Item>
                <Form.Item name="new" label="New Password" rules={[{ required: true, min: 12, pattern: /[^A-Za-z0-9]/ }]}> <Input.Password /> </Form.Item>
                <Progress percent={strength(pwForm.getFieldValue('new') || '')} showInfo={false} />
                <Form.Item name="confirm" label="Confirm Password" dependencies={['new']} rules={[{ required: true }, ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue('new') === value ? Promise.resolve() : Promise.reject('Passwords do not match');
                  },
                })]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={pwSaving}>Update Password</Button>
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
        </Col>
      </Row>
      <Modal open={photoModal} onOk={uploadPhoto} onCancel={() => setPhotoModal(false)} okText="Save">
        {photoFile && (
          <AvatarEditor ref={editorRef} image={photoFile} width={200} height={200} border={50} scale={1} />
        )}
      </Modal>
    </Card>
  );
}
