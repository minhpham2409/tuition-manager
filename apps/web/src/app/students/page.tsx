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
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', parentName: '', parentPhone: '', classId: '' });
  const [toast, setToast] = useState('');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => { if (user) { api.get('/classes').then(setClasses); load(); } }, [user]);

  const load = (cId?: string) => {
    const q = cId !== undefined ? cId : filterClass;
    api.get(`/students${q ? `?classId=${q}` : ''}`).then(setStudents);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openNew = (presetClassId?: string) => {
    setEditing(null);
    setForm({ name: '', parentName: '', parentPhone: '', classId: presetClassId || classes[0]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, parentName: s.parentName, parentPhone: s.parentPhone || '', classId: s.classId });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await api.patch(`/students/${editing.id}`, form);
      showToast('Đã cập nhật học sinh');
    } else {
      await api.post('/students', form);
      showToast('Đã thêm học sinh mới');
    }
    setShowModal(false);
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Xóa học sinh "${name}"? Tất cả hóa đơn và điểm danh của học sinh này cũng sẽ bị xóa.`)) return;
    await api.delete(`/students/${id}`);
    showToast('Đã xóa học sinh');
    load();
  };

  const changeClass = async (studentId: string, newClassId: string) => {
    await api.patch(`/students/${studentId}`, { classId: newClassId });
    showToast('Đã chuyển lớp');
    load();
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const filtered = students.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.parentName?.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by class
  const grouped = new Map<string, any[]>();
  filtered.forEach(s => {
    const cls = s.class?.name || 'Chưa phân lớp';
    if (!grouped.has(cls)) grouped.set(cls, []);
    grouped.get(cls)!.push(s);
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Quản lý <span>Học sinh</span></h1>
          <button className="btn btn-primary" onClick={() => openNew()}>Thêm học sinh</button>
        </div>

        <div className="filters-bar">
          <input className="form-input" placeholder="Tìm kiếm học sinh..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ minWidth: 200 }} />
          <select className="form-select" value={filterClass} onChange={e => { setFilterClass(e.target.value); load(e.target.value); }}>
            <option value="">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c._count?.students || 0})</option>)}
          </select>
          <span style={{ color: 'var(--text-3)', fontSize: '.82rem', marginLeft: 'auto' }}>{filtered.length} học sinh</span>
        </div>

        {filterClass ? (
          /* Table view when filtering by class */
          <div className="card">
            {filtered.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead><tr><th>Họ tên</th><th>Phụ huynh</th><th>SĐT</th><th>Lớp</th><th style={{ width: 120 }}>Thao tác</th></tr></thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</td>
                        <td>{s.parentName}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.parentPhone || '—'}</td>
                        <td>
                          <select className="form-select" value={s.classId} onChange={e => changeClass(s.id, e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '.78rem' }}>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>Sửa</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/portal/${s.id}`);
                            showToast('Đã copy link portal');
                          }}>🔗 Portal</button>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(s.id, s.name)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-text">Lớp chưa có học sinh</div>
                <button className="btn btn-primary" onClick={() => openNew(filterClass)}>Thêm học sinh vào lớp</button>
              </div>
            )}
          </div>
        ) : (
          /* Grouped view when showing all */
          <>
            {Array.from(grouped.entries()).map(([className, classStudents]) => (
              <div key={className} className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>
                    {className}
                    <span style={{ fontWeight: 500, color: 'var(--text-3)', fontSize: '.78rem', marginLeft: 8 }}>{classStudents.length} học sinh</span>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => openNew(classStudents[0]?.classId)}>Thêm vào lớp</button>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead><tr><th>Họ tên</th><th>Phụ huynh</th><th>SĐT</th><th style={{ width: 150 }}>Thao tác</th></tr></thead>
                    <tbody>
                      {classStudents.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</td>
                          <td>{s.parentName}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.parentPhone || '—'}</td>
                          <td style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>Sửa</button>
                            <select className="form-select" onChange={e => { if (e.target.value) changeClass(s.id, e.target.value); e.target.value = ''; }}
                              style={{ padding: '3px 6px', fontSize: '.72rem', width: 'auto' }}>
                              <option value="">Chuyển lớp</option>
                              {classes.filter(c => c.id !== s.classId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(s.id, s.name)}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {grouped.size === 0 && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-text">Chưa có học sinh nào</div>
                  <button className="btn btn-primary" onClick={() => openNew()}>Thêm học sinh đầu tiên</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add/Edit Student Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editing ? 'Sửa' : 'Thêm'} học sinh<button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
              <form onSubmit={save}>
                <div className="form-group">
                  <label className="form-label">Họ tên học sinh</label>
                  <input className="form-input" style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tên phụ huynh</label>
                    <input className="form-input" style={{ width: '100%' }} value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} placeholder="Nguyễn Thị B" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT phụ huynh</label>
                    <input className="form-input" style={{ width: '100%' }} value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} placeholder="0978123456" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lớp</label>
                  <select className="form-select" style={{ width: '100%' }} value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })} required>
                    <option value="">Chọn lớp</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
