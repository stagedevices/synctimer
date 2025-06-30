import { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Checkbox,
  Switch,
  Modal,
  message,
  ConfigProvider,
} from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { signIn, signUp, sendReset } from '../lib/auth';

export function AccountLanding() {
  const navigate = useNavigate();

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.body.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate('/parse');
    });
    return unsub;
  }, [navigate]);

  interface SignInVals {
    identifier: string;
    password: string;
    remember: boolean;
  }
  interface SignUpVals {
    email: string;
    handle: string;
    first: string;
    last: string;

    password: string;
    confirm: string;
  }

  const [signinForm] = Form.useForm<SignInVals>();
  const [createForm] = Form.useForm<SignUpVals>();
  const [resetForm] = Form.useForm();
  const [signinLoading, setSigninLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async (vals: SignInVals) => {
    setSigninLoading(true);
    try {
      await signIn(vals.identifier, vals.password, vals.remember);
      message.success('Signed in');
      navigate('/parse');
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      message.error(err.code || err.message || 'Sign in failed');
    } finally {
      setSigninLoading(false);
    }
  };

  const handleSignUp = async (vals: SignUpVals) => {

    setSignupLoading(true);
    try {
      await signUp(
        vals.email.trim(),
        vals.handle.trim(),
        vals.first.trim(),
        vals.last.trim(),
        vals.password
      );

      message.success('Account created');
      navigate('/parse');
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      message.error(err.code || err.message || 'Account creation failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const id = resetForm.getFieldValue('identifier');
      if (!id) {
        message.error('Enter your email or handle');
        return;
      }
      setResetLoading(true);
      await sendReset(id);
      message.success('Password reset sent');
      setResetOpen(false);
      resetForm.resetFields();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      message.error(err.code || err.message || 'Failed to send reset');
    } finally {
      setResetLoading(false);
    }
  };

  const validateHandle = async (_: unknown, value: string) => {
    if (!value) return Promise.reject('Username is required');
    if (!/^[a-z0-9_]{1,32}$/.test(value)) {
      return Promise.reject('Use a-z, 0-9 or _ (max 32)');
    }
    return Promise.resolve();
  };

  const passwordRule = {
    required: true,

    validator(_: unknown, value: string) {
      if (!value) return Promise.reject('Password is required');
      const re = /^(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?]).{12,}$/;
      return re.test(value)
        ? Promise.resolve()
        : Promise.reject('Min 12 chars with symbol');
    },
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#70C73C', fontFamily: 'system-ui' } }}>
      <Row style={{ minHeight: '100vh' }}>
        <Col xs={0} md={12} />
        <Col xs={24} md={12} className="landing-side">
          <Card className="glass-card landing-card" style={{ maxWidth: 560, width: '100%' }}>

            <Row justify="space-between" align="middle" style={{ marginBottom: '1rem' }}>
              <h1 style={{ margin: 0 }}>SyncTimer</h1>
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={dark}
                onChange={setDark}
              />
            </Row>
            <Tabs destroyInactiveTabPane={false}

              items={[
                {
                  key: 'signin',
                  label: 'Sign In',
                  children: (
                    <Form form={signinForm} layout="vertical" onFinish={handleSignIn} initialValues={{ remember: true }}>
                      <Form.Item name="identifier" label="Username or Email" required rules={[{ required: true, message: 'Please enter username or email' }]}> <Input /> </Form.Item>
                      <Form.Item name="password" label="Password" required rules={[{ required: true, message: 'Please enter password' }]}> <Input.Password /> </Form.Item>

                      <Form.Item name="remember" valuePropName="checked"> <Checkbox>Remember me</Checkbox> </Form.Item>
                      <Form.Item>
                        <Button type="link" style={{ padding: 0 }} onClick={() => setResetOpen(true)}>
                          Forgot password?
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={signinLoading} disabled={signinLoading}>
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
                    <Form form={createForm} layout="vertical" onFinish={handleSignUp}>
                      <Form.Item name="email" label="Email" required rules={[{ required: true, type: 'email' }]}> <Input /> </Form.Item>
                      <Form.Item name="handle" label="Username" required rules={[{ validator: validateHandle }]} validateTrigger="onBlur"> <Input /> </Form.Item>
                      <Form.Item name="first" label="First Name" required rules={[{ required: true }]}> <Input /> </Form.Item>
                      <Form.Item name="last" label="Last Name" required rules={[{ required: true }]}> <Input /> </Form.Item>
                      <Form.Item name="password" label="Password" required rules={[passwordRule]}> <Input.Password /> </Form.Item>

                      <Form.Item
                        name="confirm"
                        label="Confirm Password"
                        dependencies={["password"]}
                        hasFeedback
                        required
                        rules={[{ required: true, message: 'Please confirm password' }, ({ getFieldValue }) => ({

                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        })]}
                      >
                        <Input.Password />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={signupLoading} disabled={signupLoading}>
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
        open={resetOpen}
        title="Reset Password"
        onCancel={() => setResetOpen(false)}
        onOk={handleReset}
        okText="Send Reset"
        confirmLoading={resetLoading}
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item name="identifier" label="Email or Handle" required rules={[{ required: true }]}> <Input /> </Form.Item>

        </Form>
      </Modal>
    </ConfigProvider>
  );
}
