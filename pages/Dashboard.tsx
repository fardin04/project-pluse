
import { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ProjectStatus } from '../types';
import { api } from '../services/apiService';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, ChevronRight, UserPlus, FolderPlus, Briefcase, Loader2 } from 'lucide-react';

interface DashboardProps {
  user: User;
  onSelectProject: (id: string) => void;
  onNavigateView: (view: string) => void;
  refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSelectProject, onNavigateView, refreshTrigger }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [refreshTrigger]);

  const stats = useMemo(() => {
    const total = projects.length;
    const critical = projects.filter(p => p.status === 'CRITICAL').length;
    const onTrack = projects.filter(p => p.status === 'ON_TRACK').length;
    const atRisk = projects.filter(p => p.status === 'AT_RISK').length;
    return { total, critical, onTrack, atRisk };
  }, [projects]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-medium">Connecting to Cloud Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Oversight</h2>
          <p className="text-slate-500 mt-1">Live health analytics from MongoDB Atlas.</p>
        </div>
      </div>

      {user.role === UserRole.ADMIN && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => onNavigateView('users')} className="flex items-center gap-4 p-6 bg-indigo-600 rounded-3xl text-white shadow-xl hover:bg-indigo-700 transition-all">
            <div className="p-3 bg-white/20 rounded-2xl"><UserPlus size={28} /></div>
            <div className="text-left">
              <h3 className="font-bold text-lg">Provision Users</h3>
              <p className="text-indigo-100 text-sm">Add team members or stakeholders.</p>
            </div>
          </button>
          <button onClick={() => onNavigateView('projects')} className="flex items-center gap-4 p-6 bg-slate-900 rounded-3xl text-white shadow-xl hover:bg-slate-800 transition-all">
            <div className="p-3 bg-white/10 rounded-2xl"><FolderPlus size={28} /></div>
            <div className="text-left">
              <h3 className="font-bold text-lg">Initialize Delivery</h3>
              <p className="text-slate-400 text-sm">Start a new project tracking cycle.</p>
            </div>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Briefcase} label="Managed Projects" value={stats.total} color="bg-blue-500" />
        <StatCard icon={CheckCircle} label="Healthy" value={stats.onTrack} color="bg-emerald-500" />
        <StatCard icon={AlertTriangle} label="Needs Attention" value={stats.atRisk} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Critical Risk" value={stats.critical} color="bg-rose-500" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-lg font-bold text-slate-900">Live Project Feed</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map(project => (
                <tr key={project._id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => onSelectProject(project._id)}>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{project.clientId?.name || 'Loading...'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-lg font-black text-slate-900">{Math.round(project.healthScore)}%</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      project.status === 'ON_TRACK' ? 'bg-emerald-50 text-emerald-700' :
                      project.status === 'AT_RISK' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <ChevronRight className="inline-block text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}><Icon size={24} /></div>
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  </div>
);

export default Dashboard;
