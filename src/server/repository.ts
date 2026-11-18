import fs from 'fs';
import path from 'path';
import { createInitialSeedData } from '../shared/seedData';
import {
  AIConversation,
  AIReport,
  AuditLog,
  CareCase,
  CheckInReviewStatus,
  ConsentRecord,
  DailyCheckIn,
  DatabaseSchema,
  DoctorProfile,
  FollowUpTask,
  FollowUpTaskStatus,
  MedicationEvent,
  MedicationPlan,
  MedicationReportedStatus,
  NotificationItem,
  Organization,
  Patient,
  SpecialtyTemplate,
  UserAccount,
} from '../shared/types';

export interface IDataRepository {
  getRawState(): DatabaseSchema;
  saveState(state: DatabaseSchema): void;
  resetDemoState(): DatabaseSchema;
  getEffectiveNowIso(): string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'demo-db.json');

export function toTashkentIso(date: Date = new Date()): string {
  // Shift to UTC+05:00 (Asia/Tashkent)
  const tashkentMs = date.getTime() + 5 * 60 * 60 * 1000;
  const d = new Date(tashkentMs);
  const iso = d.toISOString().replace('Z', '+05:00');
  return iso;
}

export class SyntheticDemoRepository implements IDataRepository {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = createInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      this.cache = seed;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        let needsSave = false;
        if (!Array.isArray(parsed.conversations) || !Array.isArray(parsed.messages)) {
          const seed = createInitialSeedData();
          if (!Array.isArray(parsed.conversations)) {
            parsed.conversations = seed.conversations;
          }
          if (!Array.isArray(parsed.messages)) {
            parsed.messages = seed.messages;
          }
          needsSave = true;
        }
        for (const conv of parsed.conversations) {
          if (typeof conv.patientCanSend !== 'boolean') {
            conv.patientCanSend = false;
            needsSave = true;
          }
          if (!conv.status) {
            conv.status = 'Faol';
            needsSave = true;
          }
        }
        this.cache = parsed;
        if (needsSave) {
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
      } catch {
        const seed = createInitialSeedData();
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
        this.cache = seed;
      }
    }
  }

  public getRawState(): DatabaseSchema {
    if (!this.cache) {
      this.ensureInitialized();
    }
    this.evaluateOverdueTasks(this.cache!);
    return this.cache!;
  }

  public saveState(state: DatabaseSchema): void {
    this.cache = state;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  public resetDemoState(): DatabaseSchema {
    const fresh = createInitialSeedData();
    fresh.demoMeta.lastResetAt = toTashkentIso(new Date());
    this.saveState(fresh);
    return fresh;
  }

  public getEffectiveNowIso(): string {
    const state = this.getRawState();
    const offsetMs = (state.demoMeta?.simulatedOffsetMinutes || 0) * 60 * 1000;
    return toTashkentIso(new Date(Date.now() + offsetMs));
  }

  private evaluateOverdueTasks(state: DatabaseSchema) {
    const offsetMs = (state.demoMeta?.simulatedOffsetMinutes || 0) * 60 * 1000;
    const nowMs = Date.now() + offsetMs;
    let changed = false;

    for (const task of state.followUpTasks) {
      if (
        task.status !== 'Bajarildi' &&
        task.status !== 'Muddati o‘tgan' &&
        task.status !== 'Biriktirilmagan'
      ) {
        const dueMs = new Date(task.dueAt).getTime();
        if (!isNaN(dueMs) && nowMs > dueMs) {
          task.status = 'Muddati o‘tgan';
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveState(state);
    }
  }
}

export const repo = new SyntheticDemoRepository();

/**
 * Multi-tenant Organization & Role-based Access Control helper.
 * Enforces that a user belonging to Clinic A cannot access Clinic B's private patient records.
 */
export function canActorAccessPatient(
  actor: UserAccount,
  patient: Patient,
  state: DatabaseSchema
): { allowed: boolean; reason?: string } {
  if (actor.role === 'SUPER_ADMIN') {
    // Super admin manages organizations and operational metrics, not private clinical records by default
    return {
      allowed: false,
      reason:
        'Platforma Super Admini klinik ruxsatsiz bemorlarning shaxsiy tibbiy yozuvlarini to‘g‘ridan-to‘g‘ri ko‘ra olmaydi (Maxfiylik siyosati).',
    };
  }

  if (actor.role === 'PATIENT' || actor.role === 'CAREGIVER') {
    if (actor.linkedPatientId === patient.id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Bemor yoki qarindosh faqat o‘ziga tegishli profil ma’lumotlarini ko‘rishi mumkin.',
    };
  }

  // Direct organization membership check
  if (actor.organizationMemberships.includes(patient.organizationId)) {
    return { allowed: true };
  }

  // Territorial family doctor cross-organization discharge handoff check
  if (actor.linkedDoctorId && patient.familyDoctorId === actor.linkedDoctorId) {
    return { allowed: true };
  }

  const hasAssignedTask = state.followUpTasks.some(
    (t) =>
      t.patientId === patient.id &&
      (t.assignedDoctorId === actor.linkedDoctorId ||
        actor.organizationMemberships.includes(t.targetOrganizationId))
  );

  if (hasAssignedTask) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Tashkilotlararo izolyatsiya qoidasi: Sizning hisobingiz (${actor.primaryOrganizationId}) ushbu bemor biriktirilgan tibbiyot muassasasiga (${patient.organizationId}) ruxsatga ega emas.`,
  };
}

export function getFilteredStateForActor(actorId: string): {
  actor: UserAccount;
  state: DatabaseSchema;
} {
  const raw = repo.getRawState();
  const actor = raw.users.find((u) => u.id === actorId) || raw.users[2]; // default Dr. Sardor Rahimov

  if (actor.role === 'SUPER_ADMIN') {
    // Super Admin sees organizations, users, audit logs, and anonymized/high-level counts,
    // while demo switching remains available
    return {
      actor,
      state: raw,
    };
  }

  const accessiblePatients = raw.patients.filter(
    (p) => canActorAccessPatient(actor, p, raw).allowed
  );
  const accessiblePatientIds = new Set(accessiblePatients.map((p) => p.id));

  const accessibleConversations = (raw.conversations || []).filter((c) =>
    accessiblePatientIds.has(c.patientId)
  );
  const accessibleConversationIds = new Set(accessibleConversations.map((c) => c.id));

  return {
    actor,
    state: {
      ...raw,
      patients: accessiblePatients,
      careCases: raw.careCases.filter((c) => accessiblePatientIds.has(c.patientId)),
      followUpTasks: raw.followUpTasks.filter(
        (t) =>
          accessiblePatientIds.has(t.patientId) ||
          actor.organizationMemberships.includes(t.organizationId) ||
          actor.organizationMemberships.includes(t.targetOrganizationId)
      ),
      medicationPlans: raw.medicationPlans.filter((m) =>
        accessiblePatientIds.has(m.patientId)
      ),
      medicationEvents: raw.medicationEvents.filter((e) =>
        accessiblePatientIds.has(e.patientId)
      ),
      dailyCheckIns: raw.dailyCheckIns.filter((d) =>
        accessiblePatientIds.has(d.patientId)
      ),
      aiConversations: raw.aiConversations.filter((a) =>
        accessiblePatientIds.has(a.patientId)
      ),
      aiReports: raw.aiReports.filter((r) => accessiblePatientIds.has(r.patientId)),
      consents: raw.consents.filter((c) => accessiblePatientIds.has(c.patientId)),
      conversations: accessibleConversations,
      messages: (raw.messages || []).filter((m) =>
        accessibleConversationIds.has(m.conversationId)
      ),
    },
  };
}

export function appendAuditLog(
  state: DatabaseSchema,
  entry: Omit<AuditLog, 'id' | 'timestamp'>
): AuditLog {
  const newLog: AuditLog = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: repo.getEffectiveNowIso(),
  };
  state.auditLogs.unshift(newLog);
  return newLog;
}

/**
 * Official Challenge #11: Automatic Post-Discharge Follow-Up Creation
 */
export function executePatientDischarge(params: {
  actorId: string;
  patientId: string;
  hospitalId: string;
  treatingDoctorId: string;
  dischargeInstructions: string;
  diagnosisOrProcedureSummary: string;
  district: string;
  familyDoctorId?: string;
  priority: 'Yuqori' | 'O‘rta' | 'Rejali';
  careType?: CareCase['careType'];
}): {
  careCase: CareCase;
  followUpTask: FollowUpTask;
  notification: NotificationItem;
} {
  const state = repo.getRawState();
  const actor = state.users.find((u) => u.id === params.actorId) || state.users[2];
  const patient = state.patients.find((p) => p.id === params.patientId);
  if (!patient) {
    throw new Error('Bemor topilmadi.');
  }

  const nowIso = repo.getEffectiveNowIso();
  const nowDate = new Date();
  const dueDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
  const dueIso = toTashkentIso(dueDate);

  // Resolve territorial family doctor from explicit choice or district mapping
  let matchedFamilyDoc: DoctorProfile | undefined;
  if (params.familyDoctorId && params.familyDoctorId !== 'NONE') {
    matchedFamilyDoc = state.doctorProfiles.find((d) => d.id === params.familyDoctorId);
  } else {
    matchedFamilyDoc = state.doctorProfiles.find(
      (d) =>
        d.specialty.toLowerCase().includes('oilaviy') &&
        d.districtCoverage?.some((dist) =>
          dist.toLowerCase().includes(params.district.toLowerCase())
        )
    );
  }

  patient.district = params.district || patient.district;
  patient.dischargeOrProcedureDate = nowIso;
  patient.familyDoctorId = matchedFamilyDoc?.id;
  patient.caseStatus = matchedFamilyDoc
    ? 'Oilaviy shifokor biriktirilgan'
    : 'Shifokor ko‘rishi kerak';

  const careCase: CareCase = {
    id: `case-${Date.now()}`,
    patientId: patient.id,
    organizationId: params.hospitalId || patient.organizationId,
    treatingDoctorId: params.treatingDoctorId || patient.treatingDoctorId,
    familyDoctorId: matchedFamilyDoc?.id,
    careType: params.careType || 'Shifoxonadan chiqarish (Challenge #11)',
    diagnosisOrProcedureSummary:
      params.diagnosisOrProcedureSummary || patient.careCaseType,
    dischargeInstructions: params.dischargeInstructions,
    priority: params.priority || 'Yuqori',
    dischargeAt: nowIso,
    followUpDeadlineAt: dueIso,
    nextAppointmentAt: toTashkentIso(
      new Date(nowDate.getTime() + 5 * 24 * 60 * 60 * 1000)
    ),
    caseStatus: patient.caseStatus,
    clinicalNotes: [
      {
        id: `note-${Date.now()}`,
        careCaseId: '',
        authorId: actor.id,
        authorName: actor.fullName,
        authorRole: 'Davolovchi shifokor',
        content: `Bemor statsionardan chiqarildi. Ko‘rsatma: ${params.dischargeInstructions}`,
        createdAt: nowIso,
      },
    ],
    startedAt: nowIso,
    isSynthetic: true,
  };
  careCase.clinicalNotes[0].careCaseId = careCase.id;
  state.careCases.unshift(careCase);

  const taskStatus: FollowUpTaskStatus = matchedFamilyDoc
    ? 'Yangi'
    : 'Biriktirilmagan';

  const followUpTask: FollowUpTask = {
    id: `task-${Date.now()}`,
    careCaseId: careCase.id,
    patientId: patient.id,
    organizationId: careCase.organizationId,
    targetOrganizationId: matchedFamilyDoc?.organizationId || 'org-fam-2',
    assignedDoctorId: matchedFamilyDoc?.id,
    createdByDoctorId: careCase.treatingDoctorId,
    priority: params.priority || 'Yuqori',
    taskType: '24 soatlik oilaviy shifokor kuzatuvi',
    createdAt: nowIso,
    dueAt: dueIso,
    status: taskStatus,
    notes: matchedFamilyDoc
      ? `Challenge #11 avtomatik topshiriq: Bemor ${patient.fullName} (${patient.district}) shifoxonadan chiqarildi. 24 soat ichida birinchi shifokor muloqotini o‘tkazing.`
      : `DIQQAT: ${patient.district} hududi bo‘yicha mas’ul oilaviy shifokor avtomatik aniqlanmadi. Ma’muriy biriktirish navbatiga qo‘yildi.`,
    isSynthetic: true,
  };
  state.followUpTasks.unshift(followUpTask);

  const notification: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientId: matchedFamilyDoc?.id || 'usr-admin-1',
    recipientName: matchedFamilyDoc?.fullName || 'Klinika Koordinatori',
    recipientPhone: matchedFamilyDoc?.phone || '+998 71 200 00 02',
    patientId: patient.id,
    organizationId: matchedFamilyDoc?.organizationId || 'org-fam-2',
    channel: 'SMS (Simulyatsiya)',
    notificationType: 'Shifokor kuzatuv topshirig‘i',
    message: matchedFamilyDoc
      ? `Carely [Demo]: Hurmatli ${matchedFamilyDoc.fullName}, sizga yangi 24 soatlik chiqarishdan keyingi kuzatuv topshirig‘i (${patient.fullName}, ${patient.district}) biriktirildi.`
      : `Carely [Demo]: Bemor ${patient.fullName} uchun hududiy oilaviy shifokor biriktirilishi talab etiladi.`,
    status: 'Yetkazildi (Simulyatsiya)',
    isSimulation: true,
    createdAt: nowIso,
    deliveredAt: nowIso,
  };
  state.notifications.unshift(notification);

  appendAuditLog(state, {
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    organizationId: careCase.organizationId,
    patientId: patient.id,
    action: 'Bemorni uyga chiqarish va 24 soatlik oilaviy shifokor topshirig‘i yaratildi',
    details: `${patient.fullName} chiqarildi. Topshiriq holati: ${taskStatus}. Mas’ul: ${
      matchedFamilyDoc?.fullName || 'Biriktirilmagan (Navbatda)'
    }`,
    entityType: 'FOLLOW_UP_TASK',
    entityId: followUpTask.id,
  });

  repo.saveState(state);
  return { careCase, followUpTask, notification };
}
