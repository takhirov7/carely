export type UserRole =
  | 'SUPER_ADMIN'
  | 'CLINIC_ADMIN'
  | 'TREATING_DOCTOR'
  | 'FAMILY_DOCTOR'
  | 'NURSE'
  | 'PATIENT'
  | 'CAREGIVER';

export type ClinicType =
  | 'Umumiy shifoxona'
  | 'Xususiy klinika'
  | 'Stomatologiya klinikasi'
  | 'Jarrohlik klinikasi'
  | 'Kardiologiya klinikasi'
  | 'Ixtisoslashgan klinika';

export type SubscriptionPlanId = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type FollowUpTaskStatus =
  | 'Yangi'
  | 'Qabul qilindi'
  | 'Jarayonda'
  | 'Bajarildi'
  | 'Muddati o‘tgan'
  | 'Qayta biriktirish kerak'
  | 'Biriktirilmagan';

export type CaseStatus =
  | 'Aktiv kuzatuvda'
  | 'Shifokor ko‘rishi kerak'
  | 'Oilaviy shifokor biriktirilgan'
  | 'Yakunlangan'
  | 'Arxivlangan';

export type MedicationReportedStatus =
  | 'Ichdim'
  | 'Keyinroq'
  | 'O‘tkazib yubordim'
  | 'Tasdiqlanmagan';

export type CheckInReviewStatus =
  | 'Kutilmoqda'
  | 'Javob berildi'
  | 'Tasdiqlanmagan'
  | 'Shifokor ko‘rishi kerak';

export interface UserAccount {
  id: string;
  authUid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  organizationMemberships: string[];
  primaryOrganizationId: string;
  linkedPatientId?: string;
  linkedDoctorId?: string;
  avatarUrl: string;
  status: 'Faol' | 'Nofaol' | 'Taklif yuborilgan';
  languagePreference: 'uz' | 'ru' | 'en';
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: ClinicType;
  region: string;
  district: string;
  address: string;
  contact: {
    phone: string;
    email: string;
  };
  description: string;
  departments: string[];
  operatingHours: string;
  subscriptionPlan: SubscriptionPlanId;
  status: 'Faol' | 'Tasdiqlash kutilmoqda' | 'Vaqtincha to‘xtatilgan';
  notificationConfig: {
    smsEnabled: boolean;
    aiVoiceEnabled: boolean;
    escalationMinutes: number;
    defaultQuietHours: string;
  };
  createdAt: string;
  isSynthetic: boolean;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  organizationId: string;
  specialty: string;
  department: string;
  professionalTitle: string;
  licenseIdentifier: string;
  yearsOfExperience: number;
  biography: string;
  phone: string;
  workEmail: string;
  workSchedule: string;
  districtCoverage?: string[];
  status: 'Faol' | 'Ta’tilda' | 'Nofaol';
  createdAt: string;
  isSynthetic: boolean;
}

export interface Patient {
  id: string;
  organizationId: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  sex: 'Erkak' | 'Ayol';
  contact: string;
  region: string;
  district: string;
  treatingDoctorId: string;
  familyDoctorId?: string;
  careCaseType: string;
  specialtyCategory: 'Umumiy tibbiyot' | 'Jarrohlik' | 'Kardiologiya' | 'Stomatologiya';
  dischargeOrProcedureDate: string;
  caseStatus: CaseStatus;
  consentStatus: {
    smsReminders: boolean;
    aiVoiceCalls: boolean;
    caregiverSharing: boolean;
    caregiverName?: string;
    caregiverPhone?: string;
    quietHours: string;
  };
  createdAt: string;
  isSynthetic: boolean;
  recoveryPlan?: RecoveryPlan;
}

export interface RecoveryPlan {
  id: string;
  templateType: 'Jarrohlik' | 'Stomatologiya' | 'Umumiy tibbiyot';
  title: string;
  durationDays: number;
  checkInQuestions: string[];
  painThreshold: number;
  flagAnyNewComplaint: boolean;
  flagDoctorContactRequest: boolean;
  instructions: string;
  active: boolean;
  activatedAt: string;
  activatedByDoctorName: string;
}

