import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

export default function ApiStatus() {
  const [status, setStatus] = useState({ nhanhvn: 'offline', shopify: 'offline' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/config/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái API:', error);
        setStatus({ nhanhvn: 'offline', shopify: 'offline' });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white">
      {loading ? (
        <div className="flex justify-center items-center">
          <FaSpinner className="animate-spin text-blue-600 text-2xl" />
          <span className="ml-2 text-gray-600">Đang kiểm tra...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`flex items-center p-4 rounded-lg border ${
              status.nhanhvn === 'online' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            } transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex-shrink-0">
              {status.nhanhvn === 'online' ? (
                <FaCheckCircle className="text-green-600 text-2xl" />
              ) : (
                <FaTimesCircle className="text-red-600 text-2xl" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Nhanh.vn API</p>
              <p className={`text-lg font-semibold ${status.nhanhvn === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                {status.nhanhvn.toUpperCase()}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center p-4 rounded-lg border ${
              status.shopify === 'online' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            } transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex-shrink-0">
              {status.shopify === 'online' ? (
                <FaCheckCircle className="text-green-600 text-2xl" />
              ) : (
                <FaTimesCircle className="text-red-600 text-2xl" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Shopify API</p>
              <p className={`text-lg font-semibold ${status.shopify === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                {status.shopify.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}