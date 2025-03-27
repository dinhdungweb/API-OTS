import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AppProvider } from '../components/AppContext';
import dynamic from 'next/dynamic';
import CreateUser from '../components/CreateUser';
import '../styles/globals.css';

// Dynamic import ToastContainer và tắt SSR
const ToastContainer = dynamic(() => import('react-toastify').then(mod => mod.ToastContainer), {
  ssr: false,
});

export default function MyApp({ Component, pageProps }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken && storedRole) {
      setToken(storedToken);
      setRole(storedRole);
    } else if (router.pathname !== '/login') {
      router.push('/login');
    }

    // Gọi API Route để khởi động auto-sync
    if (typeof window !== 'undefined') {
      fetch('/api/start-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(data => {
          console.log(data.message);
        })
        .catch(err => {
          console.error('Failed to start auto-sync:', err);
        });
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setShowCreateUser(false);
    router.push('/login');
  };

  if (!token || !role) {
    return <Component {...pageProps} />;
  }

  return (
    <AppProvider>
      <div className="relative min-h-screen">
        <ToastContainer position="top-right" autoClose={3000} />
        <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div className="text-lg font-bold">Hệ thống quản lý đồng bộ</div>
          <div className="flex items-center gap-4">
            <Link href="/products" className="px-3 py-1 hover:bg-blue-700 rounded text-sm">
              Sản phẩm
            </Link>
            {role === 'admin' && (
              <>
                <Link href="/dashboard" className="px-3 py-1 hover:bg-blue-700 rounded text-sm">
                  Dashboard
                </Link>
                <Link href="/settings" className="px-3 py-1 hover:bg-blue-700 rounded text-sm">
                  Cấu hình
                </Link>
                <Link href="/users" className="px-3 py-1 hover:bg-blue-700 rounded text-sm">
                  Quản lý người dùng
                </Link>
                <button
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
                >
                  {showCreateUser ? 'Ẩn tạo user' : 'Tạo user mới'}
                </button>
              </>
            )}
            <span className="text-sm">Xin chào, {role}</span>
            <button onClick={handleLogout} className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm">
              Đăng xuất
            </button>
          </div>
        </nav>
        {showCreateUser && role === 'admin' && (
          <div className="p-6 max-w-md mx-auto">
            <CreateUser onUserCreated={() => setShowCreateUser(false)} />
          </div>
        )}
        <Component {...pageProps} role={role} />
      </div>
    </AppProvider>
  );
}