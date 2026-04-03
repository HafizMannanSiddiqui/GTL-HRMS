import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, Tag } from 'antd';
import { DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getEmployeesReport } from '../../api/attendance';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;
const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

export default function EmployeesReport() {
  const now = dayjs();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamIds, setTeamIds] = useState<number[]>([]);

  // Auto-load: fetch all data, filter client-side by teams
  const { data: allData, isLoading } = useQuery({
    queryKey: ['empReport', range, isAdmin ? 'admin' : user?.id],
    queryFn: () => getEmployeesReport(range[0], range[1], undefined, isAdmin ? undefined : user?.id),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  // Client-side multi-team filter
  const data = useMemo(() => {
    if (!allData) return [];
    if (teamIds.length === 0) return allData;
    const teamNameSet = new Set(
      (teams || []).filter((t: any) => teamIds.includes(t.id)).map((t: any) => t.teamName)
    );
    return allData.filter((r: any) => teamNameSet.has(r.teamName));
  }, [allData, teamIds, teams]);

  const brandColor = useMemo(() => {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#154360'; }
    catch { return '#154360'; }
  }, []);

  const stats = useMemo(() => {
    if (!data?.length) return [];
    const activeRows = data.filter((r: any) => r.totalDays > 0);
    const totalEmployees = activeRows.length;
    const totalHours = activeRows.reduce((sum: number, r: any) => sum + Number(r.totalHours || 0), 0);
    const totalDays = activeRows.reduce((sum: number, r: any) => sum + (r.totalDays || 0), 0);
    const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
    const missedCheckouts = activeRows.reduce((sum: number, r: any) => sum + (r.missedCheckouts || 0), 0);
    return [
      { label: 'Total Employees', value: totalEmployees },
      { label: 'Total Hours', value: totalHours.toFixed(1) },
      { label: 'Avg Hours/Day', value: avgHoursPerDay },
      { label: 'Missed Checkouts', value: missedCheckouts },
    ];
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter((r: any) => r.totalDays > 0)
      .map((r: any) => ({
        name: (r.displayName || r.username || '').split(' ').slice(0, 2).join(' '),
        hours: Number(Number(r.totalHours || 0).toFixed(1)),
      }))
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 15);
  }, [data]);

  const handleDownload = () => {
    if (!data?.length) return;
    const header = 'Sr.No,Name,Team,Total Days,Total Hours,Avg Hours/Day,Missed Checkouts';
    const rows = data.map((r: any, i: number) => {
      const avg = r.totalDays > 0 ? (Number(r.totalHours) / r.totalDays).toFixed(1) : '0';
      return `${i + 1},"${r.displayName}","${r.teamName || ''}",${r.totalDays},${r.totalHours},${avg},${r.missedCheckouts}`;
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees_report.csv';
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Employees Report</div>
        <div className="page-filters">
          <RangePicker value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) setRange([d[0], d[1]]); }}
            format="DD MMM YYYY"
            presets={[
              { label: 'This Month', value: [now.startOf('month'), now] },
              { label: 'Last Month', value: [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')] },
              { label: 'Last 3 Months', value: [now.subtract(3, 'month').startOf('month'), now] },
            ]}
          />
          <Select mode="multiple" placeholder="All Teams" allowClear maxTagCount={2}
            style={{ minWidth: 220 }} value={teamIds} onChange={setTeamIds}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))}
          />
          {data && data.length > 0 && (
            <Button icon={<DownloadOutlined />} className="download-btn" onClick={handleDownload}>Download</Button>
          )}
        </div>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <>
          {/* Summary Stat Cards */}
          {stats.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {stats.map(s => (
                <div key={s.label} className="stat-card-3d" style={{
                  flex: '1 1 120px', padding: '14px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--brand-primary-bg), #fff)',
                  border: '1px solid var(--brand-primary-bg-light, #e8e8e8)',
                  borderLeft: '3px solid var(--brand-primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: 24, padding: '16px 12px', borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 10 }}>
                Top {chartData.length} Employees by Total Hours
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: any) => [`${val} hrs`, 'Total Hours']} />
                  <Bar dataKey="hours" fill={brandColor} radius={[0, 6, 6, 0]} barSize={18} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, var(--brand-primary-bg, #EBF5FB), var(--brand-primary-bg-light, #d4eaf7))', color: 'var(--brand-primary, #154360)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, width: 40 }}>#</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Team</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total Days</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total Hours</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Avg Hrs/Day</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Missed C/O</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).filter((r: any) => r.totalDays > 0).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No records for this period</td></tr>
                ) : (data || []).filter((r: any) => r.totalDays > 0).map((r: any, i: number) => {
                  const avg = r.totalDays > 0 ? (Number(r.totalHours) / r.totalDays).toFixed(1) : '0';
                  const isLowAvg = Number(avg) > 0 && Number(avg) < 8;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', background: isLowAvg ? '#fff2f0' : undefined }}>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: isLowAvg ? 600 : 400 }}>
                        {r.displayName || r.username}
                        {isLowAvg && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>Below 8h</Tag>}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.teamName || '-'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.totalDays}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{Number(r.totalHours).toFixed(1)}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600, color: Number(avg) < 8 ? '#ff4d4f' : '#52c41a' }}>{avg}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>
                        {r.missedCheckouts > 0 ? <Tag color="error" icon={<WarningOutlined />}>{r.missedCheckouts}</Tag> : '0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
