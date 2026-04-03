import {
  DashboardOutlined, FileTextOutlined, IdcardOutlined,
  ScheduleOutlined, SettingOutlined, TeamOutlined, CheckCircleOutlined,
  CalendarOutlined, UserOutlined, ProjectOutlined, BarChartOutlined,
  AppstoreOutlined, FundProjectionScreenOutlined,
  ApartmentOutlined, HeatMapOutlined, PieChartOutlined, ProfileOutlined,
  EditOutlined, HeartOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { detectCompany } from './Header';

const { Sider } = Layout;

// Leads: approve timesheets, leaves, att requests, manage their team
const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'];
// Admins: system config, reports across all teams, user management
const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

interface Props { collapsed: boolean; onCollapse: (c: boolean) => void; }

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const navigate = useNavigate();
  const loc = useLocation();
  const user = useAuthStore((s) => s.user);

  const isLead = user?.roles?.some((r: any) => LEAD_ROLES.includes(r.name));
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  const items: MenuProps['items'] = [
    // ── EVERYONE ──
    { key: '/', icon: <DashboardOutlined />, label: 'Home' },
    { key: '/my/timesheet', icon: <FileTextOutlined />, label: 'Time Sheet' },
    { key: '/my/data-entry', icon: <EditOutlined />, label: 'Data Entry' },

    { type: 'divider' as const },
    {
      key: 'hrms', icon: <CalendarOutlined />, label: 'HRMS',
      children: [
        { key: '/my/profile', icon: <ProfileOutlined />, label: 'Personal' },
        { key: '/my/attendance', icon: <CalendarOutlined />, label: 'My Attendance' },
        { key: '/my/leaves', icon: <ScheduleOutlined />, label: 'Leaves' },
        { key: '/my/wfh', icon: <CalendarOutlined />, label: 'Work From Home' },
        { key: '/my/attendance-requests', icon: <CheckCircleOutlined />, label: 'Att. Requests' },
        { key: '/my/weekend-assignments', icon: <CalendarOutlined />, label: 'Weekend' },
        { key: '/my/holidays', icon: <CalendarOutlined />, label: 'Holidays' },
        { key: '/my/team', icon: <TeamOutlined />, label: 'My Team' },
        { key: '/my/directory', icon: <UserOutlined />, label: 'Directory' },
      ],
    },

    // ── LEAD SECTION (leads who are NOT admin) ──
    // Leads manage their reportees: approvals, insights, leaves, att requests
    ...(isLead && !isAdmin ? [
      { type: 'divider' as const },
      {
        key: 'team-mgmt', icon: <TeamOutlined />, label: 'My Team',
        children: [
          { key: '/admin/approvals', icon: <CheckCircleOutlined />, label: 'Approvals' },
          { key: '/admin/lead-insights', icon: <BarChartOutlined />, label: 'Dashboard' },
          { key: '/admin/leaves/pending', icon: <ScheduleOutlined />, label: 'Leave Approvals' },
          { key: '/admin/attendance-requests', icon: <CheckCircleOutlined />, label: 'Att. Requests' },
          { key: '/admin/employee-management', icon: <UserOutlined />, label: 'Employee Mgmt' },
        ],
      },
    ] : []),

    // ── ADMIN SECTION ──
    // Admins are also leads — they get team management + system tools
    ...(isAdmin ? [
      { type: 'divider' as const },
      {
        key: 'admin-team', icon: <CheckCircleOutlined />, label: 'Team Management',
        children: [
          { key: '/admin/approvals', icon: <CheckCircleOutlined />, label: 'Approvals' },
          { key: '/admin/lead-insights', icon: <BarChartOutlined />, label: 'Lead Insights' },
          { key: '/admin/leaves/pending', icon: <ScheduleOutlined />, label: 'Leave Approvals' },
          { key: '/admin/attendance-requests', icon: <CheckCircleOutlined />, label: 'Att. Requests' },
          { key: '/admin/employee-management', icon: <UserOutlined />, label: 'Employee Mgmt' },
          { key: '/admin/team-change-requests', icon: <CheckCircleOutlined />, label: 'Team Requests' },
        ],
      },
      {
        key: 'admin-reports', icon: <BarChartOutlined />, label: 'Reports',
        children: [
          { key: '/admin/reports/team', icon: <TeamOutlined />, label: 'Team Report' },
          { key: '/admin/reports/general', icon: <PieChartOutlined />, label: 'General Report' },
          { key: '/admin/employees-report', icon: <BarChartOutlined />, label: 'Employees' },
          { key: '/admin/attendance/daily', icon: <CalendarOutlined />, label: 'Daily Attendance' },
          { key: '/admin/resource/resource-wise', icon: <UserOutlined />, label: 'Resource Wise' },
          { key: '/admin/resource/project-wise', icon: <FundProjectionScreenOutlined />, label: 'Project Wise' },
        ],
      },
      {
        key: 'admin-system', icon: <SettingOutlined />, label: 'System',
        children: [
          { key: '/admin/timesheet', icon: <FileTextOutlined />, label: 'All Timesheets' },
          { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
          { key: '/admin/ghost-employees', icon: <UserOutlined />, label: 'Ghost Employees' },
          { key: '/admin/cv-generator', icon: <ProfileOutlined />, label: 'CV Generator' },
          { key: '/my/blood-groups', icon: <HeartOutlined />, label: 'Blood Groups' },
          { key: '/admin/org-chart', icon: <ApartmentOutlined />, label: 'Org Chart' },
          { key: '/admin/devices', icon: <SettingOutlined />, label: 'ZKTeco Devices' },
          { key: '/admin/teams', icon: <TeamOutlined />, label: 'Teams' },
          { key: '/admin/programs', icon: <AppstoreOutlined />, label: 'Programs' },
          { key: '/admin/projects', icon: <ProjectOutlined />, label: 'Projects' },
          { key: '/admin/subprojects', icon: <ApartmentOutlined />, label: 'Sub Projects' },
        ],
      },
    ] : []),

    // Help — everyone
    { type: 'divider' as const },
    { key: '/my/help', icon: <QuestionCircleOutlined />, label: 'Help & Guide' },
  ];

  const path = loc.pathname;
  const openKeys = path.startsWith('/my/') ? ['hrms']
    : path.startsWith('/admin/approvals') || path.startsWith('/admin/lead') || path.startsWith('/admin/leaves') || path.startsWith('/admin/attendance') || path.startsWith('/admin/employee') || path.startsWith('/admin/team-change') ? (isAdmin ? ['admin-team'] : ['team-mgmt'])
    : path.startsWith('/admin/reports') || path.startsWith('/admin/employees-report') || path.startsWith('/admin/resource') ? ['admin-reports']
    : path.startsWith('/admin/') ? ['admin-system']
    : [];

  // Company logo
  const iconMap: Record<string, string> = {
    Powersoft19: '/logos/ps-icon.png',
    Venturetronics: '/logos/vt-icon.png',
    Raythorne: '/logos/rt-icon.png',
    AngularSpring: '/logos/as-icon.png',
  };
  const company = detectCompany(user?.payrollCompany, user?.email);
  const logoSrc = company ? iconMap[company.key] : null;

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={250}
      collapsedWidth={window.innerWidth < 768 ? 0 : 80}
      breakpoint="lg"
      style={{
        overflow: 'auto', height: '100vh',
        position: window.innerWidth < 768 ? 'fixed' : 'sticky',
        top: 0, left: 0, zIndex: 100,
        background: 'var(--brand-sidebar, #001529)',
      }}>
      <div style={{ height: 60, margin: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {logoSrc ? (
          <img src={logoSrc} alt="Logo"
            style={{ maxHeight: collapsed ? 36 : 44, maxWidth: collapsed ? 36 : 180, objectFit: 'contain' }} />
        ) : !collapsed ? (
          <img src="/logos/gtl-logo.png" alt="Logo" style={{ maxHeight: 40, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <img src="/logos/gtl-logo.png" alt="Logo" style={{ maxHeight: 32, objectFit: 'contain' }}
            onError={(e) => {
              const el = (e.target as HTMLImageElement);
              el.style.display = 'none';
              el.parentElement!.innerHTML = '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#154360,#1a5276);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px">UP</div>';
            }} />
        )}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[loc.pathname]} defaultOpenKeys={openKeys}
        items={items} onClick={({ key }) => navigate(key)} style={{ borderRight: 0 }} />
    </Sider>
  );
}
