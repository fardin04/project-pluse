
import { User } from '../types';
import { LogOut, Activity, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <Activity size={24} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-indigo-900 leading-tight">ProjectPulse</h1>
          <p className="text-xs font-medium text-slate-500 tracking-tight">Client Feedback & Project Health Tracker</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{user.role}</p>
          </div>
          <div className="h-10 w-[1px] bg-slate-100 mx-2 hidden sm:block"></div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
            title="Sign out"
          >
            <span className="text-xs font-bold hidden sm:block">Logout</span>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
