'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const WEEKDAYS = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export default function ClassesPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', pricePerLesson: '', schedule: '', scheduleTime: '' });
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/classes/import-excel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`✅ Đã import lớp "${data.className}" — ${data.studentsImported} học sinh mới`);
      load();
    } catch (e: any) {
      alert('Lỗi import: ' + e.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  const load = () => api.get('/classes').then(setClasses).catch(console.error);
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: '', pricePerLesson: '', schedule: '', scheduleTime: '' }); setShowModal(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, pricePerLesson: String(c.pricePerLesson || c.tuitionFee || ''), schedule: c.schedule || '', scheduleTime: c.scheduleTime || '' }); setShowModal(true); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const ppl = parseInt(form.pricePerLesson);
    const data = { name: form.name, tuitionFee: ppl, pricePerLesson: ppl, schedule: form.schedule || undefined, scheduleTime: form.scheduleTime || undefined };
    if (editing) await api.patch(`/classes/${editing.id}`, data); else await api.post('/classes', data);
    setShowModal(false); load();
  };
  const remove = async (id: string) => { if (confirm('Xóa lớp này?')) { await api.delete(`/classes/${id}`); load(); } };

  const formatSchedule = (s: string, t?: string) => {
    if (!s) return '';
    const days = s.split(',').map(d => WEEKDAYS[parseInt(d.trim())] || d.trim()).join(', ');
    return days + (t ? ` · ${t}` : '');
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Quản lý <span>Lớp học</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>📥 Import Excel</button>
            <button className="btn btn-primary" onClick={openNew}>Thêm lớp</button>
          </div>
        </div>
        {classes.length > 0 ? (
          <div className="class-grid">
            {classes.map(c => (
              <div className="class-card" key={c.id}>
                <div className="class-name">{c.name}</div>
                <div className="class-meta">
                  <div className="class-meta-item"><strong style={{ color: 'var(--accent)' }}>{formatMoney(c.pricePerLesson || c.tuitionFee)}</strong> / buổi</div>
                  <div className="class-meta-item"><strong>{c._count?.students || 0}</strong> học sinh</div>
                  {c.schedule && <div className="class-meta-item">{formatSchedule(c.schedule, c.scheduleTime)}</div>}
                </div>
                <div className="class-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => router.push(`/schedule?classId=${c.id}`)}>Lịch dạy</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-text">Chưa có lớp nào</div><button className="btn btn-primary" onClick={openNew}>Thêm lớp đầu tiên</button></div></div>
        )}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editing ? 'Sửa lớp' : 'Thêm lớp mới'}<button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
              <form onSubmit={save}>
                <div className="form-group"><label className="form-label">Tên lớp</label><input className="form-input" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Toán 10" required /></div>
                <div className="form-group"><label className="form-label">Giá mỗi buổi (VNĐ)</label><input className="form-input" style={{ width: '100%' }} type="number" value={form.pricePerLesson} onChange={e => setForm({ ...form, pricePerLesson: e.target.value })} placeholder="100000" required /></div>
                <div className="form-group">
                  <label className="form-label">Lịch học</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[2, 3, 4, 5, 6, 7].map(d => {
                      const selected = form.schedule.split(',').map(s => s.trim()).includes(String(d));
                      return (
                        <button key={d} type="button"
                          onClick={() => {
                            const current = form.schedule.split(',').map(s => s.trim()).filter(Boolean);
                            const next = selected ? current.filter(s => s !== String(d)) : [...current, String(d)];
                            setForm({ ...form, schedule: next.sort().join(',') });
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: '.82rem',
                            background: selected ? 'var(--accent)' : 'var(--surface)',
                            color: selected ? '#fff' : 'var(--text-2)',
                            borderColor: selected ? 'var(--accent)' : 'var(--border)',
                            transition: 'all 0.15s ease',
                          }}>
                          T{d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Giờ học</label><input className="form-input" style={{ width: '100%' }} type="time" value={form.scheduleTime} onChange={e => setForm({ ...form, scheduleTime: e.target.value })} /></div>
                <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu</button></div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
