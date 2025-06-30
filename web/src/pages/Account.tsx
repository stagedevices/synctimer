import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Tabs,
  Row,
  Col,
  Card,
  ConfigProvider,
  Switch,
  Modal,
  message,
} from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  createAccount,
  signInWithIdentifier,
  sendPasswordResetEmail,
} from '../lib/auth';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';

interface SignInVals {
  identifier: string;
  password: string;
  remember?: boolean;
}

interface CreateVals {
  email: string;
  handle: string;
  name?: string;
  password: string;
  confirm: string;
}

export function Account() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.body.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navigate = useNavigate();
  const [signInForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const validateHandle = async (_: unknown, value: string) => {
    if (!value) return Promise.reject('Username is required');
    if (!/^[a-z0-9_]{1,32}$/.test(value)) {
      return Promise.reject('Use a-z, 0-9 or _ (max 32)');
    }
    const snap = await getDocs(
      query(collection(db, 'users'), where('handle', '==', value.toLowerCase()))
    );
    if (!snap.empty) return Promise.reject('Username already taken');
    return Promise.resolve();
  };

  const passwordRule = {
    validator(_: unknown, value: string) {
      if (!value) return Promise.reject('Password is required');
      const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?])[ -~]{12,}$/;
      return re.test(value)
        ? Promise.resolve()
        : Promise.reject('Min 12 chars with letters, numbers & symbol');
    },
  };

  const onSignIn = async (vals: SignInVals) => {
    setLoadingSignIn(true);
    try {
      await signInWithIdentifier(vals.identifier, vals.password, vals.remember);
      navigate('/parse');
    } catch (e) {
      const msg = (e as FirebaseError).message || 'Sign in failed';
      message.error(msg);
    } finally {
      setLoadingSignIn(false);
    }
  };

  const onCreate = async (vals: CreateVals) => {
    if (vals.password !== vals.confirm) {
      message.error('Passwords do not match');
      return;
    }
    setLoadingCreate(true);
    try {
      const [first = '', last = ''] = (vals.name || '').split(/\s+/, 2);
      await createAccount(
        vals.email,
        vals.handle.toLowerCase(),
        first,
        last,
        vals.password
      );
      navigate('/parse');
    } catch (e) {
      const msg = (e as FirebaseError).message || 'Account creation failed';
      message.error(msg);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleForgot = async () => {
    try {
      const id = forgotForm.getFieldValue('identifier');
      if (!id) {
        message.error('Please enter your email or handle');
        return;
      }
      setForgotLoading(true);
      let email = id as string;
      if (!id.includes('@')) {
        const snap = await getDocs(
          query(collection(db, 'users'), where('handle', '==', id.toLowerCase()))
        );
        if (snap.empty) {
          message.error('User not found');
          setForgotLoading(false);
          return;
        }
        email = (snap.docs[0].data() as { email: string }).email;
      }
      await sendPasswordResetEmail(auth, email);
      message.success('Password reset sent');
      setForgotOpen(false);
      forgotForm.resetFields();
    } catch (e) {
      const msg = (e as FirebaseError).message || 'Failed to send reset email';
      message.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#70C73C', fontFamily: 'system-ui' } }}>
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={23} sm={16} md={12} lg={8}>
          <Card className="glass-card">
            <Row justify="space-between" align="middle" style={{ marginBottom: '1rem' }}>
              <h1 style={{ margin: 0 }}>SyncTimer</h1>
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={dark}
                onChange={setDark}
              />
            </Row>
            <Tabs
              items={[
                {
                  key: 'signin',
                  label: 'Sign In',
                  children: (
                    <Form form={signInForm} layout="vertical" onFinish={onSignIn} initialValues={{ remember: true }}>
                      <Form.Item name="identifier" label="Username or Email" rules={[{ required: true }]}> <Input /> </Form.Item>
                      <Form.Item name="password" label="Password" rules={[{ required: true }]}> <Input.Password /> </Form.Item>
                      <Form.Item name="remember" valuePropName="checked"> <Checkbox>Remember me</Checkbox> </Form.Item>
                      <Form.Item>
                        <Button type="link" onClick={() => setForgotOpen(true)} style={{ padding: 0 }}>
                          Forgot password?
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loadingSignIn} disabled={loadingSignIn}>
                          Sign In
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'create',
                  label: 'Create Account',
                  children: (
                    <Form form={createForm} layout="vertical" onFinish={onCreate}>
                      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> <Input /> </Form.Item>
                      <Form.Item name="handle" label="Username" rules={[{ validator: validateHandle }]} validateTrigger="onBlur"> <Input /> </Form.Item>
                      <Form.Item name="name" label="Full name"> <Input /> </Form.Item>
                      <Form.Item name="password" label="Password" rules={[passwordRule]}> <Input.Password /> </Form.Item>
                      <Form.Item
                        name="confirm"
                        label="Confirm Password"
                        dependencies={["password"]}
                        rules={[
                          { required: true },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('password') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Passwords do not match'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loadingCreate} disabled={loadingCreate}>
                          Create Account
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        open={forgotOpen}
        title="Reset Password"
        onCancel={() => setForgotOpen(false)}
        onOk={handleForgot}
        okText="Send Reset"
        confirmLoading={forgotLoading}
      >
        <Form form={forgotForm} layout="vertical">
          <Form.Item name="identifier" label="Email or Handle" rules={[{ required: true }]}> <Input /> </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
