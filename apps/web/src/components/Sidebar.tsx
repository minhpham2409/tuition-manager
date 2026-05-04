'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', icon: '📊', label: 'Tổng quan' },
  { href: '/classes', icon: '📚', label: 'Lớp học' },
  { href: '/schedule', icon: '📅', label: 'Lịch dạy' },
  { href: '/students', icon: '🎓', label: 'Học sinh' },
  { href: '/invoices', icon: '💳', label: 'Học phí' },
  { href: '/history', icon: '📋', label: 'Lịch sử' },
  { href: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigate = (href: string) => { router.push(href); onClose?.(); };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📖</div>
          Học Phí Pro
        </div>
        <div className="sidebar-subtitle">Quản lý thu phí thông minh</div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <button key={n.href} className={`nav-item ${pathname === n.href ? 'active' : ''}`} onClick={() => navigate(n.href)}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0] || '?'}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={() => { logout(); router.push('/login'); }}>↪ Đăng xuất</button>
      </div>
    </aside>
  );
}
