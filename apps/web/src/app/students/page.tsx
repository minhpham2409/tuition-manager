'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function StudentsPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', parentName: '', parentPhone: '', classId: '' });

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => { if (user) { api.get('/classes').then(setClasses); load(); } }, [user]);

  const load = (cId?: string) => { const q = cId || filterClass; api.get(`/students${q ? `?classId=${q}` : ''}`).then(setStudents); };
  const openNew = () => { setEditing(null); setForm({ name: '', parentName: '', parentPhone: '', classId: classes[0]?.id || '' }); setShowModal(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, parentName: s.parentName, parentPhone: s.parentPhone || '', classId: s.classId }); setShowModal(true); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (editing) await api.patch(`/students/${editing.id}`, form); else await api.post('/students', form); setShowModal(false); load(); };
  const remove = async (id: string) => { if (confirm('Xóa học sinh này?')) { await api.delete(`/students/${id}`); load(); } };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">🎓 Quản lý <span>Học sinh</span></h1>
          <button className="btn btn-primary" onClick={openNew}>+ Thêm học sinh</button>
        </div>
        <div className="filters-bar">
          <select className="form-select" value={filterClass} onChange={e => { setFilterClass(e.target.value); load(e.target.value); }}>
            <option value="">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span style={{ color: 'var(--text-3)', fontSize: '.82rem' }}>{students.length} học sinh</span>
        </div>
        <div className="card">
          {students.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Họ tên</th><th>Lớp</th><th>Phụ huynh</th><th>SĐT</th><th></th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</td>
                    <td><span className="badge badge-paid">{s.class?.name}</span></td>
                    <td>{s.parentName}</td>
                    <td>{s.parentPhone || '—'}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => openEdit(s)}>✏️</button>
                      <button className="btn-icon" onClick={() => remove(s.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">🎓</div><div className="empty-state-text">Chưa có học sinh</div></div>
          )}
        </div>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editing ? 'Sửa' : 'Thêm'} học sinh<button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
              <form onSubmit={save}>
                <div className="form-group"><label className="form-label">Họ tên học sinh</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Tên phụ huynh</label><input className="form-input" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">SĐT phụ huynh</label><input className="form-input" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Lớp</label>
                  <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })} required>
                    <option value="">Chọn lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">Lưu</button></div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
