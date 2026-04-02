import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Card, Row, Col, Statistic, Button, DatePicker, Form, Input, Select, message, Collapse } from 'antd';
import { CalendarOutlined, SendOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { getLeaves, getLeaveBalance, createLeave } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;

const leaveInfo = [
  { key: 'casual', label: 'Casual Leave', color: 'blue', desc: 'For personal matters, family events, urgent work. Apply in advance when possible.' },
  { key: 'earned', label: 'Earned Leave', color: 'green', desc: 'Accumulated leave based on service. Can be carried forward. Use for planned vacations.' },
  { key: 'sick', label: 'Sick Leave', color: 'orange', desc: 'For illness or medical reasons. Medical certificate may be required for 3+ consecutive days.' },
];

export default function MyLeaves() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [showApply, setShowApply] = useState(false);
  const [days, setDays] = useState(0);

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['myLeaves', user?.id],
    queryFn: () => getLeaves(user?.id),
    enabled: !!user?.id,
  });

  const { data: balance } = useQuery({
    queryKey: ['leaveBalance', user?.id],
    queryFn: () => getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => {
      message.success('Leave request submitted!');
      form.resetFields();
      setShowApply(false);
      setDays(0);
      qc.invalidateQueries({ queryKey: ['myLeaves'] });
      qc.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
    onError: () => message.error('Failed to apply leave'),
  });

  const onFinish = (values: any) => {
    const [from, to] = values.dateRange;
    mutation.mutate({
      userId: user?.id,
      fromDate: from.format('YYYY-MM-DD'),
      toDate: to.format('YYYY-MM-DD'),
      numberOfDays: to.diff(from, 'day') + 1,
      leaveType: values.leaveType,
      description: values.description,
    });
  };

  const statusColors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
  const typeColors: Record<string, string> = { casual_leave: 'blue', earned_leave: 'green', sick_leave: 'orange' };

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><CalendarOutlined style={{ marginRight: 8 }} />Leaves</div>
        <Button type="primary" icon={showApply ? undefined : <SendOutlined />}
          onClick={() => setShowApply(!showApply)}
          style={{ borderRadius: 20, padding: '4px 24px' }}>
          {showApply ? 'Cancel' : 'Apply Leave'}
        </Button>
      </div>

      {/* Balance Card */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 16, border: '2px solid var(--brand-primary, #154360)' }}>
        <Row gutter={16} align="middle">
          <Col xs={8}>
            <Statistic title="Allowed" value={balance?.allowed || 20} suffix="days"
              valueStyle={{ color: 'var(--brand-primary)', fontSize: 22, fontWeight: 800 }} />
          </Col>
          <Col xs={8}>
            <Statistic title="Used" value={balance?.used || 0} suffix="days"
              valueStyle={{ color: '#fa8c16', fontSize: 22, fontWeight: 800 }} />
          </Col>
          <Col xs={8}>
            <Statistic title="Remaining" value={balance?.remaining ?? 20} suffix="days"
              valueStyle={{ color: (balance?.remaining ?? 20) > 5 ? '#52c41a' : '#ff4d4f', fontSize: 22, fontWeight: 800 }} />
          </Col>
        </Row>
      </Card>

      {/* Leave Type Info */}
      <Collapse ghost style={{ marginBottom: 16 }} items={[{
        key: 'info', label: <span style={{ fontSize: 13, color: 'var(--brand-primary)' }}><InfoCircleOutlined style={{ marginRight: 6 }} />What types of leaves are available?</span>,
        children: (
          <Row gutter={12}>
            {leaveInfo.map(l => (
              <Col key={l.key} xs={24} sm={8}>
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 8 }}>
                  <Tag color={l.color} style={{ marginBottom: 6, fontSize: 12 }}>{l.label}</Tag>
                  <div style={{ fontSize: 12, color: '#666' }}>{l.desc}</div>
                </div>
              </Col>
            ))}
          </Row>
        ),
      }]} />

      {/* Apply Leave Form (inline, expandable) */}
      {showApply && (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 16, background: 'var(--brand-primary-bg, #f0f7ff)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-primary)', marginBottom: 12 }}>
            <SendOutlined style={{ marginRight: 6 }} />New Leave Request
          </div>
          <Form form={form} onFinish={onFinish} layout="vertical" className="clean-form">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="dateRange" label="Date Range" rules={[{ required: true, message: 'Select dates' }]}>
                  <RangePicker style={{ width: '100%' }}
                    disabledDate={(c) => c && c.isBefore(dayjs(), 'day')}
                    onChange={(dates) => setDays(dates && dates[0] && dates[1] ? dates[1].diff(dates[0], 'day') + 1 : 0)} />
                </Form.Item>
                {days > 0 && (
                  <div style={{ marginTop: -8, marginBottom: 8, fontSize: 13, color: 'var(--brand-primary)', fontWeight: 600 }}>
                    {days} day{days > 1 ? 's' : ''} selected
                    {balance && days > balance.remaining && <Tag color="red" style={{ marginLeft: 8 }}>Exceeds balance!</Tag>}
                  </div>
                )}
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true, message: 'Select type' }]}>
                  <Select placeholder="Select type..." options={[
                    { label: 'Casual Leave', value: 'casual_leave' },
                    { label: 'Earned Leave', value: 'earned_leave' },
                    { label: 'Sick Leave', value: 'sick_leave' },
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Reason">
              <Input.TextArea rows={2} placeholder="Why do you need this leave?" showCount maxLength={300} style={{ resize: 'none' }} />
            </Form.Item>
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" htmlType="submit" loading={mutation.isPending} icon={<SendOutlined />}
                style={{ borderRadius: 20, padding: '4px 36px' }}>
                Submit Request
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Leave History */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>From</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>To</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Days</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Type</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Reason</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Loading...</td></tr>
            ) : (leaves || []).length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No leaves applied yet. Click "Apply Leave" to submit your first request.</td></tr>
            ) : (leaves || []).map((l: any, i: number) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(l.fromDate).format('DD MMM YY')}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(l.toDate).format('DD MMM YY')}</td>
                <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{l.numberOfDays}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag color={typeColors[l.leaveType] || 'default'}>{(l.leaveType || '').replace('_', ' ')}</Tag></td>
                <td style={{ padding: '7px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description || '-'}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag color={statusColors[l.status]}>{l.status}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
