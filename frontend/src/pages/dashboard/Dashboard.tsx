import { Card, Col, Row, Typography, Tag, Spin, Avatar, Tabs, Select, DatePicker, Tooltip as AntTooltip } from 'antd';
import {
  ClockCircleOutlined, ScheduleOutlined, CheckCircleOutlined,
  TeamOutlined, CalendarOutlined, RiseOutlined, WarningOutlined,
  FileTextOutlined, UserOutlined, HeatMapOutlined, BarChartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getTimeEntries } from '../../api/gtl';
import { getMyAttendance, getTodayDashboard, getEmployeesReport } from '../../api/attendance';
import { getLeaveBalance } from '../../api/leaves';
import { getTeams } from '../../api/teams';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const { RangePicker } = DatePicker;

/* ── 3D Gradient Stat Card (brand-themed, clickable) ── */
function StatCard({ title, value, suffix, icon, sub, onClick }: any) {
  return (
    <div className="stat-card-3d" onClick={onClick} style={{
      padding: '18px 20px',
      background: `linear-gradient(135deg, var(--brand-primary-bg), #fff)`,
      borderRadius: 14,
      border: '1px solid var(--brand-primary-bg-light, #e8e8e8)',
      borderLeft: '4px solid var(--brand-primary)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `var(--brand-primary-bg-light, rgba(0,0,0,0.03))`, opacity: 0.7 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, opacity: 0.7 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-primary)', marginTop: 4, lineHeight: 1.1 }}>
            {value}<span style={{ fontSize: 13, fontWeight: 500, color: '#8c8c8c' }}> {suffix}</span>
          </div>
          {sub && <div style={{ fontSize: 11, color: 'var(--brand-primary-light, #666)', fontWeight: 600, marginTop: 4, opacity: 0.85 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--brand-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 20, opacity: 0.85,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          {icon}
        </div>
      </div>
      {onClick && <div style={{ position: 'absolute', bottom: 6, right: 12, fontSize: 10, color: 'var(--brand-primary)', opacity: 0.5 }}>View Details &rarr;</div>}
    </div>
  );
}

/* ── Clickable section card wrapper ── */
function SectionCard({ title, icon, linkText, onLink, children, ...cardProps }: any) {
  return (
    <Card size="small" style={{ borderRadius: 12, ...cardProps.style }} {...cardProps}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)' }}>{icon}{title}</span>
        {onLink && <a onClick={onLink} style={{ fontSize: 11, color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}>{linkText || 'View Full Report'} &rarr;</a>}
      </div>
      {children}
    </Card>
  );
}

/* ── Attendance Heatmap Calendar (brand-themed) ── */
function AttendanceHeatmap({ data, from, to, label }: { data: any[]; from: string; to: string; label: string }) {
  const start = dayjs(from);
  const end = dayjs(to);
  const totalDays = end.diff(start, 'day') + 1;

  const dayMap = useMemo(() => {
    const m = new Map<string, number>();
    (data || []).forEach((r: any) => {
      const date = dayjs(r.checkinDate || r.entryDate).format('YYYY-MM-DD');
      const hours = r.durationSeconds ? Number(r.durationSeconds) / 3600 : Number(r.hours || 0);
      m.set(date, (m.get(date) || 0) + hours);
    });
    return m;
  }, [data]);

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const d = start.add(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const hours = dayMap.get(dateStr) || 0;
    const isWeekend = d.day() === 0 || d.day() === 6;
    days.push({ date: d, dateStr, hours, isWeekend });
  }

  // Brand-based color scale: absent=warm red, low=light brand, good=saturated brand
  const getColor = (hours: number, isWeekend: boolean) => {
    if (isWeekend) return '#f0f0f0';
    if (hours === 0) return '#fff1f0';             // absent - soft red
    if (hours < 4) return 'var(--brand-primary-bg, #FFF0F0)'; // light brand
    if (hours < 7) return 'var(--brand-primary-bg-light, #FFE0E3)'; // medium brand
    if (hours < 9) return '#f6ffed';               // good - soft green
    return '#d9f7be';                               // excellent - green
  };

  const getBorder = (hours: number, isWeekend: boolean) => {
    if (isWeekend) return '1px solid #e0e0e0';
    if (hours === 0) return '1px solid #ffccc7';
    if (hours < 4) return '1px solid var(--brand-primary-bg-light, #FFE0E3)';
    if (hours < 7) return '1px solid var(--brand-primary, #B32B48)40';
    if (hours < 9) return '1px solid #b7eb8f';
    return '1px solid #73d13d';
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <HeatMapOutlined />{label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {days.map(d => (
          <AntTooltip key={d.dateStr} title={`${d.date.format('ddd, DD MMM')} — ${d.hours > 0 ? `${Math.round(d.hours * 10) / 10}h` : d.isWeekend ? 'Weekend' : 'Absent'}`}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: getColor(d.hours, d.isWeekend),
              border: getBorder(d.hours, d.isWeekend),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 600,
              color: d.hours >= 7 ? '#389e0d' : d.hours > 0 ? 'var(--brand-primary)' : d.isWeekend ? '#bfbfbf' : '#ff7875',
              cursor: 'default',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {d.date.date()}
            </div>
          </AntTooltip>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: '#8c8c8c', flexWrap: 'wrap' }}>
        {[
          { bg: '#fff1f0', border: '#ffccc7', label: 'Absent' },
          { bg: 'var(--brand-primary-bg)', border: 'var(--brand-primary-bg-light)', label: '<4h' },
          { bg: 'var(--brand-primary-bg-light)', border: 'var(--brand-primary)', label: '4-7h' },
          { bg: '#f6ffed', border: '#b7eb8f', label: '7-9h' },
          { bg: '#d9f7be', border: '#73d13d', label: '9h+' },
          { bg: '#f0f0f0', border: '#e0e0e0', label: 'Weekend' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.border}` }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Team Attendance Bar (brand-themed) ── */
function TeamAttendanceBar({ employees }: { employees: any[] }) {
  if (!employees || employees.length === 0) return null;

  const sorted = [...employees].sort((a, b) => Number(b.totalHours || 0) - Number(a.totalHours || 0));
  const chartData = sorted.slice(0, 15).map(e => ({
    name: (e.displayName || e.username || '').split(' ')[0],
    hours: Math.round(Number(e.totalHours || 0) * 10) / 10,
    days: Number(e.totalDays || 0),
    fullName: e.displayName || e.username,
  }));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChartOutlined />Team Hours (Top 15)
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" axisLine={false} tickLine={false} style={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: 11 }} width={55} />
          <Tooltip content={({ active, payload }: any) => active && payload?.[0] ? (
            <div style={{ background: '#fff', border: '1px solid var(--brand-primary-bg-light, #f0f0f0)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{payload[0].payload.fullName}</div>
              <div>{payload[0].value}h total / {payload[0].payload.days} days</div>
            </div>
          ) : null} />
          <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={18} fill="var(--brand-primary, #B32B48)" opacity={0.7}>
            {chartData.map((_, i) => (
              <Cell key={i} opacity={0.4 + (i < 5 ? 0.4 : i < 10 ? 0.25 : 0.1)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Employee Table (brand-themed) ── */
function EmployeeTable({ employees, onSelect }: { employees: any[]; onSelect?: (id: number) => void }) {
  if (!employees || employees.length === 0) return <div style={{ color: '#8c8c8c', padding: 20, textAlign: 'center', fontSize: 13 }}>No data for selected range</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--brand-primary-bg)' }}>
            {['Employee', 'Days', 'Hours', 'Avg/Day', 'Att %'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Employee' ? 'left' : 'center', fontWeight: 700, color: 'var(--brand-primary)', borderBottom: '2px solid var(--brand-primary-bg-light)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((e: any, i: number) => {
            const avg = Number(e.totalDays) > 0 ? Math.round(Number(e.totalHours) / Number(e.totalDays) * 10) / 10 : 0;
            const pct = Math.min(100, Math.round((Number(e.totalDays) / 22) * 100));
            return (
              <tr key={e.id || i} onClick={() => onSelect?.(e.id)}
                style={{ borderBottom: '1px solid #f5f5f5', cursor: onSelect ? 'pointer' : 'default', transition: 'background 0.15s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--brand-primary-bg)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={24} style={{ background: 'var(--brand-primary)', fontSize: 10, flexShrink: 0 }}>{(e.displayName || e.username)?.[0]?.toUpperCase()}</Avatar>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{e.displayName || e.username}</div>
                      {e.teamName && <div style={{ fontSize: 10, color: '#8c8c8c' }}>{e.teamName}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600 }}>{e.totalDays}</td>
                <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600 }}>{Math.round(Number(e.totalHours))}h</td>
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>{avg}h</td>
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                  <Tag color={pct >= 85 ? 'green' : pct >= 70 ? 'orange' : 'red'} style={{ margin: 0, fontSize: 10 }}>{pct}%</Tag>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const now = dayjs();

  const isLead = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'].includes(r.name));
  const isAdmin = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Application Manager'].includes(r.name));

  // Date range state
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([now.startOf('month'), now]);
  const from = dateRange[0].format('YYYY-MM-DD');
  const to = dateRange[1].format('YYYY-MM-DD');

  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const [selectedEmpId, setSelectedEmpId] = useState<number | undefined>();

  // ── Queries ──
  const { data: myEntries } = useQuery({
    queryKey: ['dashEntries', user?.id, from, to],
    queryFn: () => getTimeEntries({ userId: user?.id, from, to, pageSize: 500 }),
    enabled: !!user?.id,
  });

  const { data: myAttendance } = useQuery({
    queryKey: ['dashAtt', from, to],
    queryFn: () => getMyAttendance(from, to),
  });

  const { data: balance } = useQuery({
    queryKey: ['dashBal', user?.id],
    queryFn: () => getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const { data: todayDash, isLoading: ld } = useQuery({
    queryKey: ['todayDash'],
    queryFn: getTodayDashboard,
    refetchInterval: 60000,
  });

  // Team employees report (for lead/admin)
  const { data: teamReport, isLoading: loadingTeam } = useQuery({
    queryKey: ['dashTeamReport', from, to, selectedTeamId, isAdmin ? 'all' : user?.id],
    queryFn: () => getEmployeesReport(from, to, selectedTeamId, isAdmin ? undefined : user?.id),
    enabled: !!isLead,
  });

  // Selected employee GTL drill-down
  const { data: empEntries } = useQuery({
    queryKey: ['dashEmpGtl', selectedEmpId, from, to],
    queryFn: () => getTimeEntries({ userId: selectedEmpId, from, to, pageSize: 500 }),
    enabled: !!selectedEmpId,
  });

  const teamName = (teams || []).find((t: any) => t.id === user?.teamId)?.teamName || '';
  const myTotalHours = (myEntries?.items || []).reduce((s: number, e: any) => s + Number(e.hours), 0);

  // Attendance stats
  const attDays = (myAttendance || []).filter((a: any) => a.durationSeconds && Number(a.durationSeconds) > 0);
  const totalWorkSecs = attDays.reduce((s: number, a: any) => s + Math.min(Number(a.durationSeconds), 43200), 0);
  const totalWorkH = Math.round(totalWorkSecs / 3600 * 10) / 10;
  const avgH = attDays.length > 0 ? Math.round(totalWorkSecs / attDays.length / 3600 * 10) / 10 : 0;
  const daysPresent = (myAttendance || []).length;

  const workDays = (() => {
    let c = 0;
    let d = dateRange[0];
    while (d.isBefore(dateRange[1]) || d.isSame(dateRange[1], 'day')) {
      if (d.day() !== 0 && d.day() !== 6) c++;
      d = d.add(1, 'day');
    }
    return c;
  })();
  const attPct = workDays > 0 ? Math.round((daysPresent / workDays) * 100) : 0;

  const todayAtt = (myAttendance || []).find((a: any) => dayjs(a.checkinDate).format('YYYY-MM-DD') === now.format('YYYY-MM-DD'));

  const filterUsers = (users: any[]) => {
    if (!isLead && user?.teamId) return users.filter((u: any) => u.teamId === user.teamId);
    return users;
  };

  // Team-wide stats
  const teamStats = useMemo(() => {
    if (!teamReport || teamReport.length === 0) return null;
    const totalEmp = teamReport.length;
    const totalH = teamReport.reduce((s: number, e: any) => s + Number(e.totalHours || 0), 0);
    const totalD = teamReport.reduce((s: number, e: any) => s + Number(e.totalDays || 0), 0);
    const avgHPerEmp = totalEmp > 0 ? Math.round(totalH / totalEmp * 10) / 10 : 0;
    const avgPct = totalEmp > 0 ? Math.round((totalD / (totalEmp * workDays)) * 100) : 0;
    return { totalEmp, totalH: Math.round(totalH), totalD, avgHPerEmp, avgPct: Math.min(100, avgPct) };
  }, [teamReport, workDays]);

  // Weekly chart data
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekStart = now.startOf('week').add(1, 'day');
  const weeklyData = weekDays.map((name, i) => {
    const date = weekStart.add(i, 'day').format('YYYY-MM-DD');
    const att = (myAttendance || []).find((a: any) => dayjs(a.checkinDate).format('YYYY-MM-DD') === date);
    const hours = att?.durationSeconds ? Math.round(Number(att.durationSeconds) / 3600 * 10) / 10 : 0;
    return { name, hours };
  });

  const pieData = [
    { name: 'Present', value: daysPresent, color: '#52c41a' },
    { name: 'Absent', value: Math.max(0, workDays - daysPresent), color: '#ff4d4f' },
  ];

  const greeting = now.hour() < 12 ? 'Good Morning' : now.hour() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ═══ Header + Date Range ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0, fontSize: 22 }}>
            {greeting}, {user?.displayName?.split(' ')[0] || user?.username}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{now.format('dddd, MMMM D, YYYY')}</Typography.Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <RangePicker
            value={dateRange}
            onChange={(vals: any) => vals && setDateRange(vals)}
            format="DD MMM YYYY"
            size="middle"
            style={{ borderRadius: 8 }}
            presets={[
              { label: 'This Week', value: [now.startOf('week').add(1, 'day'), now] },
              { label: 'This Month', value: [now.startOf('month'), now] },
              { label: 'Last Month', value: [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')] },
              { label: 'Last 3 Months', value: [now.subtract(3, 'month').startOf('month'), now] },
            ]}
          />
          {isAdmin && (
            <Select placeholder="All Teams" allowClear value={selectedTeamId} onChange={setSelectedTeamId}
              style={{ width: 180 }}
              options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))}
            />
          )}

          {/* Today status — brand themed */}
          <div style={{
            padding: '6px 14px', borderRadius: 8,
            background: todayAtt ? '#f6ffed' : 'var(--brand-primary-bg)',
            border: `1px solid ${todayAtt ? '#b7eb8f' : 'var(--brand-primary-bg-light, #e8e8e8)'}`,
          }}>
            {todayAtt ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>In at {todayAtt.checkinTime?.slice(0, 5)}</div>
                  <div style={{ fontSize: 10, color: '#8c8c8c' }}>{todayAtt.checkoutTime ? `Out: ${todayAtt.checkoutTime.slice(0, 5)}` : 'Working'}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <WarningOutlined style={{ color: 'var(--brand-accent, #e74c3c)', fontSize: 13 }} />
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--brand-accent, #e74c3c)' }}>Not checked in</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ My Stat Cards (brand-themed 3D) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard title="Days Present" value={daysPresent} suffix={`/ ${workDays}`} icon={<CheckCircleOutlined />} sub={`${attPct}% attendance`} intensity={1} onClick={() => navigate('/my/attendance')} />
        <StatCard title="Work Hours" value={totalWorkH} suffix="hrs" icon={<ClockCircleOutlined />} sub={`Avg ${avgH}h/day`} intensity={2} onClick={() => navigate('/my/attendance')} />
        <StatCard title="GTL Logged" value={Math.round(myTotalHours)} suffix="hrs" icon={<FileTextOutlined />} sub={`${(myEntries?.items || []).length} entries`} intensity={3} onClick={() => navigate('/my/timesheet')} />
        <StatCard title="Leaves" value={balance?.remaining ?? 20} suffix={`/ ${balance?.allowed ?? 20}`} icon={<ScheduleOutlined />} sub={`${balance?.used || 0} used`} intensity={4} onClick={() => navigate('/my/leaves')} />
      </div>

      {/* ═══ Charts Row ═══ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <SectionCard title="This Week's Hours" icon={<ClockCircleOutlined style={{ marginRight: 6 }} />}
            linkText="Time Sheet" onLink={() => navigate('/my/timesheet')} style={{ height: '100%' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barSize={32}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11 }} domain={[0, 12]} />
                <Tooltip formatter={(v: any) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell key={i} fill={entry.hours >= 8 ? '#52c41a' : entry.hours > 0 ? 'var(--brand-accent, #fa8c16)' : '#f0f0f0'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </Col>

        <Col xs={24} lg={10}>
          <SectionCard title="Attendance Overview" icon={<CalendarOutlined style={{ marginRight: 6 }} />}
            linkText="My Attendance" onLink={() => navigate('/my/attendance')} style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} dataKey="value" stroke="none">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.75} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand-primary)' }}>{attPct}%</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>{daysPresent} of {workDays} days</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  <div><span style={{ color: '#52c41a', fontWeight: 700, fontSize: 16 }}>{daysPresent}</span> <span style={{ fontSize: 10, color: '#8c8c8c' }}>Present</span></div>
                  <div><span style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 16 }}>{Math.max(0, workDays - daysPresent)}</span> <span style={{ fontSize: 10, color: '#8c8c8c' }}>Absent</span></div>
                </div>
              </div>
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ═══ My Heatmaps ═══ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <SectionCard title="My Attendance Heatmap" icon={<HeatMapOutlined style={{ marginRight: 6 }} />}
            linkText="My Attendance" onLink={() => navigate('/my/attendance')}>
            <AttendanceHeatmap data={myAttendance || []} from={from} to={to} label="" />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="My GTL Heatmap" icon={<HeatMapOutlined style={{ marginRight: 6 }} />}
            linkText="Time Sheet" onLink={() => navigate('/my/timesheet')}>
            <AttendanceHeatmap data={(myEntries?.items || [])} from={from} to={to} label="" />
          </SectionCard>
        </Col>
      </Row>

      {/* ═══ TEAM SECTION (Lead/Admin only) ═══ */}
      {isLead && (
        <>
          <div style={{ borderTop: '2px solid var(--brand-primary-bg)', paddingTop: 16, marginBottom: 16 }}>
            <Typography.Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary)' }}>
              <TeamOutlined />
              {isAdmin ? 'Organization Overview' : 'My Team Overview'}
            </Typography.Title>
          </div>

          {teamStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
              <StatCard title="Team Size" value={teamStats.totalEmp} suffix="members" icon={<TeamOutlined />} intensity={1} onClick={() => navigate('/admin/employees-report')} />
              <StatCard title="Team Hours" value={teamStats.totalH} suffix="hrs" icon={<ClockCircleOutlined />} intensity={2} onClick={() => navigate('/admin/reports/team')} />
              <StatCard title="Avg Hours/Person" value={teamStats.avgHPerEmp} suffix="hrs" icon={<RiseOutlined />} intensity={3} onClick={() => navigate('/admin/reports/general')} />
              <StatCard title="Team Attendance" value={teamStats.avgPct} suffix="%" icon={<FireOutlined />} intensity={4} onClick={() => navigate('/admin/employees-report')} />
            </div>
          )}

          {loadingTeam ? <Spin style={{ display: 'block', margin: '30px auto' }} /> : (
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} lg={12}>
                <SectionCard title="Team Hours (Top 15)" icon={<BarChartOutlined style={{ marginRight: 6 }} />}
                  linkText="Team Report" onLink={() => navigate('/admin/reports/team')}>
                  <TeamAttendanceBar employees={teamReport || []} />
                </SectionCard>
              </Col>
              <Col xs={24} lg={12}>
                <SectionCard title="Employee Breakdown" icon={<UserOutlined style={{ marginRight: 6 }} />}
                  linkText="Employees Report" onLink={() => navigate('/admin/employees-report')}
                  style={{ maxHeight: 450, overflowY: 'auto' }}>
                  <EmployeeTable employees={teamReport || []} onSelect={setSelectedEmpId} />
                </SectionCard>
              </Col>
            </Row>
          )}

          {selectedEmpId && empEntries && (
            <Card size="small" style={{ borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Typography.Text strong style={{ fontSize: 14, color: 'var(--brand-primary)' }}>
                  <UserOutlined style={{ marginRight: 6 }} />
                  {(teamReport || []).find((e: any) => e.id === selectedEmpId)?.displayName || 'Employee'} — GTL Heatmap
                </Typography.Text>
                <a onClick={() => setSelectedEmpId(undefined)} style={{ fontSize: 12, color: 'var(--brand-primary)' }}>Close</a>
              </div>
              <AttendanceHeatmap data={empEntries?.items || []} from={from} to={to} label="GTL Activity" />
            </Card>
          )}
        </>
      )}

      {/* ═══ Team Attendance Today ═══ */}
      <SectionCard title={`Team Attendance — Today (${now.format('ddd, MMM D')})`} icon={<TeamOutlined style={{ marginRight: 6 }} />}
        linkText="Daily Report" onLink={() => navigate('/admin/attendance/daily')} style={{ marginBottom: 20 }}>

        {ld ? <Spin /> : todayDash ? (
          <Tabs size="small" items={[
            {
              key: 'in',
              label: <span style={{ color: '#52c41a', fontSize: 12 }}>In <Tag color="green">{filterUsers(todayDash.available.users).length}</Tag></span>,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {filterUsers(todayDash.available.users).slice(0, 20).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#f6ffed', border: '1px solid #d9f7be' }}>
                      <Avatar size={26} style={{ background: '#52c41a', fontSize: 10, flexShrink: 0 }}>{(u.displayName || u.username)?.[0]?.toUpperCase()}</Avatar>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 500 }}>{u.displayName || u.username}</div>
                      <Tag color="green" style={{ fontSize: 9, margin: 0 }}>{u.checkinTime}</Tag>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'out',
              label: <span style={{ color: '#ff4d4f', fontSize: 12 }}>Out <Tag color="red">{filterUsers(todayDash.notAvailable.users).length}</Tag></span>,
              children: <div style={{ fontSize: 13, color: '#8c8c8c', padding: 16 }}>{filterUsers(todayDash.notAvailable.users).length} team members not checked in today</div>,
            },
            {
              key: 'pending',
              label: <span style={{ color: 'var(--brand-accent, #fa8c16)', fontSize: 12 }}>Pending <Tag color="orange">{filterUsers(todayDash.pendingCheckout.users).length}</Tag></span>,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {filterUsers(todayDash.pendingCheckout.users).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--brand-primary-bg)', border: '1px solid var(--brand-primary-bg-light, #ffe58f)' }}>
                      <Avatar size={26} style={{ background: 'var(--brand-accent, #fa8c16)', fontSize: 10, flexShrink: 0 }}>{(u.displayName || u.username)?.[0]?.toUpperCase()}</Avatar>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 500 }}>{u.displayName || u.username}</div>
                      <Tag color="orange" style={{ fontSize: 9, margin: 0 }}>{u.checkinTime}</Tag>
                    </div>
                  ))}
                </div>
              ),
            },
          ]} />
        ) : null}
      </SectionCard>

      {/* ═══ Bottom Row: Profile + Quick Actions ═══ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
            <Avatar size={56} style={{ background: 'var(--brand-primary)', fontSize: 24, fontWeight: 700, marginBottom: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {user?.displayName?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.displayName}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>@{user?.username}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, textAlign: 'left' }}>
              {[
                ['Email', user?.email],
                ['Team', teamName],
                ['Role', user?.roles?.map((r: any) => r.name).join(', ')],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ color: '#8c8c8c' }}>{l}</span>
                  <span style={{ fontWeight: 500, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card size="small" style={{ borderRadius: 12 }}
            title={<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)' }}><RiseOutlined style={{ marginRight: 6 }} />Quick Actions</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {[
                { title: 'Log Time Entry', desc: 'Record your work', icon: <ClockCircleOutlined />, path: '/my/data-entry' },
                { title: 'My Time Sheet', desc: 'View logged hours', icon: <FileTextOutlined />, path: '/my/timesheet' },
                { title: 'Apply for Leave', desc: `${balance?.remaining || 0} remaining`, icon: <ScheduleOutlined />, path: '/my/leaves' },
                { title: 'My Attendance', desc: 'Monthly records', icon: <CalendarOutlined />, path: '/my/attendance' },
                { title: 'My Profile', desc: 'View & edit info', icon: <UserOutlined />, path: '/my/profile' },
                ...(isLead ? [{ title: 'Team Dashboard', desc: 'Manage your team', icon: <TeamOutlined />, path: '/admin/lead-insights' }] : []),
              ].map(item => (
                <div key={item.title} onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'var(--brand-primary-bg)',
                    border: '1px solid var(--brand-primary-bg-light, #e8e8e8)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, opacity: 0.85 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
