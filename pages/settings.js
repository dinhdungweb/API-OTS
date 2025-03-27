import { useState, useEffect } from 'react';
import ApiStatus from '../components/ApiStatus';

export default function Settings({ role }) {
  const [config, setConfig] = useState({
    nhanh_api_key: '',
    shopify_access_token: '',
    sync_interval: 1,
  });
  const [file, setFile] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (role !== 'admin') {
      setIsLoading(false);
      return;
    }
    fetchConfig();
  }, [role]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token');
      const response = await fetch('/api/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình:', error);
      setMessage(`Lỗi khi lấy cấu hình: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setMessage('');
      if (!config.nhanh_api_key || !config.shopify_access_token || !config.sync_interval) {
        setMessage('Vui lòng điền đầy đủ thông tin cấu hình');
        setMessageType('warning');
        return;
      }
      const token = localStorage.getItem('token');
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      setMessage(data.message || 'Cập nhật cấu hình thành công');
      setMessageType('success');
    } catch (error) {
      console.error('Lỗi khi cập nhật cấu hình:', error);
      setMessage(`Lỗi khi cập nhật cấu hình: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString()}.zip`);
      document.body.appendChild(link);
      link.click();
      setMessage('Sao lưu dữ liệu thành công');
      setMessageType('success');
    } catch (error) {
      console.error('Lỗi khi sao lưu:', error);
      setMessage(`Lỗi khi sao lưu: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    setMessage('');
    if (!file) {
      setMessage('Vui lòng chọn file sao lưu');
      setMessageType('warning');
      return;
    }
    setIsRestoring(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      setMessage(data.message || 'Khôi phục dữ liệu thành công');
      setMessageType('success');
    } catch (error) {
      console.error('Lỗi khi khôi phục:', error);
      setMessage(`Lỗi khi khôi phục: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsRestoring(false);
      setFile(null);
    }
  };

  if (role !== 'admin') {
    return <div className="p-6 text-center text-red-600 text-lg font-semibold">Bạn không có quyền truy cập trang này.</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-center text-gray-600 text-lg">Đang tải cấu hình...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Cấu hình hệ thống</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Thông tin cấu hình</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nhanh.vn API Key:</label>
                <input
                  type="text"
                  name="nhanh_api_key"
                  value={config.nhanh_api_key}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập Nhanh.vn API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Shopify Access Token:</label>
                <input
                  type="text"
                  name="shopify_access_token"
                  value={config.shopify_access_token}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập Shopify Access Token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tần suất đồng bộ (phút):</label>
                <input
                  type="number"
                  name="sync_interval"
                  value={config.sync_interval}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  placeholder="Nhập tần suất đồng bộ (phút)"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
              {message && messageType === 'config' && (
                <p className={`mt-3 text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Trạng thái API</h3>
            <ApiStatus />
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Sao lưu và khôi phục dữ liệu</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className={`flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 font-semibold ${
                  isBackingUp ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isBackingUp ? 'Đang sao lưu...' : 'Sao lưu dữ liệu'}
              </button>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                accept=".zip"
                className="flex-1 w-full p-2 border rounded-lg"
              />
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className={`flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold ${
                  isRestoring ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isRestoring ? 'Đang khôi phục...' : 'Khôi phục dữ liệu'}
              </button>
            </div>
            {message && messageType !== 'config' && (
              <p className={`mt-3 text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}