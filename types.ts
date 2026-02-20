
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT'
}

export enum ProjectStatus {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
  COMPLETED = 'COMPLETED'
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum RiskStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for safety, but required for login logic
  role: UserRole;
  avatar: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  employeeIds: string[];
  startDate: string;
  endDate: string;
  progress: number; // 0-100
  status: ProjectStatus;
  healthScore: number; // 0-100
}

export interface WeeklyCheckIn {
  id: string;
  projectId: string;
  employeeId: string;
  summary: string;
  blockers: string;
  confidence: number; // 1-5
  progressEstimate: number; // 0-100
  timestamp: string;
  attachment?: string;
}

export interface ClientFeedback {
  id: string;
  projectId: string;
  clientId: string;
  satisfaction: number; // 1-5
  clarity: number; // 1-5
  comments: string;
  flagIssue: boolean;
  timestamp: string;
}

export interface RiskItem {
  id: string;
  projectId: string;
  reportedById: string;
  title: string;
  severity: RiskSeverity;
  mitigationPlan: string;
  status: RiskStatus;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  type: 'CHECKIN' | 'FEEDBACK' | 'RISK' | 'STATUS_CHANGE';
  projectId: string;
  userId: string;
  title: string;
  description: string;
  timestamp: string;
  attachment?: string;
}

