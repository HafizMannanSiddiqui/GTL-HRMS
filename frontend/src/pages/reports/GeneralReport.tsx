import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, message, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getGeneralReport, getPrograms, getProjects, getSubProjects } from '../../api/gtl';
import { getUsers } from '../../api/users';

const { RangePicker } = DatePicker;

function downloadCsv(entries: any[], filename: string) {
  if (!entries.length) { message.warning('No data to download'); return; }
  const header = 'Sr.No,Date,User,Program,Project,Sub Project,WBS,Description,Hours,Status';
  const rows = entries.map((e: any, i: number) => {
    const status = e.status === 1 ? 'Approved' : e.status === 0 ? 'Pending' : 'Rejected';
    const desc = (e.description || '').replace(/"/g, '""');
    return `${i + 1},"${dayjs(e.entryDate).format('YYYY-MM-DD')}","${e.user?.displayName || ''}","${e.program?.programName || ''}","${e.project?.projectName || ''}","${e.subProject?.subProjectName || ''}","${e.wbs?.description || ''}","${desc}",${e.hours},${status}`;
  });
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  message.success('Download started');
}

const PIE_COLORS = ['#52c41a', '#fa8c16', '#f5222d'];

export default function GeneralReport() {
  const now = dayjs();
  const [filters, setFilters] = useState<any>({ from: now.startOf('month').format('YYYY-MM-DD'), to: now.format('YYYY-MM-DD') });

  // Auto-load: no submitted gate
  const { data, isLoading } = useQuery({
    queryKey: ['generalReport', filters],
    queryFn: () => getGeneralReport(filters),
  });

  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms(true) });
  const { data: projects } = useQuery({ queryKey: ['projectsAll'], queryFn: () => getProjects(undefined, true) });
  const { data: subProjects } = useQuery({ queryKey: ['subProjectsAll'], queryFn: () => getSubProjects(undefined, true) });
  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });

  const entries = data?.entries || [];
  const set = (key: string, value: any) => setFilters((f: any) => ({ ...f, [key]: value }));

  const rejectedHours = data ? Math.max(0, (data.totalHours || 0) - (data.approvedHours || 0) - (data.unapprovedHours || 0)) : 0;
  const pieData = data ? [
    { name: 'Approved', value: data.approvedHours || 0 },
    { name: 'Pending', value: data.unapprovedHours || 0 },
    ...(rejectedHours > 0 ? [{ name: 'Rejected', value: rejectedHours }] : []),
  ].filter(d => d.value > 0) : [];

  const thStyle = {
    padding: '10px 12px', fontWeight: 700 as const, fontSize: 13,
    textAlign: 'left' as const, borderBottom: '2px solid var(--brand-primary-bg-light, #d4eaf7)',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">General Reports</div>
        <div className="page-filters">
          <RangePicker
            value={[dayjs(filters.from), dayjs(filters.to)]}
            onChange={(_, d) => { if (d[0]) setFilters((f: any) => ({ ...f, from: d[0], to: d[1] })); }}
            format="DD MMM YYYY"
            presets={[
              { label: 'This Month', value: [now.startOf('month'), now] },
              { label: 'Last Month', value: [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')] },
            ]}
          />
        </div>
      </div>

      {/* Inline filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select placeholder="All Programs" allowClear showSearch optionFilterProp="label" style={{ minWidth: 160 }}
          onChange={(v) => set('programId', v)}
          options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))} />
        <Select placeholder="All Projects" allowClear showSearch optionFilterProp="label" style={{ minWidth: 160 }}
          onChange={(v) => set('projectId', v)}
          options={(projects || []).map((p: any) => ({ label: p.projectName, value: p.id }))} />
        <Select placeholder="All Sub Projects" allowClear showSearch optionFilterProp="label" style={{ minWidth: 160 }}
          onChange={(v) => set('subProjectId', v)}
          options={(subProjects || []).map((p: any) => ({ label: p.subProjectName, value: p.id }))} />
        <Select placeholder="All Users" allowClear showSearch optionFilterProp="label" style={{ minWidth: 180 }}
          onChange={(v) => set('userId', v)}
          options={(users?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
        <Select placeholder="Work Type" allowClear style={{ minWidth: 120 }}
          onChange={(v) => set('workType', v)}
          options={[{ label: 'Billable', value: 1 }, { label: 'Not Billable', value: 0 }]} />
        <Select placeholder="Phase" allowClear style={{ minWidth: 120 }}
          onChange={(v) => set('productPhase', v)}
          options={[{ label: 'RnD', value: 'rnd' }, { label: 'Production', value: 'production' }]} />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : data ? (
        <>
          {/* Summary stat cards + Pie */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 300px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Hours', value: data.totalHours ?? 0, border: 'var(--brand-primary)', bg: 'var(--brand-primary-bg, #EBF5FB)', color: 'var(--brand-primary, #154360)' },
                { label: 'Approved', value: data.approvedHours ?? 0, border: '#52c41a', bg: '#f6ffed', color: '#52c41a' },
                { label: 'Unapproved', value: data.unapprovedHours ?? 0, border: '#fa8c16', bg: '#fff7e6', color: '#fa8c16' },
              ].map(s => (
                <div key={s.label} className="stat-card-3d" style={{
                  flex: '1 1 100px', padding: '14px 16px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${s.bg}, #fff)`,
                  borderLeft: `3px solid ${s.border}`,
                  border: `1px solid ${s.bg}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {pieData.length > 0 && (
              <div style={{ flex: '1 1 250px', padding: 16, borderRadius: 12, background: '#fafbfc', border: '1px solid var(--brand-primary-bg-light, #e8e8e8)', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 6 }}>Hours Breakdown</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}h`} labelLine={{ strokeWidth: 1 }}>
                      {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value} hrs`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Download buttons */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries.filter((e: any) => e.status === 1), 'report_approved.csv')}>Approved</Button>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries.filter((e: any) => e.status === 0), 'report_unapproved.csv')}>Unapproved</Button>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries, 'report_all.csv')}>All</Button>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, var(--brand-primary-bg, #EBF5FB), var(--brand-primary-bg-light, #d4eaf7))', color: 'var(--brand-primary, #154360)' }}>
                  <th style={{ ...thStyle, width: 40 }}>#</th>
                  <th style={{ ...thStyle, width: 100 }}>Date</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Program</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Sub Project</th>
                  <th style={thStyle}>WBS</th>
                  <th style={{ ...thStyle, width: 70 }}>Hours</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No records for this period</td></tr>
                ) : entries.map((e: any, i: number) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(e.entryDate).format('DD MMM YY')}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.user?.displayName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.program?.programName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.project?.projectName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.subProject?.subProjectName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.wbs?.description}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{Number(e.hours).toFixed(1)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>
                      <Tag color={e.status === 1 ? 'green' : e.status === 0 ? 'gold' : 'red'}>
                        {e.status === 1 ? 'Approved' : e.status === 0 ? 'Pending' : 'Rejected'}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
