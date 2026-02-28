
import { useState, useEffect } from 'react';
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
      <p>Synchronizing with Cloud DB...</p>
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
      const rawAttachment = (formData.get('attachmentLink') as string) || '';
      const normalizedAttachment = rawAttachment.trim();
      payload.title = 'Weekly Progress Update';
      payload.description = (formData.get('summary') as string) || '';
      payload.progressSummary = formData.get('summary');
      payload.blockers = formData.get('blockers');
      payload.confidenceLevel = Number(formData.get('confidence'));
      payload.completionPercent = Number(formData.get('completion'));
      payload.attachmentLink = normalizedAttachment || null;
      payload.attachmentUrl = normalizedAttachment || null;
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
      await api.createEvent(projectId, payload);
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
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Return to Dashboard
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl ${
            project.healthScore >= 80 ? 'bg-emerald-500' :
            project.healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
          }`}>
            {Math.round(project.healthScore)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 ${
                project.status === 'ON_TRACK' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                project.status === 'AT_RISK' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-500 mt-1 max-w-xl line-clamp-2">{project.description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {isEmployee && (
            <button onClick={() => setShowCheckinForm(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all">
              <Plus size={20} /> New Check-in
            </button>
          )}
          {isClient && (
            <button onClick={() => setShowFeedbackForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all">
              <MessageSquare size={20} /> Submit Feedback
            </button>
          )}
          {isEmployee && (
            <button onClick={() => setShowRiskForm(true)} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all">
              <Flag size={20} /> Report Risk
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: TrendingUp, label: 'Performance' },
          { id: 'checkins', icon: History, label: 'Weekly Updates' },
          { id: 'feedback', icon: MessageSquare, label: 'Client Voices' },
          { id: 'risks', icon: AlertCircle, label: `Risks (${openRisks.length})` },
          { id: 'logs', icon: ClipboardList, label: 'Activity Logs' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 text-slate-400 mb-4"><Calendar size={18} /><span className="text-xs font-bold uppercase tracking-widest">Active Phase</span></div>
                  <p className="text-sm font-semibold text-slate-500">Project Cycle</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 text-slate-400 mb-4"><TrendingUp size={18} /><span className="text-xs font-bold uppercase tracking-widest">Overall Completion</span></div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end"><span className="text-2xl font-black text-slate-900">{project.progress}%</span></div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${project.progress}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Latest Summary</h3>
                {projectCheckins.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed italic">"{projectCheckins[0].description}"</p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Reporter:</span>
                       <span className="text-[10px] font-bold text-slate-700">{projectCheckins[0].userId?.name}</span>
                    </div>
                  </div>
                ) : <p className="text-slate-400 italic">No delivery logs found.</p>}
              </div>
            </div>
          )}

          {activeTab === 'checkins' && (
            <div className="space-y-4">
              {projectCheckins.length === 0 && (
                <p className="text-slate-400 italic">No weekly updates yet.</p>
              )}
              {projectCheckins.map((checkin) => {
                const attachmentHref = checkin.attachmentLink || checkin.attachmentUrl || checkin.attachment;
                return (
                <div key={checkin._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Weekly Update</p>
                      <h4 className="text-lg font-bold text-slate-900">{checkin.title}</h4>
                      <p className="text-sm text-slate-600 mt-2">{checkin.description}</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(checkin.timestamp).toLocaleDateString()}<br/>
                      {checkin.userId?.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
                    <div><span className="font-bold text-slate-900">Completion:</span> {checkin.completionPercent ?? 0}%</div>
                    <div><span className="font-bold text-slate-900">Confidence:</span> {checkin.confidenceLevel ?? '-'} /5</div>
                    <div><span className="font-bold text-slate-900">Blockers:</span> {checkin.blockers || 'None'}</div>
                  </div>
                  {checkin.progressSummary && (
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Summary:</span> {checkin.progressSummary}</p>
                  )}
                  {attachmentHref && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-slate-900">Attachment:</span>
                      <a href={attachmentHref} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1">
                        <ClipboardList size={14} />
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {projectFeedbacks.length === 0 && riskResolutions.length === 0 && (
                <p className="text-slate-400 italic">No client feedback or risk resolutions yet.</p>
              )}
              {projectFeedbacks.map((fb) => (
                <div key={fb._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Client Feedback</p>
                      <h4 className="text-lg font-bold text-slate-900">{fb.title}</h4>
                      <p className="text-sm text-slate-600 mt-2">{fb.comments || fb.description}</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(fb.timestamp).toLocaleDateString()}<br/>
                      {fb.userId?.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
                    <div><span className="font-bold text-slate-900">Satisfaction:</span> {fb.satisfactionRating ?? '-'} /5</div>
                    <div><span className="font-bold text-slate-900">Clarity:</span> {fb.clarityRating ?? '-'} /5</div>
                    <div><span className="font-bold text-slate-900">Flagged:</span> {fb.flagIssue ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              ))}
              {riskResolutions.map((resolution) => (
                <div key={resolution._id} className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-600">Risk Resolution Update</p>
                      <h4 className="text-lg font-bold text-slate-900">{resolution.title}</h4>
                      <p className="text-sm text-slate-600 mt-2">{resolution.description}</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(resolution.timestamp).toLocaleDateString()}<br/>
                      {resolution.userId?.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="space-y-4">
              {projectRisks.length === 0 && (
                <p className="text-slate-400 italic">No risks reported.</p>
              )}
              {projectRisks.map((risk) => (
                <div key={risk._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase text-rose-500">Risk</p>
                      <h4 className="text-lg font-bold text-slate-900">{risk.title}</h4>
                      <p className="text-sm text-slate-600 mt-2">{risk.description}</p>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(risk.timestamp).toLocaleDateString()}<br/>
                      {risk.userId?.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
                    <div><span className="font-bold text-slate-900">Severity:</span> {risk.severity || '-'}</div>
                    <div><span className="font-bold text-slate-900">Status:</span> {risk.riskStatus || 'OPEN'}</div>
                    <div><span className="font-bold text-slate-900">Mitigation:</span> {risk.mitigation || 'N/A'}</div>
                  </div>
                  {isEmployee && risk.riskStatus !== 'RESOLVED' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedRisk(risk);
                          setShowResolveModal(true);
                        }}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white transition-colors"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
               <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {events.map(event => (
                  <div key={event._id} className="relative pl-12">
                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-xl border-4 border-white shadow-md flex items-center justify-center bg-slate-900 text-white`}>
                      <Check size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{event.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{event.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{new Date(event.timestamp).toLocaleString()} • {event.userId?.name}</p>
                    </div>
                  </div>
                ))}
               </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Key Stakeholders</h3>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Project Client</p>
                <p className="text-sm font-bold text-slate-900">{project.clientId?.name}</p>
              </div>
              <div className="h-[1px] bg-slate-100"></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Delivery Team</p>
                {project.employeeIds?.map((emp: any) => (
                  <p key={emp._id} className="text-sm font-bold text-slate-900 mb-1">{emp.name}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showCheckinForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Weekly Update</h3>
            <form onSubmit={(e) => handleAction(e, 'CHECKIN')} className="space-y-6">
              <textarea name="summary" className="w-full p-4 bg-slate-50 border rounded-2xl h-24" placeholder="Progress summary..." required />
              <textarea name="blockers" className="w-full p-4 bg-slate-50 border rounded-2xl h-20" placeholder="Blockers or challenges..." />
              <input name="attachmentLink" type="url" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Attachment link (PDF/DOC) - Optional" />
              <div className="grid grid-cols-2 gap-4">
                <select name="confidence" className="w-full p-3 bg-slate-50 border rounded-xl" required>
                  <option value="5">Confidence: 5</option>
                  <option value="4">Confidence: 4</option>
                  <option value="3">Confidence: 3</option>
                  <option value="2">Confidence: 2</option>
                  <option value="1">Confidence: 1</option>
                </select>
                <input name="completion" type="number" min="0" max="100" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Estimated completion %" required />
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