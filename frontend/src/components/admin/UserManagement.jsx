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
    <div className="min-h-screen bg-bush text-bone font-body">
      <Navbar user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-semibold mb-6">System Users</h1>
        
        <div className="border border-bush-line bg-bush-surface overflow-hidden">
          <ul className="divide-y divide-bush-line">
            {users.map((u) => (
              <li key={u.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="border border-bush-line p-2">
                    <UserIcon className="h-4 w-4 text-bone/60" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-bone">{u.firstName} {u.lastName}</p>
                    <p className="font-mono text-xs text-bone/40">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 font-mono text-[10px] uppercase tracking-widest border ${
                    u.role === 'admin' ? 'border-ochre text-ochre' : 'border-teal text-teal'
                  }`}>
                    {u.role}
                  </span>
                  {u.id !== currentUser.id && (
                    <button onClick={() => handleDeleteUser(u.id)} className="text-rust hover:text-bone">
                      <Trash2 className="h-4 w-4" />
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