import React, { useState, useEffect } from 'react';
import authService from '../services/auth';
import { useI18n } from '../i18n';

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useI18n();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await authService.getAllUsers();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div className="text-white text-center mt-20">Loading...</div>;
  
  // Debug info
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  if (error) return (
    <div className="text-red-500 text-center mt-20">
        <h2 className="text-xl font-bold">Error: {error}</h2>
        <div className="mt-4 p-4 bg-gray-800 rounded inline-block text-left">
            <p className="text-gray-400 mb-2">Debug Info:</p>
            <p>User: {currentUser?.username}</p>
            <p>Email: {currentUser?.email}</p>
            <p>Role (Frontend): <span className="text-yellow-400">{currentUser?.role || 'undefined'}</span></p>
            <p className="text-xs text-gray-500 mt-2">Token: {currentUser?.token?.substring(0, 10)}...</p>
        </div>
        <div className="mt-4">
             <button onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} className="bg-red-600 px-4 py-2 rounded text-white">
                Xóa Cache & Đăng nhập lại
             </button>
        </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 pt-24 text-white">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-2">Thống kê</h2>
        <p className="text-4xl font-bold text-accent-cyan">{users.length} <span className="text-base font-normal text-gray-400">người dùng</span></p>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700 text-gray-300">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-gray-400">{user.id}</td>
                  <td className="px-6 py-4 font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-gray-300">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === 'ADMIN' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;
