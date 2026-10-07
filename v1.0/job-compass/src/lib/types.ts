// ===== 求职罗盘 V1.0 类型定义 =====

// 投递状态
export enum ApplicationStatus {
  PENDING = 1,      // 待投递
  APPLIED = 2,      // 已投递
  ASSESSMENT = 3,   // 测评/笔试
  INTERVIEW = 4,    // 面试中
  OFFER = 5,        // Offer
  REJECTED = 6,     // 已被拒
  CLOSED = 7,       // 已终止
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: '待投递',
  [ApplicationStatus.APPLIED]: '已投递',
  [ApplicationStatus.ASSESSMENT]: '测评/笔试',
  [ApplicationStatus.INTERVIEW]: '面试中',
  [ApplicationStatus.OFFER]: 'Offer',
  [ApplicationStatus.REJECTED]: '已被拒',
  [ApplicationStatus.CLOSED]: '已终止',
};

export const STATUS_COLOR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: 'bg-gray-400',
  [ApplicationStatus.APPLIED]: 'bg-blue-500',
  [ApplicationStatus.ASSESSMENT]: 'bg-purple-500',
  [ApplicationStatus.INTERVIEW]: 'bg-orange-500',
  [ApplicationStatus.OFFER]: 'bg-green-500',
  [ApplicationStatus.REJECTED]: 'bg-red-500',
  [ApplicationStatus.CLOSED]: 'bg-gray-600',
};

export const STATUS_TEXT_COLOR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: 'text-gray-600',
  [ApplicationStatus.APPLIED]: 'text-blue-600',
  [ApplicationStatus.ASSESSMENT]: 'text-purple-600',
  [ApplicationStatus.INTERVIEW]: 'text-orange-600',
  [ApplicationStatus.OFFER]: 'text-green-600',
  [ApplicationStatus.REJECTED]: 'text-red-600',
  [ApplicationStatus.CLOSED]: 'text-gray-600',
};

export const STATUS_BORDER_COLOR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: 'border-gray-300',
  [ApplicationStatus.APPLIED]: 'border-blue-300',
  [ApplicationStatus.ASSESSMENT]: 'border-purple-300',
  [ApplicationStatus.INTERVIEW]: 'border-orange-300',
  [ApplicationStatus.OFFER]: 'border-green-300',
  [ApplicationStatus.REJECTED]: 'border-red-300',
  [ApplicationStatus.CLOSED]: 'border-gray-400',
};

// 状态流转记录
export interface StatusLog {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  remark?: string;
  createdAt: string;
}

// 日程类型
export enum ScheduleType {
  EXAM = 1,     // 笔试
  INTERVIEW = 2, // 面试
  DEADLINE = 3,  // 网申截止
  OTHER = 4,     // 其他
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleType, string> = {
  [ScheduleType.EXAM]: '笔试',
  [ScheduleType.INTERVIEW]: '面试',
  [ScheduleType.DEADLINE]: '网申截止',
  [ScheduleType.OTHER]: '其他',
};

export interface Schedule {
  id: string;
  applicationId: string;
  type: ScheduleType;
  scheduledAt: string; // ISO
  location?: string;
  remark?: string;
}

// 结构化 JD
export interface StructuredJd {
  company?: string;
  position?: string;
  cities?: string[];
  salary?: string;
  education?: string;
  experience?: string;
  responsibilities?: string[];
  hardRequirements?: string[];
  skills?: string[];
  bonusRequirements?: string[];
  keywords?: string[];
}

export const APPLICATION_CHANNELS = [
  '官网',
  'Boss直聘',
  '猎聘',
  '牛客',
  '实习僧',
  '内推',
  '脉脉',
  '其他',
] as const;

// 投递记录
export interface Application {
  id: string;
  userId: string;
  company: string;
  position: string;
  channel: string;
  applyDate: string; // YYYY-MM-DD
  referrer?: string;
  cities?: string[];
  salary?: string;
  jobUrl?: string;
  /** 允许为空：极速建档时可以先记下公司和岗位，JD 以后再补。 */
  jdRaw: string;
  jdStructured?: StructuredJd;
  resumeId?: string;
  status: ApplicationStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// 从简历抬头识别的姓名与联系方式。旧存档可能没有这一段。
export interface ResumeContact {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
}

// 简历结构化数据
export interface ResumeStructured {
  contact?: ResumeContact;
  education?: Array<{
    school: string;
    major: string;
    degree: string;
    start?: string;
    end?: string;
    description?: string;
  }>;
  experiences?: Array<{
    company: string;
    position: string;
    start?: string;
    end?: string;
    bullets: string[];
  }>;
  projects?: Array<{
    name: string;
    role?: string;
    description?: string;
    technologies?: string[];
  }>;
  skills?: string[];
  selfIntro?: string;
}

export type ResumeFileKind = 'docx' | 'pdf';

export type ResumeParseStatus = 'success' | 'partial' | 'error';

// 原件本体在 IndexedDB，这里只存可放进 localStorage 的元数据
export interface ResumeSourceFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: ResumeFileKind;
  uploadedAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  name: string;
  isPrimary: boolean;
  structured: ResumeStructured;
  originalText?: string;
  sourceFile?: ResumeSourceFile;
  parseStatus?: ResumeParseStatus;
  parseMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// 匹配状态
export type MatchStatus = 'matched' | 'partial' | 'missing';

// 匹配要求项
export interface MatchRequirement {
  category: 'hard' | 'responsibility' | 'skill' | 'bonus';
  text: string;
  jdQuote: string;
  matchStatus: MatchStatus;
  resumeQuote?: string;
  suggestion?: string;
}

// 匹配报告
export interface MatchReport {
  id: string;
  applicationId: string;
  resumeId: string;
  score: number;
  summary: string;
  requirements: MatchRequirement[];
  gapSuggestions: Array<{
    type: 'project' | 'skill' | 'resume' | 'direction';
    text: string;
  }>;
  resumeOptimizations: Array<{
    location: string;
    current?: string;
    suggested: string;
    reason: string;
  }>;
  createdAt: string;
  outdated?: boolean; // 岗位信息/JD 在报告生成后被修改
}

// 复盘
export interface Review {
  id: string;
  applicationId: string;
  interviewRound?: number;
  questions?: string;
  selfEvaluation?: number; // 1很好 2一般 3不好
  rejectReasons?: string[];
  hrFeedback?: string;
  summary?: string;
  updatedAt: string;
}

// 通知
export interface Notification {
  id: string;
  userId: string;
  applicationId?: string;
  type: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// 用户档案
export interface UserProfile {
  nickname?: string;
  school: string;
  major: string;
  degree: number; // 1大专 2本科 3硕士 4博士
  graduationYear: number;
  targetDirections: string[];
  expectedCities?: string[];
  jobStage: number; // 1实习 2秋招 3春招 4社招
}

// 周复盘
export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  dataOverview: {
    newApplications: number;
    statusChanges: number;
    funnel: Record<string, number>;
  };
  diagnosis?: string;
  resumeSuggestions?: string[];
  directionSuggestions?: string[];
  actionItems?: string[];
  createdAt: string;
}

// 漏斗数据
export interface FunnelData {
  total: number;
  applied: number;
  assessment: number;
  interview: number;
  offer: number;
  assessmentRate: number;
  interviewRate: number;
  offerRate: number;
}