export interface ClinicalNote {
  id: string;
  careCaseId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface CareCase {
  id: string;
  patientId: string;
  organizationId: string;
  treatingDoctorId: string;
  familyDoctorId?: string;
  careType: 'Shifoxonadan chiqarish (Challenge #11)' | 'Muolajadan keyingi kuzatuv' | 'Uzoq muddatli dori nazorati' | 'Stomatologik kuzatuv';
  diagnosisOrProcedureSummary: string;
  dischargeInstructions: string;
  priority: 'Yuqori' | 'O‘rta' | 'Rejali';
  dischargeAt: string;
  followUpDeadlineAt: string;
  nextAppointmentAt?: string;
  caseStatus: CaseStatus;
  clinicalNotes: ClinicalNote[];
  recoveryPlan?: RecoveryPlan;
  startedAt: string;
  endedAt?: string;
  isSynthetic: boolean;
}

export interface FollowUpTask {
  id: string;
  careCaseId: string;
  patientId: string;
  organizationId: string;
  targetOrganizationId: string;
  assignedDoctorId?: string;
  createdByDoctorId: string;
  priority: 'Yuqori' | 'O‘rta' | 'Rejali';
  taskType: '24 soatlik oilaviy shifokor kuzatuvi' | 'Rejali shifokor ko‘rigi' | 'Shoshilinch murojaat tekshiruvi';
  sourceCheckInId?: string;
  createdAt: string;
  dueAt: string;
  acceptedAt?: string;
  completedAt?: string;
  contactMethod?: 'Telefon muloqoti' | 'Video konsultatsiya' | 'Uyga tashrif' | 'Klinikada qabul';
  status: FollowUpTaskStatus;
  notes: string;
  isSynthetic: boolean;
}

export interface MedicationPlan {
  id: string;
  careCaseId: string;
  patientId: string;
  organizationId: string;
  approvedByDoctorId: string;
  medicationName: string;
  strength: string;
  form: 'Tabletka' | 'Kapsula' | 'Eritma' | 'Sprey';
  prescribedDose: string;
  frequency: string;
  dosageInstructions: string;
  scheduledTimes: string[];
  startDate: string;
  endDate: string;
  status: 'Faol' | 'Yakunlangan' | 'To‘xtatilgan';
  isSynthetic: boolean;
}

export interface MedicationEvent {
  id: string;
  medicationPlanId: string;
  patientId: string;
  organizationId: string;
  medicationName: string;
  scheduledTimeLabel: string;
  scheduledAt: string;
  respondedAt?: string;
  reportedStatus: MedicationReportedStatus;
  notificationStatus: 'Yuborildi (Simulyatsiya)' | 'Kutilmoqda' | 'Qayta eslatildi';
  patientNote?: string;
  isSynthetic: boolean;
}

export interface DailyCheckIn {
  id: string;
  careCaseId: string;
  patientId: string;
  organizationId: string;
  scheduledAt: string;
  submittedAt: string;
  overallFeeling: 'Yaxshi' | 'O‘rtacha' | 'Bezovtalik bor' | 'Og‘riq kuchaygan';
  painScore: number; // 0 to 10
  reportedSymptoms: string;
  temperatureC?: number;
  bloodPressure?: string;
  requestedDoctorContact: boolean;
  reviewStatus: CheckInReviewStatus;
  reviewedByDoctorId?: string;
  doctorReviewNote?: string;
  isSynthetic: boolean;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  patientId?: string;
  organizationId: string;
  channel: 'SMS (Simulyatsiya)' | 'Ilova ichida' | 'AI Ovozli qo‘ng‘iroq (Simulyatsiya)';
  notificationType:
    | 'Dori eslatmasi'
    | 'Uchrashuv eslatmasi'
    | 'Kunlik holat so‘rovi'
    | 'Shifokor kuzatuv topshirig‘i'
    | 'Bemor shifokor aloqasini so‘radi'
    | 'Muddati o‘tgan kuzatuv ogohlantirishi'
    | 'AI ovozli muloqot xabarnomasi';
  message: string;
  status: 'Yetkazildi (Simulyatsiya)' | 'O‘qildi' | 'Javob kutilmoqda';
  isSimulation: boolean;
  createdAt: string;
  deliveredAt: string;
}

export interface TranscriptMessage {
  speaker: 'AI' | 'PATIENT';
  text: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  careCaseId: string;
  patientId: string;
  organizationId: string;
  conversationType: 'Dori qabulini tasdiqlash' | 'Kunlik holat so‘rovi' | 'Chiqarishdan keyingi 24s muloqot';
  transcript: TranscriptMessage[];
  structuredSummary: {
    medicationConfirmed: 'Ha (bemor tasdiqladi)' | 'Yo‘q / Keyinroq' | 'So‘ralmadi';
    reportedSymptoms: string;
    painLevelMentioned: number | null;
    requestedDoctorCallback: boolean;
    requiresClinicianReview: boolean;
    summaryUz: string;
  };
  isSimulation: boolean;
  createdAt: string;
}

export interface AIReport {
  id: string;
  careCaseId: string;
  patientId: string;
  organizationId: string;
  generatedBy: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    reportingPeriod: string;
    medicationConfirmationSummary: string;
    dailyCheckInResponses: string;
    painScoreTrend: string;
    newReportedComplaints: string;
    followUpAppointmentStatus: string;
    unansweredNotifications: string;
    requestsForDoctorContact: string;
    itemsRequiringManualReview: string[];
    doctorEditableNotes: string;
  };
  sourceEventIds: string[];
  clinicianReviewStatus: 'Loyiha — shifokor tekshirishi kerak' | 'Shifokor tomonidan tasdiqlangan';
  reviewedByDoctorName?: string;
  reviewedAt?: string;
  createdAt: string;
  isSynthetic: boolean;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  organizationId: string;
  consentType: 'SMS xabarnomalar' | 'AI virtual yordamchi qo‘ng‘irog‘i' | 'Yaqin qarindosh (Caregiver) ulashuvi' | 'Oilaviy poliklinika ma’lumot almashinuvi';
  grantedAt: string;
  withdrawnAt?: string;
  scope: string;
  active: boolean;
}

