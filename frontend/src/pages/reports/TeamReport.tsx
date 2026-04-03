import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Spin } from 'antd';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTeamReport } from '../../api/gtl';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;
const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

export default function TeamReport() {
  const now = dayjs();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamIds, setTeamIds] = useState<number[]>([]);

  // Auto-load: no "submitted" gate — data loads on mount and on filter change
  const { data: allData, isLoading } = useQuery({
    queryKey: ['teamReport', range, isAdmin ? 'admin' : user?.id],
    queryFn: () => getTeamReport(range[0], range[1], undefined, isAdmin ? undefined : user?.id),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  // Client-side filter by selected teams (multi-select)
  const data = useMemo(() => {
    if (!allData) return [];
    if (teamIds.length === 0) return allData;
    return allData.filter((r: any) => teamIds.includes(r.teamId));
  }, [allData, teamIds]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return [];
    const totalHours = Math.round(data.reduce((s: number, r: any) => s + r.totalHours, 0) * 10) / 10;
    const empCount = data.length;
    const avgHours = empCount > 0 ? Math.round((totalHours / empCount) * 10) / 10 : 0;
    return [
      { label: 'Total Hours', value: totalHours },
      { label: 'Avg Hours / Person', value: avgHours },
      { label: 'Employees', value: empCount },
    ];
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a: any, b: any) => b.totalHours - a.totalHours)
      .slice(0, 20)
      .map((r: any) => ({ name: r.displayName || r.username, hours: r.totalHours }));
  }, [data]);

  // Group by team for team-wise summary
  const teamSummary = useMemo(() => {
    if (!data || data.length === 0) return [];
    const map = new Map<string, { team: string; hours: number; count: number }>();
    data.forEach((r: any) => {
      const t = r.teamName || 'Unknown';
      const existing = map.get(t) || { team: t, hours: 0, count: 0 };
      existing.hours += r.totalHours;
      existing.count += 1;
      map.set(t, existing);
    });
    return [...map.values()].sort((a, b) => b.hours - a.hours);
  }, [data]);

  const brandColor = useMemo(() => {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#154360'; }
    catch { return '#154360'; }
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Team Reports</div>
        <div className="page-filters">
          <RangePicker
            value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) setRange([d[0], d[1]]); }}
            format="DD MMM YYYY"
            presets={[
              { label: 'This Month', value: [now.startOf('month'), now] },
              { label: 'Last Month', value: [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')] },
              { label: 'Last 3 Months', value: [now.subtract(3, 'month').startOf('month'), now] },
            ]}
          />
          <Select
            mode="multiple"
            placeholder="All Teams"
            allowClear
            maxTagCount={2}
            style={{ minWidth: 220 }}
            value={teamIds}
            onChange={setTeamIds}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div>
          {/* Summary stat cards */}
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

          {/* Team-wise summary bar */}
          {teamSummary.length > 1 && (
            <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 10 }}>Hours by Team</div>
              <ResponsiveContainer width="100%" height={Math.max(120, teamSummary.length * 36)}>
                <BarChart data={teamSummary} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="team" type="category" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any, _: any, props: any) => [`${value} hrs (${props.payload.count} people)`, 'Team']} />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={20} fill={brandColor} opacity={0.65} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Individual bar chart - top 20 */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 10 }}>
                Hours per Employee {chartData.length < data.length ? '(Top 20)' : ''}
              </div>
              <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 32)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} hrs`, 'Hours']} />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={brandColor} opacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, var(--brand-primary-bg, #EBF5FB), var(--brand-primary-bg-light, #d4eaf7))', color: 'var(--brand-primary, #154360)' }}>
                  <th style={{ width: 50, padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Sr.No</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Team Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Employee</th>
                  <th style={{ width: 120, padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Username</th>
                  <th style={{ width: 100, padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No records found for this period</td></tr>
                ) : (
                  <>
                    {data.map((row: any, i: number) => (
                      <tr key={row.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.teamName}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.displayName}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.username}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: row.totalHours > 0 ? 600 : 400, color: row.totalHours === 0 ? '#bfbfbf' : undefined }}>{row.totalHours}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--brand-primary-bg, #EBF5FB)' }}>
                      <td colSpan={4} style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>Total:</td>
                      <td style={{ padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>
                        {Math.round(data.reduce((s: number, r: any) => s + r.totalHours, 0) * 10) / 10}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
