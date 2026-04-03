import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag, message, Modal, Form, Select, DatePicker, Input, TimePicker, Popconfirm } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getAttendanceRequests, getAllAttendanceRequests, createAttendanceRequest, approveRequest, rejectRequest } from '../../api/attendance';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: 'Pending', color: 'gold' },
  2: { label: 'Approved', color: 'green' },
  3: { label: 'Rejected', color: 'red' },
};

const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

export default function AttendanceRequests() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isLeadView = location.pathname.startsWith('/admin');
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();

  // Lead view: only reportees. Admin view: all. Employee view: own
  const { data: requests, isLoading } = useQuery({
    queryKey: ['attRequests', isLeadView, isAdmin ? 'admin' : user?.id],
    queryFn: () => isLeadView
      ? getAllAttendanceRequests(undefined, isAdmin ? undefined : user?.id)
      : getAttendanceRequests({ requesterId: user?.id }),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: createAttendanceRequest,
    onSuccess: () => { message.success('Request submitted! Your Team Lead will review it.'); setShowModal(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['attRequests'] }); },
    onError: (err: any) => {
      console.error('Request error:', err?.response?.data || err);
      message.error('Failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    },
  });

  const approveMut = useMutation({
    mutationFn: approveRequest,
    onSuccess: () => { message.success('Approved'); qc.invalidateQueries({ queryKey: ['attRequests'] }); },
  });

  const rejectMut = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => { message.success('Rejected'); qc.invalidateQueries({ queryKey: ['attRequests'] }); },
  });

  const handleSubmit = (values: any) => {
    const ciDate = values.checkinDate.format('YYYY-MM-DD');
    const ciHour = values.checkinTime ? values.checkinTime.hour() : 9;
    // Checkout date defaults to checkin date. Only next-day if checkin after 3 PM
    let coDate = ciDate;
    if (values.checkoutDate) {
      coDate = values.checkoutDate.format('YYYY-MM-DD');
      if (coDate !== ciDate && ciHour < 15) {
        message.error('Checkout date must match checkin date unless you checked in after 3 PM');
        return;
      }
    }
    createMut.mutate({
      attendanceType: values.attendanceType,
      checkinDate: ciDate,
      checkinTime: values.checkinTime?.format('HH:mm:ss') || null,
      checkoutDate: coDate,
      checkoutTime: values.checkoutTime?.format('HH:mm:ss') || null,
      description: values.description,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Attendance Requests</div>
        {!isLeadView && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}
            style={{ background: 'var(--brand-accent, #e74c3c)', borderColor: 'var(--brand-accent, #e74c3c)', borderRadius: 20 }}>
            New Request
          </Button>
        )}
      </div>

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
              {isLeadView && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Requester Name</th>}
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Attendance Type</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Checkin Date</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Checkin Time</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Checkout Date</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Checkout Time</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Approver</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
              {isLeadView && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {(requests || []).length === 0 ? (
              <tr><td colSpan={isLeadView ? 10 : 8} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No data available in table</td></tr>
            ) : (requests || []).map((r: any, i: number) => {
              const st = statusMap[r.status] || { label: 'Unknown', color: 'default' };
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                  {isLeadView && <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.requester?.displayName || r.requester?.username}</td>}
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.attendanceType}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.checkinDate ? dayjs(r.checkinDate).format('DD-MMM-YYYY') : '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.checkinTime || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.checkoutDate ? dayjs(r.checkoutDate).format('DD-MMM-YYYY') : '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.checkoutTime || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.approver?.displayName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag color={st.color}>{st.label}</Tag></td>
                  {isLeadView && (
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                      {r.status === 1 && (
                        <>
                          <Popconfirm title="Approve?" onConfirm={() => approveMut.mutate(r.id)}>
                            <CheckOutlined style={{ color: '#27ae60', cursor: 'pointer', fontSize: 15, marginRight: 12 }} />
                          </Popconfirm>
                          <Popconfirm title="Reject?" onConfirm={() => rejectMut.mutate(r.id)}>
                            <CloseOutlined style={{ color: '#e74c3c', cursor: 'pointer', fontSize: 15 }} />
                          </Popconfirm>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      <Modal title="New Attendance Request" open={showModal} onCancel={() => setShowModal(false)}
        onOk={() => form.submit()} confirmLoading={createMut.isPending} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="clean-form" style={{ marginTop: 16 }}
          onValuesChange={(changed, all) => {
            // Auto-sync checkout date
            const ciDate = all.checkinDate;
            const ciTime = all.checkinTime;
            const coTime = all.checkoutTime;
            if (ciDate) {
              let coDate = ciDate;
              // If checkout time < checkin time → next day (e.g. checkin 19:20, checkout 06:25)
              if (ciTime && coTime && coTime.hour() < ciTime.hour()) {
                coDate = ciDate.add(1, 'day');
              }
              form.setFieldsValue({ checkoutDate: coDate });
            }
          }}>
          <Form.Item name="attendanceType" label="Attendance Type" rules={[{ required: true }]} initialValue="full_day">
            <Select options={[
              { label: 'Full Day', value: 'full_day' },
              { label: 'Half Day', value: 'half_day' },
            ]} />
          </Form.Item>
          <div className="form-grid">
            <Form.Item name="checkinDate" label="Date" rules={[{ required: true, message: 'Select the date' }]}>
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY"
                disabledDate={(c) => c && c.isAfter(dayjs(), 'day')} />
            </Form.Item>
            <Form.Item name="checkinTime" label="Check-In Time" rules={[{ required: true, message: 'Enter check-in time' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
            </Form.Item>
            <Form.Item name="checkoutDate" label="Checkout Date" tooltip="Auto-set to checkin date. Only change for late shifts (after 3 PM)">
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" disabled />
            </Form.Item>
            <Form.Item name="checkoutTime" label="Check-Out Time" rules={[{ required: true, message: 'Enter check-out time' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
            </Form.Item>
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: -8, marginBottom: 12 }}>
            Checkout date is auto-set to match checkin date. For late shifts (after 3 PM), your lead can adjust it.
          </div>
          <Form.Item name="description" label="Reason" rules={[{ required: true, message: 'Explain why you need this correction' }]}>
            <Input.TextArea rows={2} placeholder="e.g. Forgot to check out, system was down..." showCount maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
