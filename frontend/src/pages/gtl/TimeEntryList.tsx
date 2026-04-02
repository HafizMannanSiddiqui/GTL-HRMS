import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Collapse, Select, Button, message, Popconfirm, Modal, Form, Input, DatePicker, Spin, Card, Row, Col, Statistic, Tag } from 'antd';
import { DownloadOutlined, EditOutlined, DeleteOutlined, DownOutlined, FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getTimesheetGrouped, downloadTimesheetCsv, deleteTimeEntry, updateTimeEntry, getPrograms, getProjects, getSubProjects, getWbs } from '../../api/gtl';
import { getUsers } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';

const monthOptions = [
  { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
  { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
  { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => ({ label: `${currentYear - i}`, value: currentYear - i }));
const hoursOptions = Array.from({ length: 24 }, (_, i) => ({ label: `${(i + 1) * 0.5}`, value: (i + 1) * 0.5 }));

export default function TimeEntryList() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isMyPage = location.pathname.startsWith('/my');
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [programId, setProgramId] = useState<number | undefined>();
  const [editModal, setEditModal] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editProgramId, setEditProgramId] = useState<number | undefined>();
  const [editProjectId, setEditProjectId] = useState<number | undefined>();

  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(isMyPage ? user?.id : undefined);
  const userId = isMyPage ? user?.id : selectedUserId;

  const { data: allUsersData } = useQuery({
    queryKey: ['usersForTimesheet'],
    queryFn: () => getUsers(1, 1000),
    enabled: !isMyPage,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['timesheetGrouped', userId, year, month, programId],
    queryFn: () => getTimesheetGrouped(userId!, year, month, programId),
    enabled: !!userId,
  });

  const deleteMut = useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => { message.success('Deleted successfully'); qc.invalidateQueries({ queryKey: ['timesheetGrouped'] }); },
    onError: () => message.error('Failed to delete'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: any) => updateTimeEntry(id, rest),
    onSuccess: () => { message.success('Updated successfully'); setEditModal(null); qc.invalidateQueries({ queryKey: ['timesheetGrouped'] }); },
    onError: () => message.error('Failed to update'),
  });

  const { data: allPrograms } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms() });
  const { data: editProjects } = useQuery({ queryKey: ['projects', editProgramId], queryFn: () => getProjects(editProgramId), enabled: !!editProgramId });
  const { data: editSubProjects } = useQuery({ queryKey: ['subProjects', editProjectId], queryFn: () => getSubProjects(editProjectId), enabled: !!editProjectId });
  const { data: wbsList } = useQuery({ queryKey: ['wbs'], queryFn: getWbs });

  const handleDownload = async () => {
    try {
      await downloadTimesheetCsv(userId!, year, month);
      message.success('Download started');
    } catch {
      message.error('Download failed');
    }
  };

  const openEdit = (entry: any) => {
    setEditProgramId(entry.program?.id);
    setEditProjectId(entry.project?.id);
    setEditModal(entry);
    editForm.setFieldsValue({
      programId: entry.program?.id,
      projectId: entry.project?.id,
      subProjectId: entry.subProject?.id,
      wbsId: entry.wbs?.id,
      entryDate: dayjs(entry.entryDate),
      hours: Number(entry.hours),
      description: entry.description,
      workType: entry.workType,
      productPhase: entry.productPhase,
    });
  };

  const handleEditSave = (values: any) => {
    updateMut.mutate({ id: editModal.id, ...values, entryDate: values.entryDate.format('YYYY-MM-DD') });
  };

  const renderWeekTable = (week: any) => (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="gtl-table" style={{ width: '100%', minWidth: 950, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
              <th style={{ width: 40, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>#</th>
              <th style={{ width: 100, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>User Name</th>
              <th style={{ width: 90, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Date</th>
              <th style={{ width: 120, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Program</th>
              <th style={{ width: 150, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Project</th>
              <th style={{ width: 180, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Sub Project</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>WBS Description</th>
              <th style={{ width: 70, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Hours</th>
              <th style={{ width: 80, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
              {isMyPage && <th style={{ width: 80, padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {week.entries.map((entry: any, i: number) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.user?.username}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(entry.entryDate).format('DD-MM-YY')}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.program?.programName}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.project?.projectName}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.subProject?.subProjectName}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>
                  {entry.wbs?.description && <strong>{entry.wbs.description}</strong>}
                  {entry.wbs?.description && entry.description ? ' - ' : ''}
                  {entry.description}
                </td>
                <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{Number(entry.hours)}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>
                  {entry.status === 0 && <Tag color="orange" style={{ fontSize: 10 }}>Pending</Tag>}
                  {entry.status === 1 && <Tag color="green" style={{ fontSize: 10 }}>Approved</Tag>}
                  {entry.status === 2 && <Tag color="red" style={{ fontSize: 10 }}>Rejected</Tag>}
                </td>
                {isMyPage && (
                  <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                    {entry.status === 0 ? (
                      <>
                        <EditOutlined className="action-edit" onClick={() => openEdit(entry)} />
                        <Popconfirm title="Are you sure?" description="Once deleted, you will not be able to recover this!" onConfirm={() => deleteMut.mutate(entry.id)} okText="Delete" okType="danger" cancelText="No">
                          <DeleteOutlined className="action-delete" />
                        </Popconfirm>
                      </>
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
            <tr style={{ background: 'var(--brand-primary-bg, #EBF5FB)' }}>
              <td colSpan={isMyPage ? 8 : 8} style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>Total:</td>
              <td colSpan={isMyPage ? 2 : 1} style={{ padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>{week.totalHours}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const collapseItems = (data?.weeks || []).map((week: any) => ({
    key: String(week.weekNumber),
    label: (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <span style={{ fontWeight: 700, minWidth: 90 }}>Week# {String(week.weekNumber).padStart(2, '0')}:</span>
        <span style={{ flex: 1 }}>
          {dayjs(week.weekStart).format('DD MMM, YYYY')} - ({dayjs(week.weekStart).format('ddd')})
          <strong> To </strong>
          {dayjs(week.weekEnd).format('DD MMM, YYYY')} - ({dayjs(week.weekEnd).format('ddd')})
        </span>
      </div>
    ),
    children: renderWeekTable(week),
  }));

  // Calculate stats
  const totalEntries = data?.totalEntries || 0;
  const grandTotal = data?.grandTotal || 0;
  const weekCount = (data?.weeks || []).length;
  const avgPerWeek = weekCount > 0 ? Math.round((grandTotal / weekCount) * 10) / 10 : 0;
  const pendingCount = (data?.weeks || []).reduce((s: number, w: any) => s + w.entries.filter((e: any) => e.status === 0).length, 0);
  const approvedCount = (data?.weeks || []).reduce((s: number, w: any) => s + w.entries.filter((e: any) => e.status === 1).length, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><FileTextOutlined style={{ marginRight: 8 }} />Time Sheet</div>
        <div className="page-filters">
          {!isMyPage && (
            <Select placeholder="Select Employee" showSearch optionFilterProp="label" style={{ width: 250 }}
              value={selectedUserId} onChange={setSelectedUserId}
              options={(allUsersData?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
          )}
          <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 100 }} />
          <Select value={month} onChange={(v) => { setMonth(v); setProgramId(undefined); }} options={monthOptions} style={{ width: 140 }} />
          <Select placeholder="All Programs" allowClear value={programId} onChange={setProgramId} style={{ width: 180 }}
            options={(data?.programs || []).map((p: any) => ({ label: p.programName, value: p.id }))} />
          {data?.totalEntries > 0 && (
            <Button icon={<DownloadOutlined />} className="download-btn" onClick={handleDownload}>Download</Button>
          )}
        </div>
      </div>

      {/* GTL Gap Warning */}
      {data && totalEntries > 0 && (() => {
        const lastEntryDate = (data.weeks || []).reduce((latest: string, w: any) => {
          const weekLast = w.entries.reduce((l: string, e: any) => e.entryDate > l ? e.entryDate : l, '');
          return weekLast > latest ? weekLast : latest;
        }, '');
        const daysSince = lastEntryDate ? dayjs().diff(dayjs(lastEntryDate), 'day') : 0;
        if (daysSince > 1) return (
          <div style={{ background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 600, color: '#d48806' }}>You haven't logged work for {daysSince} day{daysSince > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>Last entry: {dayjs(lastEntryDate).format('DD MMM YYYY')}</span>
            </div>
            <Button size="small" type="primary" onClick={() => window.location.href = '/my/data-entry'} style={{ marginLeft: 'auto', borderRadius: 16 }}>Log Now</Button>
          </div>
        );
        return null;
      })()}

      {/* Summary Stats */}
      {data && totalEntries > 0 && (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 16, border: '2px solid var(--brand-primary, #154360)' }}>
          <Row gutter={16}>
            <Col xs={8} md={4}>
              <Statistic title="Total Hours" value={grandTotal}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: 'var(--brand-primary)', fontSize: 22, fontWeight: 800 }} />
            </Col>
            <Col xs={8} md={4}>
              <Statistic title="Entries" value={totalEntries}
                valueStyle={{ fontSize: 22, fontWeight: 800 }} />
            </Col>
            <Col xs={8} md={4}>
              <Statistic title="Weeks" value={weekCount}
                valueStyle={{ fontSize: 22, fontWeight: 800 }} />
            </Col>
            <Col xs={8} md={4}>
              <Statistic title="Avg/Week" value={`${avgPerWeek}h`}
                valueStyle={{ color: avgPerWeek >= 40 ? '#52c41a' : '#fa8c16', fontSize: 20, fontWeight: 800 }} />
            </Col>
            <Col xs={8} md={4}>
              <Statistic title="Approved" value={approvedCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: 20, fontWeight: 800 }} />
            </Col>
            <Col xs={8} md={4}>
              <Statistic title="Pending" value={pendingCount}
                valueStyle={{ color: pendingCount > 0 ? '#fa8c16' : '#52c41a', fontSize: 20, fontWeight: 800 }} />
            </Col>
          </Row>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (data?.weeks || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--brand-primary-bg, #f0f7ff)', borderRadius: 12, border: '1px dashed #d9d9d9' }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginTop: 8 }}>No Time Entries</div>
          <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>
            {isMyPage ? 'You haven\'t logged any work for this month. Go to Data Entry to start logging.' : 'No entries found for the selected filters.'}
          </div>
          {isMyPage && (
            <Button type="primary" onClick={() => window.location.href = '/my/data-entry'} style={{ marginTop: 16, borderRadius: 20 }}>
              Log Work Now
            </Button>
          )}
        </div>
      ) : (
        <>
          <Collapse
            className="timesheet-collapse"
            items={collapseItems}
            bordered={false}
            expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} style={{ color: '#fff', fontSize: 12 }} />}
            expandIconPosition="end"
          />
          {/* Grand total */}
          <div className="grand-total-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
            <span>Total Hours:</span>
            <span style={{ minWidth: 60 }}>{data?.grandTotal}</span>
          </div>
        </>
      )}

      {/* Edit Modal */}
      <Modal title="Edit Time Entry" open={!!editModal} onCancel={() => setEditModal(null)}
        onOk={() => editForm.submit()} confirmLoading={updateMut.isPending} width={620} okText="Update">
        <Form form={editForm} onFinish={handleEditSave} layout="vertical" style={{ marginTop: 16 }}>
          <div className="form-grid">
            <Form.Item name="programId" label="Program" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label"
                options={(allPrograms || []).map((p: any) => ({ label: p.programName, value: p.id }))}
                onChange={(v: number) => { setEditProgramId(v); editForm.setFieldsValue({ projectId: undefined, subProjectId: undefined }); }} />
            </Form.Item>
            <Form.Item name="projectId" label="Project">
              <Select allowClear showSearch optionFilterProp="label"
                options={(editProjects || []).map((p: any) => ({ label: p.projectName, value: p.id }))}
                onChange={(v: number) => { setEditProjectId(v); editForm.setFieldsValue({ subProjectId: undefined }); }} />
            </Form.Item>
            <Form.Item name="subProjectId" label="Sub Project">
              <Select allowClear showSearch optionFilterProp="label"
                options={(editSubProjects || []).map((p: any) => ({ label: p.subProjectName, value: p.id }))} />
            </Form.Item>
            <Form.Item name="entryDate" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD MMMM, YYYY (dddd)" />
            </Form.Item>
            <Form.Item name="wbsId" label="WBS">
              <Select allowClear options={(wbsList || []).map((w: any) => ({ label: w.description, value: w.id }))} />
            </Form.Item>
            <Form.Item name="hours" label="Hours" rules={[{ required: true }]}>
              <Select options={hoursOptions} />
            </Form.Item>
            <Form.Item name="workType" label="Work Type">
              <Select options={[{ label: 'Billable', value: 1 }, { label: 'Not Billable', value: 0 }]} />
            </Form.Item>
            <Form.Item name="productPhase" label="Product Phase">
              <Select allowClear options={[{ label: 'RnD / Prototyping', value: 'rnd' }, { label: 'Production', value: 'production' }]} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
