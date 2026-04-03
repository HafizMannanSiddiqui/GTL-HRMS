import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Select, Space, Tag, Card, Row, Col, Statistic, Tooltip, Modal, Form, TimePicker, Input, Button, message, Progress, Spin } from 'antd';
import { WarningOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getMyAttendance, getHolidaysForMonth, createAttendanceRequest, getAttendanceRequests } from '../../api/attendance';
import { getLeaves } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const MAX_WORK_SECONDS = 43200; // 12h cap

function isWeekend(date: dayjs.Dayjs) { return date.day() === 0 || date.day() === 6; }

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null || totalSeconds === undefined) return null;
  const secs = Math.round(totalSeconds);
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LiveTimer({ checkinTime }: { checkinTime: string }) {
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  const ci = dayjs(`${dayjs().format('YYYY-MM-DD')} ${checkinTime}`);
  const diffSecs = now.diff(ci, 'second');
  return (
    <span style={{ color: '#52c41a', fontWeight: 600 }}>
      <ClockCircleOutlined style={{ marginRight: 4 }} />
      {formatDuration(diffSecs)}
    </span>
  );
}

export default function MyAttendance() {
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);

  const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const to = from.endOf('month');
  const daysInMonth = to.date();
  const isCurrentMonth = year === now.year() && month === now.month() + 1;

  const qc = useQueryClient();
  const [fixModal, setFixModal] = useState<any>(null); // { date, checkinTime, type: 'missed'|'absent' }
  const [fixForm] = Form.useForm();

  const fixMut = useMutation({
    mutationFn: createAttendanceRequest,
    onSuccess: () => {
      message.success('Request submitted! Your Team Lead will review it.');
      setFixModal(null);
      fixForm.resetFields();
      qc.invalidateQueries({ queryKey: ['myAttendance'] });
    },
    onError: (err: any) => {
      console.error('Fix request error:', err?.response?.data || err);
      message.error('Failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    },
  });

  const openFixModal = (record: any, type: 'missed' | 'absent') => {
    const dateStr = record.date; // "05 Mar, 2026 - Wednesday"
    // Extract the actual date from calendarData key
    const d = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(record.key).padStart(2, '0')}`);
    setFixModal({ date: d.format('YYYY-MM-DD'), checkinTime: record.checkinTimeRaw, type });
    fixForm.setFieldsValue({
      checkinDate: d,
      checkinTime: record.checkinTimeRaw ? dayjs(`2000-01-01 ${record.checkinTimeRaw}`) : undefined,
      attendanceType: 'full_day',
      description: type === 'missed'
        ? `Missed checkout on ${d.format('DD MMM YYYY')}. Requesting correction.`
        : `Was present on ${d.format('DD MMM YYYY')} but forgot to mark attendance.`,
    });
  };

  const handleFixSubmit = (values: any) => {
    fixMut.mutate({
      attendanceType: 'full_day',
      checkinDate: fixModal.date,
      checkinTime: values.checkinTime?.format('HH:mm:ss') || fixModal.checkinTime?.slice(0, 8) || null,
      checkoutDate: fixModal.date,
      checkoutTime: values.checkoutTime?.format('HH:mm:ss') || null,
      description: values.description || `Fix request for ${fixModal.date}`,
    });
  };

  const user = useAuthStore((s) => s.user);

  // Fetch leaves for this user
  const { data: leaves } = useQuery({
    queryKey: ['myLeaves', user?.id],
    queryFn: () => getLeaves(user?.id),
    enabled: !!user?.id,
  });

  // Build leave date map: 'YYYY-MM-DD' → { type, status }
  const leaveDates = new Map<string, { type: string; status: string }>();
  (leaves || []).forEach((l: any) => {
    const lFrom = dayjs(l.fromDate);
    const lTo = dayjs(l.toDate);
    let d = lFrom;
    while (d.isBefore(lTo) || d.isSame(lTo, 'day')) {
      leaveDates.set(d.format('YYYY-MM-DD'), { type: l.leaveType?.replace('_', ' ') || 'leave', status: l.status });
      d = d.add(1, 'day');
    }
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['myAttendance', from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')],
    queryFn: () => getMyAttendance(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
  });

  // Fetch my attendance requests to show status per day
  const { data: myRequests } = useQuery({
    queryKey: ['myAttRequests', user?.id],
    queryFn: () => getAttendanceRequests({ requesterId: user?.id }),
    enabled: !!user?.id,
  });

  // Build request date map with full details
  const requestDates = new Map<string, { status: number; checkinTime?: string; checkoutTime?: string; description?: string }>();
  (myRequests || []).forEach((r: any) => {
    if (r.checkinDate) {
      const key = dayjs(r.checkinDate).format('YYYY-MM-DD');
      requestDates.set(key, {
        status: r.status,
        checkinTime: r.checkinTime?.slice(0, 5),
        checkoutTime: r.checkoutTime?.slice(0, 5),
        description: r.description,
      });
    }
  });

  // Fetch holidays from DB
  const { data: holidays } = useQuery({
    queryKey: ['holidaysMonth', year, month],
    queryFn: () => getHolidaysForMonth(year, month),
  });

  // Build set of holiday dates for this month
  const holidayDates = new Map<string, string>(); // 'YYYY-MM-DD' → holiday name
  (holidays || []).forEach((h: any) => {
    const hFrom = dayjs(h.fromDate);
    const hTo = dayjs(h.toDate);
    let d = hFrom;
    while (d.isBefore(hTo) || d.isSame(hTo, 'day')) {
      if (d.month() + 1 === month && d.year() === year) {
        holidayDates.set(d.format('YYYY-MM-DD'), h.description);
      }
      d = d.add(1, 'day');
    }
  });

  const recordMap = new Map<string, any>();
  (records || []).forEach((r: any) => {
    const key = dayjs(r.checkinDate).format('YYYY-MM-DD');
    recordMap.set(key, r);
  });

  const calendarData: any[] = [];
  let totalSeconds = 0;
  let presentDays = 0;
  let absentDays = 0;
  let holidayDays = 0;
  let suspiciousCount = 0;
  let missedCheckouts = 0;
  let leaveDayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    const key = date.format('YYYY-MM-DD');
    const record = recordMap.get(key);
    const weekend = isWeekend(date);
    const isFuture = date.isAfter(now, 'day');
    const isToday = date.isSame(now, 'day');

    const holidayName = holidayDates.get(key);
    const isHoliday = weekend || !!holidayName;

    const leaveInfo = leaveDates.get(key);

    let duration = '';
    let durSecs = 0;
    let isSuspicious = false;
    let isMissedCheckout = false;
    let isLive = false;
    let holidayLabel = '';
    let isOnLeave = false;
    let leaveType = '';
    let leaveStatus = '';
    let status: 'present' | 'absent' | 'holiday' | 'future' | 'leave' = 'absent';

    if (isHoliday) {
      status = 'holiday';
      holidayDays++;
      holidayLabel = holidayName || (weekend ? 'Weekend' : 'Holiday');
    } else if (isFuture) {
      status = 'future';
    } else if (record) {
      status = 'present';
      presentDays++;

      // Detect missed checkout (auto-closed at 23:59:59)
      isMissedCheckout = record.checkoutState === 'auto';
      if (isMissedCheckout) missedCheckouts++;

      // Live timer for today if no checkout
      if (isToday && record.checkinTime && !record.checkoutTime) {
        isLive = true;
      }

      if (record.durationSeconds !== null && record.durationSeconds !== undefined && !isLive) {
        durSecs = Math.round(Number(record.durationSeconds));
        isSuspicious = record.suspicious || durSecs > MAX_WORK_SECONDS;
        if (isSuspicious) suspiciousCount++;
        const cappedSecs = Math.min(Math.max(0, durSecs), MAX_WORK_SECONDS);
        totalSeconds += isMissedCheckout ? 0 : cappedSecs; // Don't count missed checkouts in total
        duration = formatDuration(durSecs) || '';
      }
    } else if (!isFuture) {
      if (leaveInfo) {
        status = 'leave';
        isOnLeave = true;
        leaveType = leaveInfo.type;
        leaveStatus = leaveInfo.status;
        leaveDayCount++;
      } else {
        absentDays++;
      }
    }

    let checkinStr = '';
    let checkoutStr = '';
    if (record?.checkinTime) {
      const ciDate = dayjs(record.checkinDate);
      checkinStr = `${ciDate.format('DD-MMM-YY')} ${record.checkinTime.slice(0, 8)}`;
    }
    if (record?.checkoutTime && !isLive) {
      const coDate = record.checkoutDate ? dayjs(record.checkoutDate) : date;
      checkoutStr = `${coDate.format('DD-MMM-YY')} ${record.checkoutTime.slice(0, 8)}`;
    }

    // Check if there's a pending/approved request for this day
    const reqInfo = requestDates.get(key);
    const hasRequest = !!reqInfo;
    const requestStatus = reqInfo?.status; // 1=pending, 2=approved, 3=rejected

    calendarData.push({
      key: d, date: `${String(d).padStart(2, '0')} ${months[month - 1].slice(0, 3)}, ${year} - ${dayNames[date.day()]}`,
      duration, durationSeconds: durSecs, isSuspicious, isMissedCheckout, isLive,
      checkin: checkinStr, checkout: checkoutStr, checkinTimeRaw: record?.checkinTime,
      status, checkinState: record?.checkinState, holidayLabel,
      isOnLeave, leaveType, leaveStatus,
      hasRequest, requestStatus,
      requestCheckin: reqInfo?.checkinTime,
      requestCheckout: reqInfo?.checkoutTime,
      requestReason: reqInfo?.description,
    });
  }

  const totalH = Math.floor(totalSeconds / 3600);
  const totalM = Math.floor((totalSeconds % 3600) / 60);
  const totalS = totalSeconds % 60;
  const countableDays = presentDays - missedCheckouts;
  const avgSecs = countableDays > 0 ? Math.round(totalSeconds / countableDays) : 0;
  const avgH = Math.floor(avgSecs / 3600);
  const avgM = Math.floor((avgSecs % 3600) / 60);
  const avgS = avgSecs % 60;
  const workingDays = daysInMonth - holidayDays;

  const columns = [
    {
      title: 'Date', dataIndex: 'date', width: 220,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Duration', dataIndex: 'duration', width: 150,
      render: (v: string, r: any) => {
        if (r.status === 'holiday') return (
          <Tooltip title={r.holidayLabel}>
            <span style={{ color: '#1677ff', fontWeight: 500 }}>{r.holidayLabel || 'Holiday'}</span>
          </Tooltip>
        );
        if (r.status === 'leave') return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag color={r.leaveStatus === 'approved' ? 'green' : r.leaveStatus === 'pending' ? 'gold' : 'red'}>
              {r.leaveType}{r.leaveStatus === 'pending' ? ' (pending)' : ''}
            </Tag>
          </span>
        );
        if (r.status === 'absent') return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color: '#ff4d4f', fontWeight: 500 }}>Absent</span>
            <Tooltip title="Were you present but forgot to check in? Request a correction">
              <Tag color="blue" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => openFixModal(r, 'absent')}>
                <EditOutlined /> Forgot Check-in
              </Tag>
            </Tooltip>
            <Tooltip title="Apply for leave for this date">
              <Tag color="orange" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => window.location.href = '/my/leaves'}>
                Apply Leave
              </Tag>
            </Tooltip>
          </span>
        );
        if (r.status === 'future') return <span style={{ color: '#d9d9d9' }}>—</span>;

        if (r.isLive) return <LiveTimer checkinTime={r.checkinTimeRaw?.slice(0, 8)} />;

        if (r.isMissedCheckout) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color="error" icon={<WarningOutlined />}>Missed Checkout</Tag>
              <Tooltip title="Submit a request to fix this checkout — your Team Lead will approve it">
                <Tag color="blue" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => openFixModal(r, 'missed')}>
                  <EditOutlined /> Fix
                </Tag>
              </Tooltip>
            </span>
          );
        }

        if (r.isSuspicious) {
          return (
            <Tooltip title={`Exceeded 12h. Actual: ${v}. Capped at 12:00:00 in averages.`}>
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                <WarningOutlined style={{ marginRight: 4 }} />{v}
              </span>
            </Tooltip>
          );
        }

        if (!v) return <span style={{ color: '#fa8c16' }}>00:00:00</span>;
        // < 7h = red, 7-9h = orange, 9h = normal, 9-12h = overtime (blue)
        const secs = r.durationSeconds;
        // < 8h = red (incomplete), 8-9h = normal (full day + break), 9h+ = overtime (after break)
        const color = secs < 28800 ? '#ff4d4f' : secs <= 43200 ? '#262626' : '#ff4d4f';
        const isOvertime = secs > 32400 && secs <= 43200; // 9h+ = overtime (1h break excluded)
        return (
          <span style={{ color, fontWeight: 500 }}>
            {v}
            {isOvertime && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>OT</Tag>}
          </span>
        );
      },
    },
    { title: 'Check-In', dataIndex: 'checkin', width: 200 },
    {
      title: 'Check-Out', dataIndex: 'checkout', width: 220,
      render: (v: string, r: any) => {
        if (r.isLive) return <Tag color="green">In Office — working</Tag>;
        if (r.isMissedCheckout) return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag color="orange">Auto-closed</Tag>
            <Tag color="blue" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => openFixModal(r, 'missed')}>
              <EditOutlined /> Request Fix
            </Tag>
          </span>
        );
        if (r.status === 'present' && !v && !r.isLive) return (
          <Tag color="red" style={{ cursor: 'pointer' }} onClick={() => openFixModal(r, 'missed')}>
            <EditOutlined /> No checkout — Request
          </Tag>
        );
        return v;
      },
    },
    {
      title: 'Via', dataIndex: 'checkinState', width: 70,
      render: (v: string) => v ? <Tag color={v === 'rfid' ? 'blue' : v === 'auto' ? 'purple' : 'default'}>{v}</Tag> : null,
    },
  ];

  const attPct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  // Overtime calculation (hours above 8h per day)
  const overtimeSeconds = calendarData.reduce((s: number, d: any) => {
    if (d.status === 'present' && d.durationSeconds > 28800 && !d.isMissedCheckout) return s + (d.durationSeconds - 28800);
    return s;
  }, 0);
  const otH = Math.floor(overtimeSeconds / 3600);
  const otM = Math.floor((overtimeSeconds % 3600) / 60);

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: '#1C2833' }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />My Attendance
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button size="small" onClick={() => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }}>{'<'}</Button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'center' }}>
            {months[month - 1]} {year}
          </span>
          <Button size="small" onClick={() => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }}>{'>'}</Button>
        </div>
      </div>

      {/* ═══ Analytics — matching reference design ═══ */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Left: Stats */}
        <Card size="small" style={{ borderRadius: 12, flex: '1 1 500px', border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Analytics</span>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>{months[month - 1]} {year}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>{presentDays}<span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 400 }}>/{workingDays}</span></div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Work Schedule</div>
              <div style={{ fontSize: 10, color: '#52c41a', fontWeight: 600 }}>{attPct}%</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-primary)' }}>{totalH}:{String(totalM).padStart(2, '0')}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Logged Time</div>
              <div style={{ fontSize: 10, color: avgH >= 8 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>Avg {avgH}h {avgM}m</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#722ed1' }}>{otH}:{String(otM).padStart(2, '0')}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Overtime</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: absentDays > 0 ? '#ff4d4f' : '#52c41a' }}>{absentDays}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Absent</div>
              {leaveDayCount > 0 && <div style={{ fontSize: 10, color: '#fa8c16' }}>{leaveDayCount} on leave</div>}
            </div>
          </div>
        </Card>

        {/* Right: Today's Status — like the Clock In card in reference */}
        <Card size="small" style={{ borderRadius: 12, flex: '0 0 220px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(() => {
            const todayRec = calendarData.find((d: any) => d.isLive);
            if (todayRec) return (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#52c41a', fontWeight: 600, marginBottom: 8 }}>In Office</div>
                <LiveTimer checkinTime={todayRec.checkinTimeRaw?.slice(0, 8)} />
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>Since {todayRec.checkinTimeRaw?.slice(0, 5)}</div>
              </div>
            );
            const todayAbs = calendarData.find((d: any) => {
              const dt = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(d.key).padStart(2, '0')}`);
              return dt.isSame(dayjs(), 'day');
            });
            if (todayAbs?.status === 'present' && todayAbs?.checkout) return (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#1677ff', fontWeight: 600, marginBottom: 4 }}>Checked Out</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>{todayAbs.duration?.slice(0, 5)}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Today's Hours</div>
              </div>
            );
            return (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600 }}>Today</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4d4f', marginTop: 4 }}>Not Checked In</div>
              </div>
            );
          })()}
        </Card>
      </div>

      {/* ═══ Attendance Table ═══ */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>Clock In</th>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>Clock Out</th>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>Duration</th>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>Status</th>
              <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><Spin /></td></tr>
            ) : calendarData.map((day: any) => {
              const dateFmt = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day.key).padStart(2, '0')}`);
              const isHolidayRow = day.status === 'holiday';
              const isAbsentRow = day.status === 'absent';
              const isLeaveRow = day.status === 'leave';
              const isFuture = day.status === 'future';

              return (
                <tr key={day.key} style={{
                  borderBottom: '1px solid #f5f5f5',
                  background: isHolidayRow ? '#f0f7ff' : isLeaveRow ? '#fffbe6' : isAbsentRow ? '#fff2f0' : '#fff',
                  opacity: isFuture ? 0.35 : 1,
                }}>
                  {/* Date */}
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {dateFmt.format('ddd, DD MMM')}
                  </td>

                  {/* Clock In */}
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'center' }}>
                    {day.status === 'present' ? (
                      <span style={{ fontWeight: 500 }}>
                        {day.checkinTimeRaw?.slice(0, 5)}
                        {day.checkinState && <span style={{ fontSize: 9, color: '#8c8c8c', marginLeft: 4 }}>({day.checkinState})</span>}
                      </span>
                    ) : isHolidayRow ? (
                      <Tag color="blue" style={{ fontSize: 11 }}>{day.holidayLabel}</Tag>
                    ) : isLeaveRow ? (
                      <Tag color={day.leaveStatus === 'approved' ? 'green' : 'gold'} style={{ fontSize: 11 }}>{day.leaveType}</Tag>
                    ) : isAbsentRow ? (
                      <span style={{ color: '#ff4d4f', fontWeight: 500 }}>Absent</span>
                    ) : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>

                  {/* Clock Out */}
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'center' }}>
                    {day.isLive ? (
                      <Tag color="green" style={{ fontSize: 11 }}>Still Working</Tag>
                    ) : day.isMissedCheckout ? (
                      <Tag color="orange" style={{ fontSize: 11 }}>Auto-closed</Tag>
                    ) : day.checkout ? (
                      <span>{day.checkout.split(' ')[1]?.slice(0, 5)}</span>
                    ) : day.status === 'present' ? (
                      <span style={{ color: '#d9d9d9' }}>—</span>
                    ) : null}
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
                    {day.isLive ? (
                      <LiveTimer checkinTime={day.checkinTimeRaw?.slice(0, 8)} />
                    ) : day.duration ? (
                      <span style={{
                        color: day.isSuspicious ? '#ff4d4f' : day.durationSeconds < 28800 ? '#fa8c16' : '#52c41a',
                      }}>
                        {day.duration}
                        {day.isSuspicious && <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
                      </span>
                    ) : null}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'center' }}>
                    {day.isLive && <Tag color="green">In Office</Tag>}
                    {day.status === 'present' && !day.isLive && !day.isMissedCheckout && day.duration && day.checkout && (
                      <Tag color={day.durationSeconds >= 28800 ? 'green' : 'orange'}>{day.durationSeconds >= 28800 ? 'Complete' : 'Short Day'}</Tag>
                    )}
                    {day.isMissedCheckout && <Tag color="error">Missed Checkout</Tag>}
                    {day.status === 'present' && !day.checkout && !day.isLive && !day.isMissedCheckout && <Tag color="red">No Checkout</Tag>}
                  </td>

                  {/* Action / Request Status */}
                  <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'center' }}>
                    {day.hasRequest ? (
                      <Tooltip title={
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>Correction Request</div>
                          {day.requestCheckin && <div>Check-in: {day.requestCheckin}</div>}
                          {day.requestCheckout && <div>Check-out: {day.requestCheckout}</div>}
                          {day.requestReason && <div style={{ marginTop: 4, fontStyle: 'italic' }}>"{day.requestReason}"</div>}
                          <div style={{ marginTop: 4, fontWeight: 600 }}>
                            {day.requestStatus === 1 ? 'Waiting for lead approval' : day.requestStatus === 2 ? 'Approved and applied' : 'Rejected by lead'}
                          </div>
                        </div>
                      }>
                        {day.requestStatus === 1 ? <Tag color="gold" style={{ fontSize: 11, cursor: 'help' }}>Pending</Tag> :
                         day.requestStatus === 2 ? <Tag color="green" style={{ fontSize: 11, cursor: 'help' }}>Approved</Tag> :
                         <Tag color="red" style={{ fontSize: 11, cursor: 'help' }}>Rejected</Tag>}
                      </Tooltip>
                    ) : (
                      <>
                        {day.isMissedCheckout && (
                          <Button size="small" type="link" style={{ fontSize: 12, color: '#fa8c16', padding: 0 }} onClick={() => openFixModal(day, 'missed')}>
                            Fix C/O
                          </Button>
                        )}
                        {day.status === 'present' && !day.checkout && !day.isLive && !day.isMissedCheckout && (
                          <Button size="small" type="link" danger style={{ fontSize: 12, padding: 0 }} onClick={() => openFixModal(day, 'missed')}>
                            Request
                          </Button>
                        )}
                        {day.status === 'absent' && (
                          <Button size="small" type="link" style={{ fontSize: 12, padding: 0 }} onClick={() => openFixModal(day, 'absent')}>
                            Fix
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fix Request Modal */}
      <Modal title={fixModal?.type === 'missed' ? 'Fix Missed Checkout' : 'Request Attendance Correction'}
        open={!!fixModal} onCancel={() => setFixModal(null)}
        onOk={() => fixForm.submit()} confirmLoading={fixMut.isPending} okText="Submit Request">
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {fixModal?.type === 'missed' ? (
            <>Your checkout on <strong>{fixModal?.date}</strong> was auto-closed. Enter the correct checkout time below — your Team Lead will review and approve.</>
          ) : (
            <>You were marked absent on <strong>{fixModal?.date}</strong>. If you were present, enter your check-in and check-out times — your Team Lead will review.</>
          )}
        </div>
        <Form form={fixForm} onFinish={handleFixSubmit} layout="vertical" className="clean-form">
          <div className="form-grid">
            {fixModal?.type === 'absent' && (
              <Form.Item name="checkinTime" label="Check-In Time" rules={[{ required: true, message: 'Required' }]}>
                <TimePicker style={{ width: '100%' }} format="HH:mm:ss" />
              </Form.Item>
            )}
            {fixModal?.type === 'missed' && (
              <Form.Item label="Check-In Time">
                <Input value={fixModal?.checkinTime?.slice(0, 8) || '-'} disabled style={{ background: '#fafafa' }} />
              </Form.Item>
            )}
            <Form.Item name="checkoutTime" label="Correct Check-Out Time" rules={[{ required: true, message: 'Required' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm:ss" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Reason">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-holiday td { background: #f0f7ff !important; }
        .row-leave td { background: #fff7e6 !important; }
        .row-absent td { background: #fff2f0 !important; }
        .row-suspicious td { background: #fffbe6 !important; }
      `}</style>
    </div>
  );
}
