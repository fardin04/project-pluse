
import { UserRole } from '../types';
import { LayoutDashboard, FolderKanban, ShieldCheck, Users, LogOut } from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, currentView, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT] },
    { id: 'projects', label: 'Manage Projects', icon: FolderKanban, roles: [UserRole.ADMIN] },
    { id: 'users', label: 'User Management', icon: Users, roles: [UserRole.ADMIN] },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck, roles: [UserRole.ADMIN] },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">P</div>
          <h1 className="text-xl font-bold tracking-tight">ProjectPulse</h1>
        </div>
        
        <nav className="space-y-1">
          {menuItems.filter(item => item.roles.includes(role)).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Context</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-300">{role} Mode</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
