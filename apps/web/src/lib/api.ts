const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, data?: any) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path: string, data?: any) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
