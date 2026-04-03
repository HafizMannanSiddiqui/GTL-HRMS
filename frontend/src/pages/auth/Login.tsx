import { Button, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import type { LoginRequest } from '../../types';

interface Company { name: string; color: string; gradient: string; logo: string; icon: string; }

const companyList: Company[] = [
  { name: 'AngularSpring', color: '#B32B48', gradient: 'linear-gradient(135deg, #B32B48, #8B1A30, #1a1a2e)', logo: '/logos/angularspring.png', icon: '/logos/as-icon.png' },
  { name: 'PowerSoft19', color: '#FC9C10', gradient: 'linear-gradient(135deg, #FC9C10, #E07A00, #1a1a2e)', logo: '/logos/powersoft19.png', icon: '/logos/ps-icon.png' },
  { name: 'VentureTronics', color: '#fc3b27', gradient: 'linear-gradient(135deg, #fc3b27, #c0291a, #1a1a2e)', logo: '/logos/venturetronics.png', icon: '/logos/vt-icon.png' },
  { name: 'RayThorne', color: '#2b3750', gradient: 'linear-gradient(135deg, #2b3750, #1e2a3d, #0d1117)', logo: '/logos/raythorne.png', icon: '/logos/rt-icon.png' },
];

const domainMap: Record<string, number> = { angularspring: 0, powersoft19: 1, powersoft: 1, venturetronics: 2, raythorne: 3 };

export default function Login() {
  const { login } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Auto-rotate companies every 4 seconds when user hasn't typed
  const [autoRotate, setAutoRotate] = useState(true);
  useEffect(() => {
    if (!autoRotate) return;
    const t = setInterval(() => setActive((p) => (p + 1) % companyList.length), 4000);
    return () => clearInterval(t);
  }, [autoRotate]);

  const c = companyList[active];

  const onUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toLowerCase();
    for (const [domain, idx] of Object.entries(domainMap)) {
      if (v.includes(domain)) { setActive(idx); setAutoRotate(false); return; }
    }
  };

  const onFinish = async (values: LoginRequest) => {
    setLoading(true);
    try {
      let username = values.username;
      if (username.includes('@')) username = username.split('@')[0];
      await login({ username, password: values.password });
      message.success('Welcome back!');
    } catch {
      message.error('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const h = time.getHours();
  const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', margin: 0, padding: 0, overflow: 'hidden' }}>

      {/* ====== LEFT — Gradient Branding ====== */}
      <div className="login-brand-panel" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        background: c.gradient, transition: 'background 0.8s ease', position: 'relative', overflow: 'hidden',
        padding: 40, minHeight: '100vh', minWidth: 300,
      }}>
        {/* Decorative shapes */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -120, right: -80, width: 450, height: 450, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', top: '40%', left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff' }}>
          {/* White logo */}
          <img src={c.logo} alt={c.name} style={{
            height: 70, objectFit: 'contain', marginBottom: 40,
            filter: 'brightness(0) invert(1)', transition: 'all 0.5s ease',
          }} />

          <h1 style={{ fontSize: 42, fontWeight: 300, margin: 0, letterSpacing: 1, lineHeight: 1.2 }}>{greeting}</h1>
          <p style={{ fontSize: 15, opacity: 0.6, marginTop: 8, marginBottom: 48 }}>
            Time Logger & HR Management System
          </p>

          {/* Clock — hidden on mobile via class */}
          <div className="login-clock" style={{ fontSize: 56, fontWeight: 200, fontFamily: "'Courier New', monospace", opacity: 0.8, letterSpacing: 4 }}>
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
          <div className="login-clock" style={{ fontSize: 13, opacity: 0.4, marginTop: 8 }}>
            {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* Company selector dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 48 }}>
            {companyList.map((comp, i) => (
              <div key={comp.name} onClick={() => { setActive(i); setAutoRotate(false); }}
                style={{
                  width: 44, height: 44, borderRadius: 12, cursor: 'pointer',
                  background: active === i ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  border: active === i ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  transform: active === i ? 'scale(1.1)' : 'scale(1)',
                }}>
                <img src={comp.icon} alt={comp.name} style={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: active === i ? 1 : 0.5 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== RIGHT — Login Form ====== */}
      <div className="login-form-panel" style={{
        width: 460, minWidth: 320, minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', background: '#fff', padding: '0 56px',
      }}>
        {/* Colored logo */}
        <div style={{ marginBottom: 36 }}>
          <img src={c.logo} alt={c.name} style={{ height: 44, objectFit: 'contain', transition: 'all 0.4s ease' }} />
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>Welcome Back</h2>
        <p style={{ color: '#999', marginBottom: 32, fontSize: 14 }}>Sign in to continue to your dashboard</p>

        <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false}>
          <Form.Item name="username" label={<span style={{ fontWeight: 500, fontSize: 13, color: '#555' }}>USERNAME OR EMAIL</span>}
            rules={[{ required: true, message: 'Required' }]}>
            <Input prefix={<UserOutlined style={{ color: '#ccc' }} />}
              placeholder="e.g. abdul.mannan@angularspring.com"
              autoComplete="username" onChange={onUsernameChange}
              style={{ height: 48, borderRadius: 10, fontSize: 14 }} />
          </Form.Item>
          <Form.Item name="password" label={<span style={{ fontWeight: 500, fontSize: 13, color: '#555' }}>PASSWORD</span>}
            rules={[{ required: true, message: 'Required' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#ccc' }} />}
              placeholder="Enter your password" autoComplete="current-password"
              style={{ height: 48, borderRadius: 10, fontSize: 14 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}
            style={{
              height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15, marginTop: 8,
              background: c.color, borderColor: c.color, transition: 'all 0.3s ease',
              boxShadow: `0 6px 16px ${c.color}33`,
            }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/forgot-password" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Forgot Password?</a>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24, color: '#ccc', fontSize: 11 }}>
          GTL & HRMS v1.0
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .login-brand-panel { min-height: auto !important; padding: 20px !important; flex: none !important; }
          .login-brand-panel h1 { font-size: 24px !important; }
          .login-form-panel { width: 100% !important; padding: 24px 28px !important; min-height: auto !important; flex: 1 !important; }
        }
        @media (max-width: 768px) {
          .login-brand-panel {
            position: fixed !important; inset: 0 !important; min-height: 100vh !important;
            min-width: 100% !important; z-index: 0 !important; padding: 0 !important;
          }
          .login-brand-panel > div { display: none !important; }
          .login-clock { display: none !important; }
          .login-form-panel {
            position: relative !important; z-index: 1 !important;
            width: 100% !important; min-height: 100vh !important;
            padding: 24px !important;
            background: rgba(255,255,255,0.92) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            display: flex !important; flex-direction: column !important; justify-content: center !important;
          }
          .login-form-panel > div:first-child {
            text-align: center !important; margin-bottom: 24px !important;
          }
          .login-form-panel > div:first-child img { height: 50px !important; }
          .login-form-panel h2 { text-align: center !important; }
          .login-form-panel > p { text-align: center !important; }
        }
      `}</style>
    </div>
  );
}
