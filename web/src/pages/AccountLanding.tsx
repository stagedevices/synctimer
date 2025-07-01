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

  const passwordValidator = async (_: unknown, value: string) => {
    if (!value) return Promise.reject('Password is required');
    const re = /^(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?]).{12,}$/;
    return re.test(value)
      ? Promise.resolve()
      : Promise.reject('Min 12 chars with symbol');
  };


  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#70C73C', fontFamily: 'system-ui' } }}>
      <Row style={{ width: '100vw', minHeight: '100vh' }}>
        <Col xs={0} md={12} />
        <Col xs={24} md={12} className="landing-side">
          <Card
            className="glass-card landing-card"
            style={{
              width: '100%',
              height: '100%',
              padding: '2rem',
              borderRadius: '1.5rem',
              backdropFilter: 'blur(8px)',
              // Use shared glass token for consistency
              background: 'var(--glass-bg)',
            }}
          >

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
                    <Form
                      form={signinForm}
                      layout="vertical"
                      onFinish={handleSignIn}
                      onFinishFailed={() => message.error('Please fix the errors in the form')}
                      initialValues={{ remember: true }}
                    >
                      <Form.Item
                        name="identifier"
                        label="Username or Email"
                        rules={[{ required: true, message: 'Username or Email is required' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: 'Password is required' }]}
                      >
                        <Input.Password />
                      </Form.Item>

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
                    <Form
                      form={createForm}
                      layout="vertical"
                      onFinish={handleSignUp}
                      onFinishFailed={() => message.error('Please fix the errors in the form')}
                    >
                      <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, message: 'Email is required', type: 'email' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="handle"
                        label="Username"
                        rules={[
                          { required: true, message: 'Username is required' },
                          {
                            pattern: /^[a-z0-9_]{1,32}$/,
                            message:
                              'Handle must be lowercase alphanumeric or underscore, 1\u201332 chars',
                          },
                        ]}
                        validateTrigger="onBlur"
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="first"
                        label="First Name"
                        rules={[{ required: true, message: 'First Name is required' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="last"
                        label="Last Name"
                        rules={[{ required: true, message: 'Last Name is required' }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                          { required: true, message: 'Password is required' },
                          { validator: passwordValidator },
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>

                      <Form.Item
                        name="confirm"
                        label="Confirm Password"
                        dependencies={["password"]}
                        hasFeedback
                        rules={[
                          { required: true, message: 'Confirm Password is required' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('password') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject('Passwords do not match');
                            },
                          }),
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          loading={signupLoading}
                          disabled={
                            signupLoading ||
                            !(
                              createForm.isFieldsTouched(true) &&
                              createForm
                                .getFieldsError()
                                .every(({ errors }) => !errors.length)
                            )
                          }
                        >
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
          <Form.Item
            name="identifier"
            label="Email or Handle"
            rules={[{ required: true, message: 'Email or Handle is required' }]}
          >
            <Input />
          </Form.Item>

        </Form>
      </Modal>
    </ConfigProvider>
  );
}
