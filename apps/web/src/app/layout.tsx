import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = { title: 'PhamMinh Tool', description: 'Phần mềm quản lý học phí cho giáo viên' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
