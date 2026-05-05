'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function SchedulePage() {
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
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [lessonNote, setLessonNote] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; note: string }>>({});
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

  const toggleTaught = async (lesson: any) => {
    await api.patch(`/lessons/${lesson.id}`, { taught: !lesson.taught });
    load();
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Xóa buổi dạy này?')) return;
    await api.delete(`/lessons/${id}`);
    load();
  };

  // Click empty cell to add lesson on that date
  const addLessonOnDate = async (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      await api.post('/lessons', { classId, date: dateStr });
      showToast(`Đã thêm buổi dạy ngày ${day}/${month}`);
      load();
    } catch { showToast('Không thể thêm buổi dạy'); }
  };

  const openAttendance = (lesson: any) => {
    setSelectedLesson(lesson);
    setLessonNote(lesson.note || '');
    const aData: Record<string, { present: boolean; note: string }> = {};
    data?.students?.forEach((s: any) => { aData[s.id] = { present: true, note: '' }; });
    lesson.attendances?.forEach((a: any) => {
      aData[a.student.id] = { present: a.present, note: a.note || '' };
    });
    setAttendanceData(aData);
  };

  const saveAttendance = async () => {
    const records = Object.entries(attendanceData).map(([studentId, val]) => ({
      studentId, present: val.present, note: val.note || undefined,
    }));
    await api.post(`/lessons/${selectedLesson.id}/attendance`, { records });
    // Also save lesson note
    if (lessonNote !== (selectedLesson.note || '')) {
      await api.patch(`/lessons/${selectedLesson.id}`, { note: lessonNote });
    }
    showToast('Đã lưu điểm danh');
    setSelectedLesson(null);
    load();
  };

  const generateInvoices = async () => {
    const res = await api.post('/lessons/generate-invoices', { classId, month, year });
    if (res.error) return showToast(res.error);
    showToast(`Tạo ${res.created} hóa đơn thành công`);
    setTimeout(() => router.push(`/invoices?month=${month}&year=${year}`), 1500);
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

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Lịch dạy <span>{currentClass?.name || ''}</span></h1>
          <button className="btn btn-primary" onClick={generateLessons}>Tạo từ lịch</button>
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

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, paddingLeft: 2 }}>
          {[
            { color: 'var(--success)', label: 'Đã dạy' },
            { color: 'var(--warning)', label: 'Chưa dạy' },
            { color: 'var(--border)', label: 'Chưa đến' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: 'var(--text-3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />{l.label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: 'var(--text-3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, border: '2px dashed var(--accent)', background: 'transparent' }} />Click ô trống để thêm buổi
          </div>
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
              const future = day ? isFutureDate(day) : false;
              const canAddLesson = day && !lesson && !future;

              return (
                <div key={i}
                  onClick={() => canAddLesson && addLessonOnDate(day!)}
                  style={{
                    padding: 8, minHeight: 82,
                    borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)',
                    background: !day ? 'var(--bg)' : lesson?.taught ? 'var(--success-bg)' : lesson ? (future ? 'var(--bg)' : 'var(--warning-bg)') : 'var(--surface)',
                    opacity: future && !lesson ? 0.35 : future ? 0.5 : 1,
                    cursor: canAddLesson ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                    ...(canAddLesson ? { ':hover': { background: 'var(--accent-muted)' } } : {}),
                  }}
                  onMouseEnter={e => { if (canAddLesson) (e.currentTarget.style.background = 'var(--accent-muted)'); }}
                  onMouseLeave={e => { if (canAddLesson) (e.currentTarget.style.background = 'var(--surface)'); }}
                >
                  {day && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{
                          fontSize: '.82rem', fontWeight: isToday ? 700 : 500,
                          color: isToday ? 'var(--surface)' : 'var(--text-2)',
                          ...(isToday ? { background: 'var(--accent)', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}),
                        }}>{day}</span>
                        {lesson && !future && (
                          <button onClick={e => { e.stopPropagation(); deleteLesson(lesson.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: 'var(--text-3)', lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      {lesson ? (
                        <div>
                          {future ? (
                            <div style={{ padding: '4px 0', borderRadius: 6, fontSize: '.7rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-3)' }}>
                              Chưa đến
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); toggleTaught(lesson); }}
                                style={{
                                  display: 'block', width: '100%', padding: '4px 0', border: 'none', borderRadius: 6,
                                  cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, marginBottom: 3,
                                  background: lesson.taught ? 'var(--success)' : 'var(--warning)', color: '#fff',
                                  transition: 'all 0.15s ease',
                                }}>
                                {lesson.taught ? 'Đã dạy' : 'Chưa dạy'}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); openAttendance(lesson); }}
                                style={{ display: 'block', width: '100%', padding: '3px 0', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: '.68rem', background: 'var(--surface)', color: 'var(--text-2)', transition: 'all 0.15s ease' }}>
                                Điểm danh{absentCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>· {absentCount} nghỉ</span>}
                              </button>
                            </>
                          )}
                        </div>
                      ) : canAddLesson ? (
                        <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--accent)', fontSize: '.68rem', fontWeight: 500, opacity: 0.6 }}>
                          + Thêm buổi
                        </div>
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
                {taughtCount} buổi × {formatMoney(currentClass?.pricePerLesson || 0)}/buổi
                {data?.students?.length > 0 && ` · ${data.students.length} học sinh`}
              </div>
            </div>
            <button className="btn btn-primary" onClick={generateInvoices}>Tạo hóa đơn tháng {month}</button>
          </div>
        )}

        {/* Attendance Modal */}
        {selectedLesson && (
          <div className="modal-overlay" onClick={() => setSelectedLesson(null)}>
            <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">
                Điểm danh — {new Date(selectedLesson.date).toLocaleDateString('vi-VN')}
                <button className="modal-close" onClick={() => setSelectedLesson(null)}>×</button>
              </div>

              {/* Lesson note */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Ghi chú buổi dạy</label>
                <input className="form-input" style={{ width: '100%' }} placeholder="VD: Ôn tập chương 3..."
                  value={lessonNote} onChange={e => setLessonNote(e.target.value)} />
              </div>

              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {data?.students?.map((s: any) => {
                  const att = attendanceData[s.id] || { present: true, note: '' };
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <button
                        onClick={() => setAttendanceData(prev => ({ ...prev, [s.id]: { ...prev[s.id], present: !att.present } }))}
                        style={{
                          width: 34, height: 34, borderRadius: 8, border: 'none',
                          cursor: 'pointer', fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: att.present ? 'var(--success)' : 'var(--danger)',
                          color: '#fff', transition: 'all 0.15s ease', flexShrink: 0,
                        }}>
                        {att.present ? '✓' : '✗'}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.88rem' }}>{s.name}</div>
                        {!att.present && (
                          <input
                            placeholder="Lý do nghỉ..."
                            value={att.note}
                            onChange={e => setAttendanceData(prev => ({ ...prev, [s.id]: { ...prev[s.id], note: e.target.value } }))}
                            className="form-input"
                            style={{ marginTop: 6, width: '100%', padding: '5px 10px', fontSize: '.78rem' }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: '.78rem', color: att.present ? 'var(--success)' : 'var(--danger)', fontWeight: 600, flexShrink: 0 }}>
                        {att.present ? 'Có mặt' : 'Nghỉ'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedLesson(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={saveAttendance}>Lưu điểm danh</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
