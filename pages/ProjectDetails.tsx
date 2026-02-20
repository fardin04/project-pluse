import { useState, useEffect, useRef } from 'react';
import { 
  Project, User, UserRole, ProjectStatus, WeeklyCheckIn, 
  ClientFeedback, RiskItem, RiskSeverity, RiskStatus 
} from '../types';
import { api } from '../services/apiService';
import { 
  ArrowLeft, Calendar, AlertCircle, 
  MessageSquare, TrendingUp, History, Flag, Plus, Check, ClipboardList, Loader2 
} from 'lucide-react';

interface ProjectDetailsProps {
  projectId: string;
  user: User;
  onBack: () => void;
  onUpdate: () => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ projectId, user, onBack, onUpdate }) => {
  const [project, setProject] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'checkins' | 'feedback' | 'risks' | 'logs'>('overview');
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const [projData, eventData] = await Promise.all([
          api.getProject(projectId),
          api.getEvents(projectId)
        ]);
        setProject(projData);
        setEvents(eventData);
      } catch (err) {
        console.error("Failed to load project details", err);
      } finally {
        setLoading(false);
      }
    };
    loadProjectData();
  }, [projectId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>Synchronizing with Cloud D</p>
    </div>
  );

  if (!project) return <div className="p-8 text-center text-slate-500 font-bold">Project not found.</div>;

  const projectRisks = events.filter(e => e.type === 'RISK');
  const openRisks = projectRisks.filter(r => r.riskStatus !== 'RESOLVED');
  const projectCheckins = events.filter(e => e.type === 'CHECKIN');
  const projectFeedbacks = events.filter(e => e.type === 'FEEDBACK');
  const riskResolutions = events.filter(e => e.type === 'STATUS_CHANGE' && e.title?.includes('Risk Resolved'));

  const isEmployee = project.employeeIds?.some((e: any) => (e._id || e) === user.id);
  const isClient = (project.clientId?._id || project.clientId) === user.id;

  const handleAction = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload: any = { type };

    if (type === 'CHECKIN') {
      payload.title = 'Weekly Progress Update';
      payload.description = (formData.get('summary') as string) || '';
      payload.progressSummary = formData.get('summary');
      payload.blockers = formData.get('blockers');
      payload.confidenceLevel = Number(formData.get('confidence'));
      payload.completionPercent = Number(formData.get('completion'));
    } else if (type === 'FEEDBACK') {
      payload.title = 'Stakeholder Feedback';
      payload.description = `Satisfaction: ${formData.get('satisfaction')}/5. Comments: ${formData.get('comments')}`;
      payload.satisfactionRating = Number(formData.get('satisfaction'));
      payload.clarityRating = Number(formData.get('clarity'));
      payload.flagIssue = formData.get('flagIssue') === 'on';
      payload.comments = formData.get('comments');
    } else if (type === 'RISK') {
      payload.title = formData.get('title') as string;
      payload.description = `Severity: ${formData.get('severity')}. Mitigation: ${formData.get('mitigation')}`;
      payload.severity = formData.get('severity');
      payload.mitigation = formData.get('mitigation');
    }

    try {
      if (type === 'CHECKIN') {
        await api.createCheckinWithFile(
          projectId,
          payload,
          fileRef.current?.files?.[0] || null
        );
        if (fileRef.current) fileRef.current.value = "";
      } else {
        await api.createEvent(projectId, payload);
      }

      const [newProj, newEvents] = await Promise.all([
        api.getProject(projectId),
        api.getEvents(projectId)
      ]);
      setProject(newProj);
      setEvents(newEvents);
      setShowCheckinForm(false);
      setShowFeedbackForm(false);
      setShowRiskForm(false);
      onUpdate();

    } catch (err: any) {
      const errorMessage = err.message || "Failed to submit update";
      if (errorMessage.includes("Weekly check-in already submitted")) {
        alert("You've already submitted a weekly check-in this week. Please try again next week.");
      } else {
        alert(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const mitigation = (formData.get('mitigation') as string) || '';
    setSubmitting(true);
    try {
      const payload = mitigation.trim() ? { mitigation: mitigation.trim() } : {};
      await api.resolveRisk(projectId, selectedRisk._id, payload);
      const [newProj, newEvents] = await Promise.all([
        api.getProject(projectId),
        api.getEvents(projectId)
      ]);
      setProject(newProj);
      setEvents(newEvents);
      setShowResolveModal(false);
      setSelectedRisk(null);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve risk');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in slide-in-from-bottom-4 duration-500">
      {/* === Top Section & Tabs === */}
      {/* ... Your UI here unchanged ... */}

      {/* === MODALS === */}
      {showCheckinForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Weekly Update</h3>
            <form onSubmit={(e) => handleAction(e, 'CHECKIN')} className="space-y-6">
              <textarea name="summary" className="w-full p-4 bg-slate-50 border rounded-2xl h-24" placeholder="Progress summary..." required />
              <textarea name="blockers" className="w-full p-4 bg-slate-50 border rounded-2xl h-20" placeholder="Blockers or challenges..." />
              <div className="grid grid-cols-2 gap-4">
                <select name="confidence" className="w-full p-3 bg-slate-50 border rounded-xl" required>
                  <option value="5">Confidence: 5</option>
                  <option value="4">Confidence: 4</option>
                  <option value="3">Confidence: 3</option>
                  <option value="2">Confidence: 2</option>
                  <option value="1">Confidence: 1</option>
                </select>
                <input name="completion" type="number" min="0" max="100" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Estimated completion %" required />
                <div className="mt-3 col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Attach Supporting Document (PDF/DOC max 2MB)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="w-full text-sm border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCheckinForm(false)} className="flex-1 py-4 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl transition-all">
                  {submitting ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRiskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Report Risk</h3>
            <form onSubmit={(e) => handleAction(e, 'RISK')} className="space-y-6">
              <input name="title" type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Risk title" required />
              <select name="severity" className="w-full p-3 bg-slate-50 border rounded-xl" required>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <textarea name="mitigation" className="w-full p-4 bg-slate-50 border rounded-2xl h-24" placeholder="Mitigation plan..." />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowRiskForm(false)} className="flex-1 py-4 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold rounded-2xl transition-all">
                  {submitting ? 'Submitting...' : 'Submit Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeedbackForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Stakeholder Feedback</h3>
            <form onSubmit={(e) => handleAction(e, 'FEEDBACK')} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <select name="satisfaction" className="w-full p-3 bg-slate-50 border rounded-xl" required>
                  <option value="5">Satisfaction: 5</option>
                  <option value="4">Satisfaction: 4</option>
                  <option value="3">Satisfaction: 3</option>
                  <option value="2">Satisfaction: 2</option>
                  <option value="1">Satisfaction: 1</option>
                </select>
                <select name="clarity" className="w-full p-3 bg-slate-50 border rounded-xl" required>
                  <option value="5">Clarity: 5</option>
                  <option value="4">Clarity: 4</option>
                  <option value="3">Clarity: 3</option>
                  <option value="2">Clarity: 2</option>
                  <option value="1">Clarity: 1</option>
                </select>
              </div>
              <textarea name="comments" className="w-full p-4 bg-slate-50 border rounded-2xl" placeholder="Your comments..." />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="flagIssue" className="w-4 h-4" />
                Flag issue
              </label>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowFeedbackForm(false)} className="flex-1 py-4 font-bold text-slate-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl transition-all">
                  {submitting ? 'Submitting...' : 'Post Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResolveModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-4">Resolve Risk</h3>
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
              <p className="text-sm font-bold text-slate-900 mb-2">{selectedRisk.title}</p>
              <p className="text-xs text-slate-600">{selectedRisk.description}</p>
            </div>
            <form onSubmit={handleResolveRisk} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Resolution Notes / Updated Mitigation</label>
                <textarea 
                  name="mitigation" 
                  className="w-full p-4 bg-slate-50 border rounded-2xl h-32" 
                  placeholder="Describe how this risk was resolved or add updated mitigation details..."
                  defaultValue={selectedRisk.mitigation || ''}
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedRisk(null);
                  }} 
                  className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl transition-all"
                >
                  {submitting ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
