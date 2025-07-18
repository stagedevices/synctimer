import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Tabs,
  message,
  Row,
  Col,
  Switch,
  Card,
  ConfigProvider,
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

export function AuthPage() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.body.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const navigate = useNavigate();

  const [signInForm] = Form.useForm();
  const [createForm] = Form.useForm();

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
    try {
      await signInWithIdentifier(vals.identifier, vals.password, vals.remember);
      navigate('/parse');
    } catch (e) {
      const msg = (e as FirebaseError).message || 'Sign in failed';
      message.error(msg);
    }
  };

  const onCreate = async (vals: CreateVals) => {
    if (vals.password !== vals.confirm) {
      message.error('Passwords do not match');
      return;
    }
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
    }
  };

  const onForgot = async (identifier?: string) => {
    const id = identifier || signInForm.getFieldValue('identifier');
    if (!id) {
      message.error('Enter your email to reset password');
      return;
    }
    let email = id;
    if (!id.includes('@')) {
      const snap = await getDocs(
        query(collection(db, 'users'), where('handle', '==', id.toLowerCase()))
      );
      if (snap.empty) {
        message.error('User not found');
        return;
      }
      email = (snap.docs[0].data() as { email: string }).email;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      message.success('Password reset sent');
    } catch (e) {
      const msg = (e as FirebaseError).message || 'Failed to send reset email';
      message.error(msg);
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
                    <Form
                      form={signInForm}
                      layout="vertical"
                      onFinish={onSignIn}
                      initialValues={{ remember: true }}
                    >
                      <Form.Item name="identifier" label="Username or Email" rules={[{ required: true }]}> <Input /> </Form.Item>
                      <Form.Item name="password" label="Password" rules={[{ required: true }]}> <Input.Password /> </Form.Item>
                      <Form.Item name="remember" valuePropName="checked"> <Checkbox>Remember me</Checkbox> </Form.Item>
                      <Form.Item>
                        <Button
                          type="link"
                          onClick={() => onForgot(signInForm.getFieldValue('identifier'))}
                          style={{ padding: 0 }}
                        >
                          Forgot password?
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block>
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
                        label="Confirm password"
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
                        <Button type="primary" htmlType="submit" block>
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
    </ConfigProvider>
  );
}
