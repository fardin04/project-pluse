
import { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { UserRole, User } from '../types';
import { UserPlus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

interface AdminUsersProps {
  onRefresh: () => void;
  onBack: () => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onRefresh, onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as UserRole,
    };

    try {
      await api.register(userData);
      setShowForm(false);
      fetchUsers();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('Delete this user?')) {
      try {
        await api.deleteUser(id);
        fetchUsers();
        onRefresh();
      } catch (err) {
        alert("Failed to delete user");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Return to Dashboard
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 mt-1">Manage cloud-hosted user profiles.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
          <UserPlus size={20} /> Create User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-900">{user.name}</td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'EMPLOYEE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{user.role}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-500">{user.email}</td>
                  <td className="px-8 py-5">
                    <button onClick={() => deleteUser(user._id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Provision User</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <input name="name" type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" placeholder="Full Name" required />
              <input name="email" type="email" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" placeholder="Email" required />
              <input name="password" type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl" placeholder="Initial Password" defaultValue="password123" required />
              <select name="role" className="w-full px-4 py-3 bg-slate-50 border rounded-xl">
                <option value={UserRole.EMPLOYEE}>Employee</option>
                <option value={UserRole.CLIENT}>Client</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 font-bold text-slate-500">Discard</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
