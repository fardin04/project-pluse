
import { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { api } from './services/apiService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ProjectDetails from './pages/ProjectDetails';
import AdminProjects from './pages/AdminProjects';
import AdminUsers from './pages/AdminUsers';
import { ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'details' | 'users' | 'compliance'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('pulse_user');
    const token = api.getToken();
    if (savedUser && token) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (data: { user: User, token: string }) => {
    setCurrentUser(data.user);
    api.setToken(data.token);
    localStorage.setItem('pulse_user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    api.clearToken();
    localStorage.removeItem('pulse_user');
    setCurrentView('dashboard');
  };

  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('details');
  };

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        role={currentUser.role} 
        currentView={currentView} 
        onNavigate={(v) => setCurrentView(v as any)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar user={currentUser} onLogout={handleLogout} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {currentView === 'dashboard' && (
            <Dashboard 
              user={currentUser} 
              onSelectProject={navigateToProject} 
              onNavigateView={(v) => setCurrentView(v as any)}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {currentView === 'projects' && (
            <AdminProjects 
              onSelectProject={navigateToProject}
              onProjectCreated={refreshData}
              onBack={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'users' && (
            <AdminUsers 
              onRefresh={refreshData}
              onBack={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'details' && selectedProjectId && (
            <ProjectDetails 
              projectId={selectedProjectId} 
              user={currentUser}
              onBack={() => setCurrentView('dashboard')}
              onUpdate={refreshData}
            />
          )}

          {currentView === 'compliance' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm text-center max-w-md">
                <ShieldCheck size={48} className="mx-auto text-indigo-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Compliance Dashboard</h3>
                <p className="mt-2">This module is currently under development to ensure SOC2 and GDPR standards are met.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
