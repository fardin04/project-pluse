
import { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { UserRole, ProjectStatus } from '../types';
import { Plus, FolderKanban, Trash2, ArrowLeft, Loader2, Pencil } from 'lucide-react';

interface AdminProjectsProps {
  onSelectProject: (id: string) => void;
  onProjectCreated: () => void;
  onBack: () => void;
}

const AdminProjects: React.FC<AdminProjectsProps> = ({ onSelectProject, onProjectCreated, onBack }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  const loadData = async () => {
    try {
      const [projData, userData] = await Promise.all([
        api.getProjects(),
        api.getUsers()
      ]);
      setProjects(projData);
      setClients(userData.filter((u: any) => u.role === UserRole.CLIENT));
      setEmployees(userData.filter((u: any) => u.role === UserRole.EMPLOYEE));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      clientId: formData.get('clientId') as string,
      employeeIds: Array.from(formData.getAll('employeeIds')) as string[],
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
    };

    try {
      if (editingProject) {
        await api.updateProject(editingProject._id, projectData);
      } else {
        await api.createProject(projectData);
      }
      setShowForm(false);
      setEditingProject(null);
      loadData();
      onProjectCreated();
    } catch (err) {
      alert(editingProject ? "Project update failed" : "Project creation failed");
    }
  };

  const startEdit = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete project?')) {
      try {
        await api.deleteProject(id);
        loadData();
        onProjectCreated();
      } catch (err) {
        alert("Failed to delete");
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
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Project Registry</h2>
        <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
          <Plus size={20} /> Initialize Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project._id} onClick={() => onSelectProject(project._id)} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 hover:shadow-xl transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><FolderKanban size={24} /></div>
                <div className="flex gap-2">
                  <button onClick={(e) => startEdit(project, e)} className="p-2 text-slate-300 hover:text-indigo-500"><Pencil size={16} /></button>
                  <button onClick={(e) => handleDelete(project._id, e)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{project.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 h-10">{project.description}</p>
              <div className="mt-8 pt-6 border-t flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Client: {project.clientId?.name}</span>
                <span className="text-indigo-600 font-bold text-sm">View Details</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{editingProject ? 'Edit Project' : 'New Delivery Project'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input name="name" defaultValue={editingProject?.name || ''} type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Project Name" required />
              <textarea name="description" defaultValue={editingProject?.description || ''} className="w-full p-3 bg-slate-50 border rounded-xl h-24" placeholder="Description" required />
              <select name="clientId" defaultValue={editingProject?.clientId?._id || editingProject?.clientId || ''} className="w-full p-3 bg-slate-50 border rounded-xl" required>
                <option value="">Select Stakeholder...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input name="startDate" defaultValue={editingProject?.startDate ? new Date(editingProject.startDate).toISOString().slice(0,10) : ''} type="date" className="p-3 bg-slate-50 border rounded-xl" required />
                <input name="endDate" defaultValue={editingProject?.endDate ? new Date(editingProject.endDate).toISOString().slice(0,10) : ''} type="date" className="p-3 bg-slate-50 border rounded-xl" required />
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border max-h-40 overflow-y-auto">
                <p className="text-sm font-bold mb-2">Assign Team Members</p>
                {employees.map(emp => (
                  <div key={emp._id} className="flex items-center gap-2 p-1">
                    <input 
                      type="checkbox" 
                      name="employeeIds" 
                      value={emp._id} 
                      id={emp._id} 
                      className="w-5 h-5"
                      defaultChecked={editingProject?.employeeIds?.some((e: any) => (e._id || e) === emp._id)}
                    />
                    <label htmlFor={emp._id} className="text-sm">{emp.name}</label>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingProject(null); }} className="flex-1 py-4 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl">{editingProject ? 'Update Project' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjects;