export interface SpecialtyTemplate {
  id: string;
  organizationId: string;
  specialty: 'Stomatologiya' | 'Jarrohlik' | 'Kardiologiya' | 'Umumiy tibbiyot';
  title: string;
  durationDays: number;
  reminderSchedule: string;
  approvedQuestions: string[];
  followUpAppointments: string;
  patientInstructions: string;
  escalationInstructions: string;
  clinicianApprovedBy: string;
}

export interface ChatConversation {
  id: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
  patientCanSend: boolean; // Default: false — only doctor can enable
  status: 'Faol' | 'Yopilgan';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  patientId: string;
  doctorId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  createdAt: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  organizationId: string;
  patientId?: string;
  action: string;
  details: string;
  entityType: 'PATIENT' | 'CARE_CASE' | 'FOLLOW_UP_TASK' | 'MEDICATION' | 'CHECK_IN' | 'NOTIFICATION' | 'AI_CONVERSATION' | 'AI_REPORT' | 'DOCTOR_PROFILE' | 'ORGANIZATION' | 'SECURITY' | 'CHAT';
  entityId: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: UserAccount[];
  organizations: Organization[];
  doctorProfiles: DoctorProfile[];
  patients: Patient[];
  careCases: CareCase[];
  followUpTasks: FollowUpTask[];
  medicationPlans: MedicationPlan[];
  medicationEvents: MedicationEvent[];
  dailyCheckIns: DailyCheckIn[];
  notifications: NotificationItem[];
  aiConversations: AIConversation[];
  aiReports: AIReport[];
  consents: ConsentRecord[];
  templates: SpecialtyTemplate[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  auditLogs: AuditLog[];
  demoMeta: {
    simulatedOffsetMinutes: number;
    currentDemoStep: number;
    featuredDemoPatientId: string;
    lastResetAt: string;
  };
}

