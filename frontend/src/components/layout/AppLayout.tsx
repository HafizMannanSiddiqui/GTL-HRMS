import { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const { Content } = Layout;

message.config({ top: 60, maxCount: 3 });

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(isMobile);
  const location = useLocation();

  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [location.pathname, isMobile]);

  // Auto-collapse when screen becomes mobile
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  // Listen for hamburger menu toggle from Header
  useEffect(() => {
    const handler = () => setCollapsed(prev => !prev);
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Overlay backdrop for mobile sidebar */}
      {isMobile && !collapsed && (
        <div onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} />
      )}
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: isMobile ? 0 : undefined, background: '#f5f6f8' }}>
        <Header />
        <Content style={{
          margin: isMobile ? '8px 6px' : '12px',
          padding: isMobile ? 12 : 20,
          background: '#fff',
          borderRadius: 12,
          minHeight: 'calc(100vh - 100px)',
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
