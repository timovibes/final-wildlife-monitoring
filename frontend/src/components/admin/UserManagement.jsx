import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import { Trash2, Shield, User as UserIcon } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users'); // Ensure your backend has this route
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/users/${id}`);
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        alert("Action failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">System Users</h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users.map((u) => (
              <li key={u.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role}
                  </span>
                  {u.id !== currentUser.id && (
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;