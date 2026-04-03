import { useQuery } from '@tanstack/react-query';
import { Tag, DatePicker, Select, Spin, Avatar } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { getDailyReport } from '../../api/attendance';
import { getTeams } from '../../api/teams';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyReport() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [teamId, setTeamId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['dailyReport', date, teamId],
    queryFn: () => getDailyReport(date, teamId),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const brandColor = useMemo(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#154360', []);

  const records = data || [];
  const present = records.filter((r: any) => r.checkinTime);
  const withCheckout = present.filter((r: any) => r.checkoutTime);
  const pendingCheckout = present.filter((r: any) => !r.checkoutTime);

  const pieData = [
    { name: 'Checked In', value: withCheckout.length, color: '#52c41a' },
    { name: 'Pending C/O', value: pendingCheckout.length, color: '#fa8c16' },
  ];

  const timeBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    present.forEach((r: any) => {
      if (r.checkinTime) {
        const hour = String(r.checkinTime).slice(0, 2);
        buckets[`${hour}:00`] = (buckets[`${hour}:00`] || 0) + 1;
      }
    });
    return Object.entries(buckets).map(([time, count]) => ({ time, count })).sort((a, b) => a.time.localeCompare(b.time));
  }, [present]);

  const overtimeCount = records.filter((r: any) => r.durationMinutes && Number(r.durationMinutes) > 720).length;

  const statCards = [
    { label: 'Total Records', value: records.length, icon: <TeamOutlined /> },
    { label: 'Checked In', value: present.length, icon: <CheckCircleOutlined /> },
    { label: 'With Checkout', value: withCheckout.length, icon: <ClockCircleOutlined /> },
    { label: 'Pending C/O', value: pendingCheckout.length, icon: <WarningOutlined /> },
    ...(overtimeCount > 0 ? [{ label: '12h+ Overtime', value: overtimeCount, icon: <WarningOutlined /> }] : []),
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Daily Attendance Report</div>
        <div className="page-filters">
          <DatePicker defaultValue={dayjs(date)} onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))} format="DD MMM YYYY" />
          <Select placeholder="All Teams" allowClear style={{ width: 200 }} onChange={setTeamId}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
        </div>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            {statCards.map(s => (
              <div key={s.label} className="stat-card-3d" style={{
                flex: '1 1 140px', padding: '14px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, var(--brand-primary-bg), #fff)',
                border: '1px solid var(--brand-primary-bg-light, #e8e8e8)',
                borderLeft: '3px solid var(--brand-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>{s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          {present.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px', padding: 16, borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>Attendance Breakdown</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.8} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                        <span style={{ fontSize: 12 }}>{d.name}: <strong>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ flex: '2 1 400px', padding: 16, borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>Check-in Time Distribution</div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={timeBuckets} barSize={24}>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} style={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [`${v} people`, 'Count']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={brandColor} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, var(--brand-primary-bg, #EBF5FB), var(--brand-primary-bg-light, #d4eaf7))', color: 'var(--brand-primary, #154360)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>#</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Check In</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Check Out</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>State</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No attendance records for this date</td></tr>
                ) : records.map((r: any, i: number) => {
                  let duration = '-';
                  let durationMins = 0;
                  if (r.durationMinutes != null) {
                    durationMins = Number(r.durationMinutes);
                    duration = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
                  } else if (r.checkinTime && r.checkoutTime) {
                    const ciDate = r.checkinDate || '2000-01-01';
                    const coDate = r.checkoutDate || r.checkinDate || '2000-01-01';
                    const ci = dayjs(`${ciDate} ${r.checkinTime}`);
                    const co = dayjs(`${coDate} ${r.checkoutTime}`);
                    durationMins = co.diff(ci, 'minute');
                    if (durationMins < 0) durationMins += 1440;
                    duration = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
                  }
                  const isOvertime = durationMins > 720; // > 12 hours
                  const isNextDay = r.checkoutDate && r.checkinDate && r.checkoutDate !== r.checkinDate;
                  return (
                    <tr key={r.id || i} style={{
                      borderBottom: '1px solid #f0f0f0',
                      background: isOvertime ? '#fff7e6' : undefined,
                    }}>
                      <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar size={24} style={{ background: r.checkinTime ? '#52c41a' : '#bfbfbf', fontSize: 10, flexShrink: 0 }}>
                            {(r.user?.displayName || r.user?.username)?.[0]?.toUpperCase()}
                          </Avatar>
                          <span style={{ fontWeight: 600 }}>{r.user?.displayName || r.user?.username}</span>
                          {isOvertime && <Tag color="volcano" style={{ margin: 0, fontSize: 10 }}>12h+</Tag>}
                        </div>
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                        {r.checkinTime ? <Tag color="green" style={{ margin: 0 }}>{String(r.checkinTime).slice(0, 5)}</Tag> : '-'}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                        {r.checkoutTime ? (
                          <span>
                            <Tag style={{ margin: 0 }}>{String(r.checkoutTime).slice(0, 5)}</Tag>
                            {isNextDay && <span style={{ fontSize: 10, color: '#fa8c16', marginLeft: 4 }}>+1d</span>}
                          </span>
                        ) : (
                          r.checkinTime ? <Tag color="orange" icon={<ClockCircleOutlined />} style={{ margin: 0 }}>Pending</Tag> : '-'
                        )}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                        <Tag style={{ margin: 0 }}>{r.checkinState || '-'}</Tag>
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center', fontWeight: 600, color: isOvertime ? '#d4380d' : undefined }}>
                        {duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>{records.length} records</div>
        </>
      )}
    </div>
  );
}
