import { useState, useEffect } from 'react';

export default function Users({ role }) {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error);
      alert('Lỗi khi lấy danh sách người dùng');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingUser.id, role: newRole }),
      });
      alert('Cập nhật role thành công');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      alert('Lỗi khi cập nhật user');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/users', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: userId }),
        });
        alert('Xóa người dùng thành công');
        fetchUsers();
      } catch (error) {
        console.error('Lỗi khi xóa user:', error);
        alert('Lỗi khi xóa user');
      }
    }
  };

  if (role !== 'admin') {
    return <div className="p-6 text-center text-red-600 text-lg font-semibold">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Quản lý người dùng</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b w-1/12 text-center">ID</th>
              <th className="py-2 px-4 border-b w-3/12 text-center">Username</th>
              <th className="py-2 px-4 border-b w-3/12 text-center">Role</th>
              <th className="py-2 px-4 border-b w-5/12 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b text-center">{user.id}</td>
                <td className="py-2 px-4 border-b text-center">{user.username}</td>
                <td className="py-2 px-4 border-b text-center">{user.role}</td>
                <td className="py-2 px-4 border-b text-center">
                  <button
                    onClick={() => handleEdit(user)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold">Chỉnh sửa người dùng: {editingUser.username}</h3>
          <div className="mt-2">
            <label className="block mb-1">Role:</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="mt-4">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
            >
              Lưu
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}