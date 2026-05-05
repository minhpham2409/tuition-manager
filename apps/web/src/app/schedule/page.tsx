'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import * as XLSX from 'xlsx';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function SchedulePageWrapper() {
  return <Suspense fallback={<div className="loading"><div className="spinner" /></div>}><SchedulePage /></Suspense>;
}

function SchedulePage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const classIdParam = params.get('classId') || '';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState(classIdParam);
  const [data, setData] = useState<any>(null);
  const [confirmLesson, setConfirmLesson] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; note: string }>>({});
  const [report, setReport] = useState<any>(null);
  const [sendResult, setSendResult] = useState<any>(null); // Post-confirm send popup
  const [toast, setToast] = useState('');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => { if (user) api.get('/classes').then(c => { setClasses(c); if (!classId && c.length > 0) setClassId(c[0].id); }); }, [user]);

  const load = useCallback(() => {
    if (!classId) return;
    api.get(`/lessons?classId=${classId}&month=${month}&year=${year}`).then(setData);
  }, [classId, month, year]);
  useEffect(() => { if (user && classId) load(); }, [user, classId, load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const generateLessons = async () => {
    const res = await api.post('/lessons/generate-schedule', { classId, month, year });
    if (res.message) return showToast(res.message);
    showToast(`Đã tạo ${res.created} buổi dạy`);
    load();
  };

  // Click "Chưa dạy" → open confirm popup
  const handleMarkTaught = (lesson: any) => {
    if (lesson.taught) return; // locked
    setConfirmLesson(lesson);
    const aData: Record<string, { present: boolean; note: string }> = {};
    data?.students?.forEach((s: any) => { aData[s.id] = { present: true, note: '' }; });
    lesson.attendances?.forEach((a: any) => {
      aData[a.student.id] = { present: a.present, note: a.note || '' };
    });
    setAttendanceData(aData);
  };

  const confirmTaught = async () => {
    const records = Object.entries(attendanceData).map(([studentId, val]) => ({
      studentId, present: val.present, note: val.note || undefined,
    }));
    await api.post(`/lessons/${confirmLesson.id}/attendance`, { records });
    await api.patch(`/lessons/${confirmLesson.id}`, { taught: true });
    const lessonDate = new Date(confirmLesson.date);
    // Build send result for post-confirm popup
    const studentResults = data?.students?.map((s: any) => {
      const att = attendanceData[s.id] || { present: true, note: '' };
      return { ...s, present: att.present, note: att.note };
    }) || [];
    setSendResult({ date: lessonDate, students: studentResults });
    setConfirmLesson(null);
    load();
  };

  const sendLessonZalo = (student: any, lessonDate: Date) => {
    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][lessonDate.getDay()];
    const dateStr = lessonDate.toLocaleDateString('vi-VN');
    const status = student.present ? 'CÓ MẶT' : `NGHỈ${student.note ? ' (' + student.note + ')' : ''}`;
    const msg = [
      `Kính gửi PH ${student.parentName},`,
      ``,
      `THÔNG BÁO BUỔI HỌC`,
      `Lớp: ${currentClass?.name}`,
      `Học sinh: ${student.name}`,
      `Ngày: ${dayName} ${dateStr}`,
      ``,
      `Trạng thái: ${status}`,
      student.present ? '' : `Lý do: ${student.note || 'Không rõ'}`,
      student.present && student.note ? `Nhận xét GV: ${student.note}` : '',
      ``,
      `Trân trọng.`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(msg);
    showToast(`Đã copy thông báo ${student.name}`);
    if (student.parentPhone) {
      const zaloPhone = student.parentPhone.replace(/^0/, '84');
      window.open(`https://zalo.me/${zaloPhone}`, '_blank');
    }
  };

  const sendAllZalo = () => {
    if (!sendResult) return;
    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][sendResult.date.getDay()];
    const dateStr = sendResult.date.toLocaleDateString('vi-VN');
    const present = sendResult.students.filter((s: any) => s.present);
    const absent = sendResult.students.filter((s: any) => !s.present);
    const msg = [
      `THÔNG BÁO BUỔI HỌC — ${dayName} ${dateStr}`,
      `Lớp: ${currentClass?.name}`,
      ``,
      `Có mặt (${present.length}):`,
      ...present.map((s: any) => `  ✓ ${s.name}`),
      absent.length > 0 ? `\nVắng mặt (${absent.length}):` : '',
      ...absent.map((s: any) => `  ✗ ${s.name}${s.note ? ' — ' + s.note : ''}`),
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(msg);
    showToast('Đã copy thông báo cả lớp');
  };

  const deleteLesson = async (id: string, taught: boolean) => {
    if (taught) return showToast('Không thể xóa buổi đã xác nhận');
    await api.delete(`/lessons/${id}`);
    showToast('Đã xóa buổi dạy');
    load();
  };

  const addLessonOnDate = async (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      await api.post('/lessons', { classId, date: dateStr });
      showToast(`Đã thêm buổi dạy ngày ${day}/${month}`);
      load();
    } catch { showToast('Không thể thêm buổi dạy'); }
  };

  const generateInvoices = async () => {
    const res = await api.post('/lessons/generate-invoices', { classId, month, year });
    if (res.error) return showToast(res.error);
    showToast(`Tạo ${res.created} hóa đơn thành công`);
    setTimeout(() => router.push(`/invoices?month=${month}&year=${year}`), 1500);
  };

  const openReport = async () => {
    const res = await api.get(`/lessons/report?classId=${classId}&month=${month}&year=${year}`);
    setReport(res);
  };

  const copyReportForParent = (student: any) => {
    // Build lesson-by-lesson detail
    const lessonLines = student.lessons.map((l: any, i: number) => {
      const d = new Date(l.date);
      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
      const dateStr = d.toLocaleDateString('vi-VN');
      const status = l.present === true ? '✓ Có mặt' : l.present === false ? `✗ Nghỉ${l.note ? ' (' + l.note + ')' : ''}` : '— Chưa có';
      return `  ${i + 1}. ${dayName} ${dateStr} — ${status}`;
    }).join('\n');

    const msg = [
      `Kính gửi PH ${student.parentName},`,
      ``,
      `BÁO CÁO ĐIỂM DANH THÁNG ${month}/${year}`,
      `Lớp: ${report.className}`,
      `Học sinh: ${student.studentName}`,
      `Giá: ${formatMoney(report.pricePerLesson)}/buổi`,
      ``,
      `CHI TIẾT TỪNG BUỔI:`,
      lessonLines,
      ``,
      `TỔNG KẾT:`,
      `  Tổng buổi: ${student.total}`,
      `  Có mặt: ${student.attended} buổi`,
      student.absent > 0 ? `  Vắng: ${student.absent} buổi` : '',
      ``,
      `HỌC PHÍ:`,
      `  ${student.attended} buổi × ${formatMoney(report.pricePerLesson)} = ${formatMoney(student.amount)}`,
      ``,
      `Xin cảm ơn PH đã theo dõi!`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(msg);
    showToast(`Đã copy báo cáo ${student.studentName}`);
    if (student.parentPhone) {
      const zaloPhone = student.parentPhone.replace(/^0/, '84');
      window.open(`https://zalo.me/${zaloPhone}`, '_blank');
    }
  };

  const exportExcel = () => {
    if (!report) return;
    const wsData = [
      ['BÁO CÁO ĐIỂM DANH', `Lớp: ${report.className}`, `Tháng: ${report.month}/${report.year}`],
      [],
      ['Học sinh', ...report.lessonDates.map((d: string) => {
        const date = new Date(d);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }), 'Có mặt', 'Nghỉ', 'Học phí']
    ];

    report.students.forEach((s: any) => {
      const row = [s.studentName];
      s.lessons.forEach((l: any) => {
        row.push(l.present === true ? 'x' : l.present === false ? 'vắng' : '');
      });
      row.push(s.attended.toString());
      row.push(s.absent.toString());
      row.push(s.amount.toString());
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
    XLSX.writeFile(wb, `BaoCao_${report.className}_T${report.month}_${report.year}.xlsx`);
  };

  const exportPDF = () => {
    if (!report) return;
    const dates = report.lessonDates.map((d: string) => {
      const date = new Date(d);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const rows = report.students.map((s: any) => {
      const cells = s.lessons.map((l: any) => l.present === true ? '✓' : l.present === false ? '✗' : '—');
      return `<tr><td style="font-weight:600;white-space:nowrap">${s.studentName}</td>${cells.map((c: string) => `<td style="text-align:center;color:${c === '✓' ? '#1a8a5c' : c === '✗' ? '#c43e3e' : '#999'}">${c}</td>`).join('')}<td style="text-align:center;font-weight:700;color:#1a8a5c">${s.attended}</td><td style="text-align:center;font-weight:700;color:${s.absent > 0 ? '#c43e3e' : '#999'}">${s.absent}</td><td style="text-align:right;font-weight:600">${formatMoney(s.amount)}</td></tr>`;
    }).join('');
    const html = `<html><head><title>Báo cáo ${report.className}</title><style>body{font-family:Inter,sans-serif;padding:24px;font-size:12px}h1{font-size:16px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px}th{background:#f5f5f5;font-size:11px}</style></head><body><h1>BÁO CÁO ĐIỂM DANH — ${report.className}</h1><p>Tháng ${report.month}/${report.year} · ${report.totalLessons} buổi · Giá: ${formatMoney(report.pricePerLesson)}/buổi</p><table><thead><tr><th>Học sinh</th>${dates.map((d: string) => `<th>${d}</th>`).join('')}<th>Có mặt</th><th>Nghỉ</th><th>Học phí</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const isFutureDate = (day: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(year, month - 1, day) > today;
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const lessonsByDay: Record<number, any> = {};
  data?.lessons?.forEach((l: any) => { lessonsByDay[new Date(l.date).getDate()] = l; });

  const taughtCount = data?.lessons?.filter((l: any) => l.taught).length || 0;
  const totalLessons = data?.lessons?.length || 0;
  const currentClass = classes.find(c => c.id === classId);

  const confirmPresent = Object.values(attendanceData).filter(a => a.present).length;
  const confirmAbsent = Object.values(attendanceData).filter(a => !a.present).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Lịch dạy <span>{currentClass?.name || ''}</span></h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API}/lessons/attendance-template?classId=${classId}&month=${month}&year=${year}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) { const e = await res.json().catch(() => ({})); return alert('Lỗi: ' + (e.message || 'Không tải được')); }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `mau-diem-danh-T${month}-${year}-${currentClass?.name}.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) { alert('Lỗi: ' + e.message); }
            }}>📄 File mẫu</button>
            <button className="btn btn-ghost" onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API}/lessons/export-attendance?classId=${classId}&month=${month}&year=${year}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) { const e = await res.json().catch(() => ({})); return alert('Lỗi: ' + (e.message || 'Không xuất được')); }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `diem-danh-T${month}-${year}-${currentClass?.name}.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) { alert('Lỗi: ' + e.message); }
            }}>⬇️ Điểm danh</button>
            {taughtCount > 0 && <button className="btn btn-secondary" onClick={openReport}>Báo cáo</button>}
            <button className="btn btn-primary" onClick={generateLessons}>Tạo từ lịch</button>
          </div>
        </div>

        <div className="filters-bar">
          <select className="form-select" value={classId} onChange={e => setClassId(e.target.value)}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: '.82rem' }}>
            {taughtCount}/{totalLessons} buổi đã dạy
            {currentClass?.pricePerLesson && ` · ${formatMoney(currentClass.pricePerLesson)}/buổi`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 10, paddingLeft: 2 }}>
          {[
            { color: 'var(--success)', label: 'Đã dạy (khóa)' },
            { color: 'var(--warning)', label: 'Chưa xác nhận' },
            { color: 'var(--border)', label: 'Chưa đến' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: 'var(--text-3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />{l.label}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {WEEKDAY_LABELS.map(w => (
              <div key={w} style={{ padding: '10px 0', textAlign: 'center', fontWeight: 700, fontSize: '.72rem', color: 'var(--text-3)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w}</div>
            ))}
            {calendarDays.map((day, i) => {
              const lesson = day ? lessonsByDay[day] : null;
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
              const absentCount = lesson?.attendances?.filter((a: any) => !a.present).length || 0;
              const presentCount = lesson?.attendances?.filter((a: any) => a.present).length || 0;
              const future = day ? isFutureDate(day) : false;
              const canAddLesson = day && !lesson && !future;

              return (
                <div key={i}
                  onClick={() => canAddLesson && addLessonOnDate(day!)}
                  onMouseEnter={e => { if (canAddLesson) (e.currentTarget.style.background = 'var(--accent-muted)'); }}
                  onMouseLeave={e => { if (canAddLesson) (e.currentTarget.style.background = 'var(--surface)'); }}
                  style={{
                    padding: 8, minHeight: 82,
                    borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)',
                    background: !day ? 'var(--bg)' : lesson?.taught ? 'var(--success-bg)' : lesson ? (future ? 'var(--bg)' : 'var(--warning-bg)') : 'var(--surface)',
                    opacity: future && !lesson ? 0.35 : future ? 0.5 : 1,
                    cursor: canAddLesson ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}>
                  {day && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{
                          fontSize: '.82rem', fontWeight: isToday ? 700 : 500,
                          color: isToday ? 'var(--surface)' : 'var(--text-2)',
                          ...(isToday ? { background: 'var(--accent)', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}),
                        }}>{day}</span>
                        {lesson && !future && !lesson.taught && (
                          <button onClick={e => { e.stopPropagation(); deleteLesson(lesson.id, lesson.taught); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: 'var(--text-3)', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                            title="Xóa buổi dạy">×</button>
                        )}
                      </div>
                      {lesson ? (
                        <div>
                          {future ? (
                            <div style={{ padding: '4px 0', borderRadius: 6, fontSize: '.7rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-3)' }}>Chưa đến</div>
                          ) : lesson.taught ? (
                            <div style={{ padding: '4px 0', borderRadius: 6, fontSize: '.7rem', fontWeight: 600, textAlign: 'center', background: 'var(--success)', color: '#fff' }}>
                              Đã dạy
                              {(presentCount > 0 || absentCount > 0) && (
                                <div style={{ fontSize: '.62rem', fontWeight: 500, opacity: 0.9, marginTop: 1 }}>
                                  {presentCount}✓ {absentCount > 0 && <span>{absentCount}✗</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); handleMarkTaught(lesson); }}
                              style={{
                                display: 'block', width: '100%', padding: '4px 0', border: 'none', borderRadius: 6,
                                cursor: 'pointer', fontSize: '.72rem', fontWeight: 600,
                                background: 'var(--warning)', color: '#fff',
                                transition: 'all 0.15s ease',
                              }}>
                              Chưa dạy
                            </button>
                          )}
                        </div>
                      ) : canAddLesson ? (
                        <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--accent)', fontSize: '.68rem', fontWeight: 500, opacity: 0.6 }}>+ Thêm buổi</div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {taughtCount > 0 && (
          <div className="card" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Xuất hóa đơn</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>
                {taughtCount} buổi × {formatMoney(currentClass?.pricePerLesson || 0)}/buổi · {data?.students?.length || 0} học sinh
              </div>
            </div>
            <button className="btn btn-primary" onClick={generateInvoices}>Tạo hóa đơn tháng {month}</button>
          </div>
        )}

        {/* CONFIRM TAUGHT POPUP */}
        {confirmLesson && (
          <div className="modal-overlay" onClick={() => setConfirmLesson(null)}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                Xác nhận buổi dạy — {new Date(confirmLesson.date).toLocaleDateString('vi-VN')}
                <button className="modal-close" onClick={() => setConfirmLesson(null)}>×</button>
              </div>
              <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: 'var(--warning)', fontWeight: 500 }}>
                Sau khi xác nhận sẽ không thể chỉnh sửa. Hãy kiểm tra kỹ.
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--success-bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>{confirmPresent}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--success)', fontWeight: 600 }}>Có mặt</div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--danger-bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)' }}>{confirmAbsent}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--danger)', fontWeight: 600 }}>Vắng mặt</div>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {data?.students?.map((s: any) => {
                  const att = attendanceData[s.id] || { present: true, note: '' };
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <button onClick={() => setAttendanceData(prev => ({ ...prev, [s.id]: { ...prev[s.id], present: !att.present } }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: att.present ? 'var(--success)' : 'var(--danger)', color: '#fff', transition: 'all 0.15s ease', flexShrink: 0 }}>
                        {att.present ? '✓' : '✗'}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.85rem' }}>{s.name}</div>
                        <input placeholder={att.present ? 'Nhận xét (VD: Làm bài tốt)...' : 'Lý do nghỉ...'} value={att.note}
                          onChange={e => setAttendanceData(prev => ({ ...prev, [s.id]: { ...prev[s.id], note: e.target.value } }))}
                          className="form-input" style={{ marginTop: 4, width: '100%', padding: '4px 8px', fontSize: '.75rem' }} />
                      </div>
                      <span style={{ fontSize: '.75rem', color: att.present ? 'var(--success)' : 'var(--danger)', fontWeight: 600, flexShrink: 0 }}>
                        {att.present ? 'Có mặt' : 'Nghỉ'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setConfirmLesson(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={confirmTaught}>Xác nhận đã dạy</button>
              </div>
            </div>
          </div>
        )}

        {/* REPORT MODAL */}
        {report && (
          <div className="modal-overlay" onClick={() => setReport(null)}>
            <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                Báo cáo điểm danh — {report.className} T{report.month}/{report.year}
                <button className="modal-close" onClick={() => setReport(null)}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', fontSize: '.82rem' }}>
                  Tổng: <strong>{report.totalLessons}</strong> buổi
                </div>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--bg-subtle)', fontSize: '.82rem' }}>
                  Giá: <strong>{formatMoney(report.pricePerLesson)}</strong>/buổi
                </div>
              </div>
              <div style={{ overflow: 'auto', maxHeight: 440 }}>
                <table className="data-table" style={{ fontSize: '.78rem' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--bg-subtle)', zIndex: 1 }}>Học sinh</th>
                      {report.lessonDates?.map((d: string, i: number) => (
                        <th key={i} style={{ textAlign: 'center', padding: '6px 4px', minWidth: 36 }}>
                          {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
                        </th>
                      ))}
                      <th style={{ textAlign: 'center' }}>Có mặt</th>
                      <th style={{ textAlign: 'center' }}>Nghỉ</th>
                      <th style={{ textAlign: 'right' }}>Học phí</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students?.map((s: any) => (
                      <tr key={s.studentId}>
                        <td style={{ fontWeight: 600, color: 'var(--text)', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, whiteSpace: 'nowrap' }}>{s.studentName}</td>
                        {s.lessons.map((l: any, i: number) => (
                          <td key={i} style={{ textAlign: 'center', padding: '6px 4px' }}>
                            {l.present === true ? (
                              <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>
                            ) : l.present === false ? (
                              <span style={{ color: 'var(--danger)', fontWeight: 700 }} title={l.note || ''}>✗</span>
                            ) : (
                              <span style={{ color: 'var(--text-3)' }}>—</span>
                            )}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{s.attended}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: s.absent > 0 ? 'var(--danger)' : 'var(--text-3)' }}>{s.absent}</td>
                        <td className="money" style={{ textAlign: 'right' }}>{formatMoney(s.amount)}</td>
                        <td><button className="btn btn-sm btn-ghost" onClick={() => copyReportForParent(s)}>Gửi</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={exportExcel} style={{ marginRight: 8 }}>Xuất Excel</button>
                <button className="btn btn-secondary" onClick={exportPDF} style={{ marginRight: 'auto' }}>Xuất PDF</button>
                <button className="btn btn-secondary" onClick={() => setReport(null)}>Đóng</button>
              </div>
            </div>
          </div>
        )}

        {/* POST-CONFIRM SEND POPUP */}
        {sendResult && (
          <div className="modal-overlay" onClick={() => setSendResult(null)}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                Xác nhận thành công — {sendResult.date.toLocaleDateString('vi-VN')}
                <button className="modal-close" onClick={() => setSendResult(null)}>×</button>
              </div>
              <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: 'var(--success)', fontWeight: 600 }}>
                Buổi dạy đã được khóa. Gửi thông báo cho phụ huynh?
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--success-bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{sendResult.students.filter((s: any) => s.present).length}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--success)' }}>Có mặt</div>
                </div>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--danger-bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{sendResult.students.filter((s: any) => !s.present).length}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--danger)' }}>Vắng mặt</div>
                </div>
              </div>

              <div style={{ maxHeight: 280, overflow: 'auto' }}>
                {sendResult.students.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#fff', background: s.present ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                      {s.present ? '✓' : '✗'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.85rem' }}>{s.name}</div>
                      {s.note && <div style={{ fontSize: '.72rem', color: s.present ? 'var(--info)' : 'var(--danger)', marginTop: 1 }}>{s.present ? '📝 ' : ''}{s.note}</div>}
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => sendLessonZalo(s, sendResult.date)}>
                      Gửi Zalo
                    </button>
                  </div>
                ))}
              </div>
              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button className="btn btn-secondary" onClick={sendAllZalo}>Copy tất cả</button>
                <button className="btn btn-primary" onClick={() => setSendResult(null)}>Xong</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
