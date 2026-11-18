import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateAiVoiceTurn, generatePatientAiReport } from './src/server/aiService';
import {
  appendAuditLog,
  canActorAccessPatient,
  executePatientDischarge,
  getFilteredStateForActor,
  repo,
  toTashkentIso,
} from './src/server/repository';
import {
  AIConversation,
  AIReport,
  ChatConversation,
  ChatMessage,
  CheckInReviewStatus,
  DailyCheckIn,
  DoctorProfile,
  FollowUpTask,
  FollowUpTaskStatus,
  MedicationEvent,
  MedicationPlan,
  MedicationReportedStatus,
  NotificationItem,
  Patient,
  RecoveryPlan,
  SpecialtyTemplate,
  UserAccount,
} from './src/shared/types';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. Get filtered multi-tenant state for active persona / user
  app.get('/api/state', (req, res) => {
    try {
      const actorId = (req.query.actorId as string) || 'usr-doc-1';
      const result = getFilteredStateForActor(actorId);
      res.json({
        ...result,
        effectiveNowIso: repo.getEffectiveNowIso(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server xatosi' });
    }
  });

  // 2. Test 9 — Backend Access Control Verification Endpoint
  app.get('/api/patients/:id', (req, res) => {
    const actorId = (req.query.actorId as string) || 'usr-doc-1';
    const raw = repo.getRawState();
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const patient = raw.patients.find((p) => p.id === req.params.id);

    if (!patient) {
      res.status(404).json({ error: 'Bemor topilmadi.' });
      return;
    }

    const access = canActorAccessPatient(actor, patient, raw);
    if (!access.allowed) {
      appendAuditLog(raw, {
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        organizationId: actor.primaryOrganizationId,
        patientId: patient.id,
        action: 'Ruxsatsiz kirish urinishi rad etildi (403 Forbidden)',
        details: access.reason || 'Tashkilotlararo izolyatsiya himoyasi ishladi.',
        entityType: 'SECURITY',
        entityId: patient.id,
      });
      repo.saveState(raw);
      res.status(403).json({
        error: 'Ruxsat rad etildi (403 Forbidden)',
        reason: access.reason,
        actorOrganization: actor.primaryOrganizationId,
        patientOrganization: patient.organizationId,
      });
      return;
    }

    res.json({ patient });
  });

  // 3. Test 1 — Update Doctor Profile persistently
  app.patch('/api/doctors/:id', (req, res) => {
    const raw = repo.getRawState();
    const docProfile = raw.doctorProfiles.find((d) => d.id === req.params.id);
    if (!docProfile) {
      res.status(404).json({ error: 'Shifokor profili topilmadi.' });
      return;
    }

    const {
      fullName,
      specialty,
      department,
      professionalTitle,
      licenseIdentifier,
      yearsOfExperience,
      biography,
      phone,
      workEmail,
      workSchedule,
    } = req.body;

    if (fullName) docProfile.fullName = String(fullName).trim();
    if (specialty) docProfile.specialty = String(specialty).trim();
    if (department) docProfile.department = String(department).trim();
    if (professionalTitle) docProfile.professionalTitle = String(professionalTitle).trim();
    if (licenseIdentifier) docProfile.licenseIdentifier = String(licenseIdentifier).trim();
    if (yearsOfExperience !== undefined) docProfile.yearsOfExperience = Number(yearsOfExperience);
    if (biography) docProfile.biography = String(biography).trim();
    if (phone) docProfile.phone = String(phone).trim();
    if (workEmail) docProfile.workEmail = String(workEmail).trim();
    if (workSchedule) docProfile.workSchedule = String(workSchedule).trim();

    const linkedUser = raw.users.find((u) => u.linkedDoctorId === docProfile.id);
    if (linkedUser && fullName) {
      linkedUser.fullName = docProfile.fullName;
      linkedUser.updatedAt = repo.getEffectiveNowIso();
    }

    appendAuditLog(raw, {
      actorId: linkedUser?.id || 'usr-doc-1',
      actorName: docProfile.fullName,
      actorRole: linkedUser?.role || 'TREATING_DOCTOR',
      organizationId: docProfile.organizationId,
      action: 'Shifokor profili yangilandi',
      details: `${docProfile.fullName} (${docProfile.specialty}) profil ma’lumotlari saqlandi.`,
      entityType: 'DOCTOR_PROFILE',
      entityId: docProfile.id,
    });

    repo.saveState(raw);
    res.json({ doctorProfile: docProfile });
  });

  // 4. Test 2 — Create Fictional Patient
  app.post('/api/patients', (req, res) => {
    const raw = repo.getRawState();
    const {
      actorId,
      fullName,
      dateOfBirth,
      age,
      sex,
      contact,
      region,
      district,
      organizationId,
      treatingDoctorId,
      familyDoctorId,
      careCaseType,
      specialtyCategory,
    } = req.body;

    if (!fullName || !contact) {
      res.status(400).json({ error: 'Bemor F.I.Sh va telefon raqami kiritilishi shart.' });
      return;
    }

    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const nowIso = repo.getEffectiveNowIso();
    const targetOrgId = organizationId || actor.primaryOrganizationId || 'org-hosp-1';

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      organizationId: targetOrgId,
      fullName: String(fullName).trim(),
      dateOfBirth: dateOfBirth || '1980-05-15',
      age: Number(age) || 46,
      sex: sex === 'Ayol' ? 'Ayol' : 'Erkak',
      contact: String(contact).trim(),
      region: region || 'Toshkent shahri',
      district: district || 'Yunusobod tumani',
      treatingDoctorId: treatingDoctorId || actor.linkedDoctorId || 'doc-1',
      familyDoctorId: familyDoctorId || 'doc-2',
      careCaseType: careCaseType || 'Statsionardan keyingi reabilitatsiya kuzatuvi',
      specialtyCategory: specialtyCategory || 'Umumiy tibbiyot',
      dischargeOrProcedureDate: nowIso,
      caseStatus: 'Aktiv kuzatuvda',
      consentStatus: {
        smsReminders: true,
        aiVoiceCalls: true,
        caregiverSharing: false,
        quietHours: '22:00 - 07:30',
      },
      createdAt: nowIso,
      isSynthetic: true,
    };

    raw.patients.unshift(newPatient);

    const newCase = {
      id: `case-${Date.now()}`,
      patientId: newPatient.id,
      organizationId: newPatient.organizationId,
      treatingDoctorId: newPatient.treatingDoctorId,
      familyDoctorId: newPatient.familyDoctorId,
      careType: 'Muolajadan keyingi kuzatuv' as const,
      diagnosisOrProcedureSummary: newPatient.careCaseType,
      dischargeInstructions: 'Shifokor tasdiqlagan individual kuzatuv va dori rejasi.',
      priority: 'O‘rta' as const,
      dischargeAt: nowIso,
      followUpDeadlineAt: toTashkentIso(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      caseStatus: 'Aktiv kuzatuvda' as const,
      clinicalNotes: [],
      startedAt: nowIso,
      isSynthetic: true,
    };
    raw.careCases.unshift(newCase);

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: newPatient.organizationId,
      patientId: newPatient.id,
      action: 'Yangi bemor profili ro‘yxatga olindi',
      details: `${newPatient.fullName} (${newPatient.careCaseType}) tizimga qo‘shildi.`,
      entityType: 'PATIENT',
      entityId: newPatient.id,
    });

    repo.saveState(raw);
    res.json({ patient: newPatient, careCase: newCase });
  });

  // Update or archive patient
  app.patch('/api/patients/:id', (req, res) => {
    const raw = repo.getRawState();
    const patient = raw.patients.find((p) => p.id === req.params.id);
    if (!patient) {
      res.status(404).json({ error: 'Bemor topilmadi.' });
      return;
    }

    const { caseStatus, contact, district, careCaseType, consentStatus } = req.body;
    if (caseStatus) {
      patient.caseStatus = caseStatus;
      raw.careCases
        .filter((c) => c.patientId === patient.id)
        .forEach((c) => {
          c.caseStatus = caseStatus;
        });
    }
    if (contact) patient.contact = contact;
    if (district) patient.district = district;
    if (careCaseType) patient.careCaseType = careCaseType;
    if (consentStatus) {
      patient.consentStatus = { ...patient.consentStatus, ...consentStatus };
    }

    repo.saveState(raw);
    res.json({ patient });
  });

  // Create or Activate Post-Treatment Recovery Plan ("Nazorat rejasini yaratish")
  app.post('/api/patients/:id/recovery-plan', (req, res) => {
    const raw = repo.getRawState();
    const patient = raw.patients.find((p) => p.id === req.params.id);
    if (!patient) {
      res.status(404).json({ error: 'Bemor topilmadi.' });
      return;
    }

    const {
      actorId,
      templateType,
      title,
      durationDays,
      checkInQuestions,
      painThreshold,
      flagAnyNewComplaint,
      flagDoctorContactRequest,
      instructions,
    } = req.body;

    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const nowIso = repo.getEffectiveNowIso();

    const plan: RecoveryPlan = {
      id: `rp-${Date.now()}`,
      templateType:
        templateType === 'Jarrohlik' || templateType === 'Stomatologiya'
          ? templateType
          : 'Umumiy tibbiyot',
      title: String(title || 'Davolanishdan keyingi nazorat rejasi').trim(),
      durationDays: Number(durationDays) || 7,
      checkInQuestions:
        Array.isArray(checkInQuestions) && checkInQuestions.length > 0
          ? checkInQuestions.map((q: string) => String(q).trim()).filter(Boolean)
          : [
              'Bugun o‘zingizni qanday his qilyapsiz?',
              'Og‘riq darajangiz 0 dan 10 gacha nechchi?',
              'Yangi shikoyatingiz bormi?',
              'Shifokor bilan bog‘lanishni xohlaysizmi?',
            ],
      painThreshold:
        painThreshold !== undefined
          ? Math.min(10, Math.max(1, Number(painThreshold)))
          : 6,
      flagAnyNewComplaint:
        flagAnyNewComplaint !== undefined ? Boolean(flagAnyNewComplaint) : true,
      flagDoctorContactRequest:
        flagDoctorContactRequest !== undefined
          ? Boolean(flagDoctorContactRequest)
          : true,
      instructions: String(
        instructions ||
          'Shifokor belgilagan dorilarni vaqtida qabul qiling va har kuni holatingizni belgilang.'
      ).trim(),
      active: true,
      activatedAt: nowIso,
      activatedByDoctorName: actor.fullName,
    };

    patient.recoveryPlan = plan;
    if (patient.caseStatus === 'Yakunlangan' || patient.caseStatus === 'Arxivlangan') {
      patient.caseStatus = 'Aktiv kuzatuvda';
    }

    let careCase = raw.careCases.find((c) => c.patientId === patient.id);
    if (!careCase) {
      careCase = {
        id: `case-${Date.now()}`,
        patientId: patient.id,
        organizationId: patient.organizationId,
        treatingDoctorId: patient.treatingDoctorId,
        familyDoctorId: patient.familyDoctorId,
        careType:
          plan.templateType === 'Stomatologiya'
            ? 'Stomatologik kuzatuv'
            : 'Muolajadan keyingi kuzatuv',
        diagnosisOrProcedureSummary: patient.careCaseType,
        dischargeInstructions: plan.instructions,
        priority: 'O‘rta',
        dischargeAt: nowIso,
        followUpDeadlineAt: toTashkentIso(
          new Date(Date.now() + 24 * 60 * 60 * 1000)
        ),
        nextAppointmentAt: toTashkentIso(
          new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
        ),
        caseStatus: 'Aktiv kuzatuvda',
        clinicalNotes: [],
        recoveryPlan: plan,
        startedAt: nowIso,
        isSynthetic: true,
      };
      raw.careCases.unshift(careCase);
    } else {
      careCase.recoveryPlan = plan;
      careCase.dischargeInstructions = plan.instructions;
    }

    careCase.clinicalNotes.unshift({
      id: `note-${Date.now()}`,
      careCaseId: careCase.id,
      authorId: actor.id,
      authorName: actor.fullName,
      authorRole: 'Shifokor',
      content: `Nazorat rejasi faollashtirildi: "${plan.title}" (${plan.templateType}, ${plan.durationDays} kun). Ogohlantirish qoidasi: og‘riq >= ${plan.painThreshold}/10 yoki yangi shikoyat.`,
      createdAt: nowIso,
    });

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: patient.organizationId,
      patientId: patient.id,
      action: `Nazorat rejasi yaratildi va faollashtirildi (${plan.templateType})`,
      details: `${plan.title} — ${plan.checkInQuestions.length} ta kunlik savol, og‘riq chegarasi: ${plan.painThreshold}/10.`,
      entityType: 'CARE_CASE',
      entityId: careCase.id,
    });

    repo.saveState(raw);
    res.json({ recoveryPlan: plan, patient, careCase });
  });

  // 5. Test 3 — Official Challenge #11: Automatic Post-Discharge Follow-up
  app.post('/api/discharge', (req, res) => {
    try {
      const result = executePatientDischarge(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Chiqarishda xatolik' });
    }
  });

  // 6. Test 8 — Family Doctor / Clinician Task Actions (Accept, Contact, Complete)
  app.patch('/api/tasks/:id', (req, res) => {
    const raw = repo.getRawState();
    const task = raw.followUpTasks.find((t) => t.id === req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Topshiriq topilmadi.' });
      return;
    }

    const { actorId, status, contactMethod, notes, assignedDoctorId } = req.body;
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[3];
    const nowIso = repo.getEffectiveNowIso();

    if (assignedDoctorId) {
      task.assignedDoctorId = assignedDoctorId;
    }
    if (status) {
      task.status = status as FollowUpTaskStatus;
      if (status === 'Qabul qilindi' && !task.acceptedAt) {
        task.acceptedAt = nowIso;
      }
      if (status === 'Bajarildi') {
        task.completedAt = nowIso;
        const patient = raw.patients.find((p) => p.id === task.patientId);
        if (patient) {
          patient.caseStatus = 'Aktiv kuzatuvda';
        }
        const careCase = raw.careCases.find(
          (c) => c.id === task.careCaseId || c.patientId === task.patientId
        );
        if (careCase) {
          careCase.caseStatus = 'Aktiv kuzatuvda';
          careCase.clinicalNotes.unshift({
            id: `note-${Date.now()}`,
            careCaseId: careCase.id,
            authorId: actor.id,
            authorName: actor.fullName,
            authorRole: 'Shifokor',
            content: `Shifokor vazifani bajardi (${
              contactMethod || task.contactMethod || 'Telefon muloqoti'
            }). Xulosa: ${notes || task.notes}`,
            createdAt: nowIso,
          });
        }
        // Mark any pending check-ins for this patient as reviewed by doctor
        raw.dailyCheckIns
          .filter(
            (chk) =>
              chk.patientId === task.patientId &&
              chk.reviewStatus === 'Shifokor ko‘rishi kerak'
          )
          .forEach((chk) => {
            chk.reviewStatus = 'Javob berildi';
            chk.reviewedByDoctorId = actor.linkedDoctorId || 'doc-1';
            chk.doctorReviewNote =
              notes ||
              `${actor.fullName} tomonidan vazifa doirasida ko‘rib chiqildi va yakunlandi.`;
          });
      }
    }
    if (contactMethod) task.contactMethod = contactMethod;
    if (notes !== undefined) task.notes = String(notes);

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: task.targetOrganizationId,
      patientId: task.patientId,
      action: `Kuzatuv topshirig‘i holati o‘zgartirildi: ${task.status}`,
      details: `${task.notes}`,
      entityType: 'FOLLOW_UP_TASK',
      entityId: task.id,
    });

    repo.saveState(raw);
    res.json({ task });
  });

  // 7. Create Medication Plan & Scheduled Events
  app.post('/api/medications/plans', (req, res) => {
    const raw = repo.getRawState();
    const {
      actorId,
      patientId,
      careCaseId,
      medicationName,
      strength,
      form,
      prescribedDose,
      frequency,
      dosageInstructions,
      scheduledTimes,
      startDate,
      endDate,
    } = req.body;

    const patient = raw.patients.find((p) => p.id === patientId);
    if (!patient || !medicationName) {
      res.status(400).json({ error: 'Bemor va dori nomi ko‘rsatilishi shart.' });
      return;
    }

    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const times: string[] = Array.isArray(scheduledTimes) && scheduledTimes.length > 0
      ? scheduledTimes
      : ['09:00', '21:00'];

    const plan: MedicationPlan = {
      id: `mp-${Date.now()}`,
      careCaseId: careCaseId || 'case-01',
      patientId: patient.id,
      organizationId: patient.organizationId,
      approvedByDoctorId: actor.linkedDoctorId || 'doc-1',
      medicationName: String(medicationName).trim(),
      strength: strength || '50 mg',
      form: form || 'Tabletka',
      prescribedDose: prescribedDose || '1 tabletkadan',
      frequency: frequency || 'Kuniga 2 mahal',
      dosageInstructions: dosageInstructions || 'Ovqatdan keyin suv bilan',
      scheduledTimes: times,
      startDate: startDate || '2026-11-17',
      endDate: endDate || '2026-12-01',
      status: 'Faol',
      isSynthetic: true,
    };
    raw.medicationPlans.unshift(plan);

    const createdEvents: MedicationEvent[] = times.map((timeStr, idx) => ({
      id: `me-${Date.now()}-${idx}`,
      medicationPlanId: plan.id,
      patientId: patient.id,
      organizationId: patient.organizationId,
      medicationName: `${plan.medicationName} (${plan.strength}) — ${timeStr}`,
      scheduledTimeLabel: timeStr,
      scheduledAt: `2026-11-17T${timeStr}:00+05:00`,
      reportedStatus: 'Tasdiqlanmagan',
      notificationStatus: 'Yuborildi (Simulyatsiya)',
      isSynthetic: true,
    }));

    raw.medicationEvents.unshift(...createdEvents);

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: patient.organizationId,
      patientId: patient.id,
      action: 'Shifokor tasdiqlagan yangi dori rejasi yaratildi',
      details: `${plan.medicationName} (${plan.strength}) — Vaqtlar: ${times.join(', ')}`,
      entityType: 'MEDICATION',
      entityId: plan.id,
    });

    repo.saveState(raw);
    res.json({ plan, createdEvents });
  });

  // 8. Test 5 — Patient Medication Confirmation ("Ichdim", "Keyinroq", "O‘tkazib yubordim")
  app.post('/api/medications/events/:id/respond', (req, res) => {
    const raw = repo.getRawState();
    const medEvent = raw.medicationEvents.find((e) => e.id === req.params.id);
    if (!medEvent) {
      res.status(404).json({ error: 'Dori hodisasi topilmadi.' });
      return;
    }

    const { reportedStatus, patientNote, actorId } = req.body;
    const nowIso = repo.getEffectiveNowIso();
    medEvent.reportedStatus = (reportedStatus as MedicationReportedStatus) || 'Ichdim';
    medEvent.respondedAt = nowIso;
    if (patientNote !== undefined) {
      medEvent.patientNote = String(patientNote);
    }

    const patient = raw.patients.find((p) => p.id === medEvent.patientId);
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[6];

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: patient?.fullName || actor.fullName,
      actorRole: 'PATIENT',
      organizationId: medEvent.organizationId,
      patientId: medEvent.patientId,
      action: `Bemor dori holatini belgiladi: "${medEvent.reportedStatus}"`,
      details: `${medEvent.medicationName} bo‘yicha bemor javobi: ${medEvent.reportedStatus} (Bemor tomonidan qayd etilgan).`,
      entityType: 'MEDICATION',
      entityId: medEvent.id,
    });

    repo.saveState(raw);
    res.json({ medicationEvent: medEvent });
  });

  // 9. Test 4 — Trigger Simulated SMS / Notification
  app.post('/api/notifications/trigger', (req, res) => {
    const raw = repo.getRawState();
    const {
      actorId,
      patientId,
      channel,
      notificationType,
      customMessage,
    } = req.body;

    const patient = raw.patients.find((p) => p.id === patientId) || raw.patients[0];
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const nowIso = repo.getEffectiveNowIso();

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: patient.id,
      recipientName: patient.fullName,
      recipientPhone: patient.contact,
      patientId: patient.id,
      organizationId: patient.organizationId,
      channel: channel || 'SMS (Simulyatsiya)',
      notificationType: notificationType || 'Dori eslatmasi',
      message:
        customMessage ||
        `CareBridge AI [Demo SMS]: Hurmatli ${patient.fullName}, shifokor belgilagan dori vositasini qabul qilish va kunlik holat so‘rovnomasini to‘ldirish vaqti bo‘ldi.`,
      status: 'Yetkazildi (Simulyatsiya)',
      isSimulation: true,
      createdAt: nowIso,
      deliveredAt: nowIso,
    };

    raw.notifications.unshift(notif);

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: patient.organizationId,
      patientId: patient.id,
      action: `Simulyatsiya xabarnomasi yuborildi (${notif.channel})`,
      details: `${patient.fullName} (${patient.contact}) ga "${notif.notificationType}" yuborildi.`,
      entityType: 'NOTIFICATION',
      entityId: notif.id,
    });

    repo.saveState(raw);
    res.json({ notification: notif });
  });

  // 10. Test 6 — Submit Daily Patient Health Check-In + Action Loop Task Creation
  app.post('/api/checkins', (req, res) => {
    const raw = repo.getRawState();
    const {
      patientId,
      overallFeeling,
      painScore,
      reportedSymptoms,
      temperatureC,
      bloodPressure,
      requestedDoctorContact,
      hasNewComplaint,
    } = req.body;

    const patient = raw.patients.find((p) => p.id === patientId) || raw.patients[0];
    const careCase = raw.careCases.find((c) => c.patientId === patient.id);
    const activePlan = careCase?.recoveryPlan || patient.recoveryPlan;
    const nowIso = repo.getEffectiveNowIso();
    const numericPain = Math.min(10, Math.max(0, Number(painScore) || 0));

    const painThreshold = activePlan?.painThreshold ?? 6;
    const flagAnyNewComplaint = activePlan?.flagAnyNewComplaint ?? true;
    const flagDoctorContact = activePlan?.flagDoctorContactRequest ?? true;

    const cleanSymptoms =
      String(reportedSymptoms || '').trim() || 'Qo‘shimcha izoh kiritilmadi.';
    const isNonEmptyComplaint =
      Boolean(hasNewComplaint) ||
      overallFeeling === 'Bezovtalik bor' ||
      overallFeeling === 'Og‘riq kuchaygan' ||
      (cleanSymptoms !== 'Qo‘shimcha izoh kiritilmadi.' &&
        cleanSymptoms !== 'Yangi shikoyat yo‘q' &&
        cleanSymptoms !== 'Bugun o‘zimni barqaror his qilyapman.');

    const needsDoctorReview =
      (flagDoctorContact && Boolean(requestedDoctorContact)) ||
      numericPain >= painThreshold ||
      (flagAnyNewComplaint && isNonEmptyComplaint);

    const reviewStatus: CheckInReviewStatus = needsDoctorReview
      ? 'Shifokor ko‘rishi kerak'
      : 'Javob berildi';

    const checkIn: DailyCheckIn = {
      id: `chk-${Date.now()}`,
      careCaseId: careCase?.id || 'case-01',
      patientId: patient.id,
      organizationId: patient.organizationId,
      scheduledAt: nowIso,
      submittedAt: nowIso,
      overallFeeling: overallFeeling || 'O‘rtacha',
      painScore: numericPain,
      reportedSymptoms: cleanSymptoms,
      temperatureC: temperatureC ? Number(temperatureC) : 36.6,
      bloodPressure: bloodPressure ? String(bloodPressure) : undefined,
      requestedDoctorContact: Boolean(requestedDoctorContact),
      reviewStatus,
      isSynthetic: true,
    };

    raw.dailyCheckIns.unshift(checkIn);

    let autoTask: FollowUpTask | undefined;

    if (needsDoctorReview) {
      patient.caseStatus = 'Shifokor ko‘rishi kerak';
      if (careCase) {
        careCase.caseStatus = 'Shifokor ko‘rishi kerak';
      }
      const doc = raw.doctorProfiles.find((d) => d.id === patient.treatingDoctorId);

      // Action Loop: Prevent duplicate open review tasks for the same patient
      const existingOpenReviewTask = raw.followUpTasks.find(
        (t) =>
          t.patientId === patient.id &&
          t.status !== 'Bajarildi' &&
          t.taskType === 'Shoshilinch murojaat tekshiruvi'
      );

      const triggerReasons: string[] = [];
      if (numericPain >= painThreshold) {
        triggerReasons.push(`og‘riq ${numericPain}/10 (chegara: ${painThreshold})`);
      }
      if (flagAnyNewComplaint && isNonEmptyComplaint) {
        triggerReasons.push(`shikoyat: "${cleanSymptoms}"`);
      }
      if (requestedDoctorContact) {
        triggerReasons.push('bemor shifokor aloqasini so‘radi');
      }

      const taskSummaryText = `Bemor kunlik nazorat hisoboti (${triggerReasons.join(
        ', '
      )}). Holatni ko‘rib chiqing va bemor bilan bog‘laning.`;

      if (existingOpenReviewTask) {
        existingOpenReviewTask.sourceCheckInId = checkIn.id;
        existingOpenReviewTask.notes = taskSummaryText;
        existingOpenReviewTask.priority = 'Yuqori';
        autoTask = existingOpenReviewTask;
      } else {
        const dueDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
        autoTask = {
          id: `task-chk-${Date.now()}`,
          careCaseId: careCase?.id || 'case-01',
          patientId: patient.id,
          organizationId: patient.organizationId,
          targetOrganizationId: patient.organizationId,
          assignedDoctorId: patient.treatingDoctorId || 'doc-1',
          createdByDoctorId: patient.treatingDoctorId || 'doc-1',
          priority: 'Yuqori',
          taskType: 'Shoshilinch murojaat tekshiruvi',
          sourceCheckInId: checkIn.id,
          createdAt: nowIso,
          dueAt: toTashkentIso(dueDate),
          status: 'Yangi',
          notes: taskSummaryText,
          isSynthetic: true,
        };
        raw.followUpTasks.unshift(autoTask);

        appendAuditLog(raw, {
          actorId: 'usr-pat-1',
          actorName: patient.fullName,
          actorRole: 'PATIENT',
          organizationId: patient.organizationId,
          patientId: patient.id,
          action: 'Avtomatik shifokor ko‘rigi vazifasi yaratildi (Vazifalar)',
          details: taskSummaryText,
          entityType: 'FOLLOW_UP_TASK',
          entityId: autoTask.id,
        });
      }

      raw.notifications.unshift({
        id: `notif-${Date.now()}`,
        recipientId: doc?.id || 'doc-1',
        recipientName: doc?.fullName || 'Mas’ul shifokor',
        recipientPhone: doc?.phone || '+998 90 000 00 03',
        patientId: patient.id,
        organizationId: patient.organizationId,
        channel: 'Ilova ichida',
        notificationType: 'Bemor shifokor aloqasini so‘radi',
        message: `DIQQAT: Bemor ${patient.fullName} kunlik check-in topshirdi (Og‘riq: ${numericPain}/10, ${cleanSymptoms}). Vazifalar bo‘limida ko‘rib chiqish topshirig‘i ochildi.`,
        status: 'Yetkazildi (Simulyatsiya)',
        isSimulation: true,
        createdAt: nowIso,
        deliveredAt: nowIso,
      });
    }

    appendAuditLog(raw, {
      actorId: 'usr-pat-1',
      actorName: patient.fullName,
      actorRole: 'PATIENT',
      organizationId: patient.organizationId,
      patientId: patient.id,
      action: 'Kunlik salomatlik check-in topshirildi',
      details: `Holat: ${checkIn.overallFeeling}, Og‘riq: ${checkIn.painScore}/10, Izoh: ${cleanSymptoms}`,
      entityType: 'CHECK_IN',
      entityId: checkIn.id,
    });

    repo.saveState(raw);
    res.json({ checkIn, autoTask });
  });

  // Review Daily Check-In by Doctor
  app.patch('/api/checkins/:id/review', (req, res) => {
    const raw = repo.getRawState();
    const chk = raw.dailyCheckIns.find((c) => c.id === req.params.id);
    if (!chk) {
      res.status(404).json({ error: 'Check-in topilmadi.' });
      return;
    }

    const { doctorId, doctorReviewNote } = req.body;
    chk.reviewStatus = 'Javob berildi';
    chk.reviewedByDoctorId = doctorId || 'doc-1';
    chk.doctorReviewNote =
      doctorReviewNote || 'Shifokor tomonidan ko‘rib chiqildi va nazoratga olindi.';

    repo.saveState(raw);
    res.json({ checkIn: chk });
  });

  // Add Clinical Note to CareCase
  app.post('/api/cases/:id/notes', (req, res) => {
    const raw = repo.getRawState();
    const careCase = raw.careCases.find((c) => c.id === req.params.id);
    if (!careCase) {
      res.status(404).json({ error: 'Kuzatuv ishi topilmadi.' });
      return;
    }

    const { actorId, content } = req.body;
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    const note = {
      id: `note-${Date.now()}`,
      careCaseId: careCase.id,
      authorId: actor.id,
      authorName: actor.fullName,
      authorRole: actor.role === 'NURSE' ? 'Hamshira / Koordinator' : 'Shifokor',
      content: String(content || '').trim(),
      createdAt: repo.getEffectiveNowIso(),
    };
    careCase.clinicalNotes.unshift(note);

    appendAuditLog(raw, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      organizationId: careCase.organizationId,
      patientId: careCase.patientId,
      action: 'Shifokor klinik qaydi qo‘shildi',
      details: note.content,
      entityType: 'CARE_CASE',
      entityId: careCase.id,
    });

    repo.saveState(raw);
    res.json({ note, careCase });
  });

  // 11. Test 7 — Interactive AI Voice Agent Turn & Save Conversation
  app.post('/api/ai/call-turn', async (req, res) => {
    try {
      const raw = repo.getRawState();
      const { patientId, conversationType, transcript, patientMessage } = req.body;
      const patient = raw.patients.find((p) => p.id === patientId) || raw.patients[0];

      const result = await generateAiVoiceTurn({
        patient,
        conversationType: conversationType || 'Dori qabulini tasdiqlash',
        transcript: Array.isArray(transcript) ? transcript : [],
        patientMessage: String(patientMessage || ''),
      });

      res.json({
        ...result,
        timestamp: repo.getEffectiveNowIso(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI agent xatosi' });
    }
  });

  app.post('/api/ai/call-complete', (req, res) => {
    const raw = repo.getRawState();
    const { patientId, conversationType, transcript, structuredSummary } = req.body;
    const patient = raw.patients.find((p) => p.id === patientId) || raw.patients[0];
    const careCase = raw.careCases.find((c) => c.patientId === patient.id);
    const nowIso = repo.getEffectiveNowIso();

    const conv: AIConversation = {
      id: `aiconv-${Date.now()}`,
      careCaseId: careCase?.id || 'case-01',
      patientId: patient.id,
      organizationId: patient.organizationId,
      conversationType: conversationType || 'Dori qabulini tasdiqlash',
      transcript: Array.isArray(transcript) ? transcript : [],
      structuredSummary: structuredSummary || {
        medicationConfirmed: 'Ha (bemor tasdiqladi)',
        reportedSymptoms: 'Shikoyat yo‘q',
        painLevelMentioned: 2,
        requestedDoctorCallback: false,
        requiresClinicianReview: false,
        summaryUz: 'Simulyatsiya qo‘ng‘irog‘i yakunlandi.',
      },
      isSimulation: true,
      createdAt: nowIso,
    };

    raw.aiConversations.unshift(conv);

    if (conv.structuredSummary.medicationConfirmed === 'Ha (bemor tasdiqladi)') {
      const pendingMed = raw.medicationEvents.find(
        (m) => m.patientId === patient.id && m.reportedStatus === 'Tasdiqlanmagan'
      );
      if (pendingMed) {
        pendingMed.reportedStatus = 'Ichdim';
        pendingMed.respondedAt = nowIso;
        pendingMed.patientNote = 'AI virtual yordamchi muloqoti orqali tasdiqlandi.';
      }
    }

    if (conv.structuredSummary.requiresClinicianReview) {
      patient.caseStatus = 'Shifokor ko‘rishi kerak';
      if (careCase) careCase.caseStatus = 'Shifokor ko‘rishi kerak';
    }

    appendAuditLog(raw, {
      actorId: 'usr-pat-1',
      actorName: 'CareBridge AI Virtual Yordamchi',
      actorRole: 'PATIENT',
      organizationId: patient.organizationId,
      patientId: patient.id,
      action: 'AI ovozli muloqot (Simulyatsiya) saqlandi',
      details: conv.structuredSummary.summaryUz,
      entityType: 'AI_CONVERSATION',
      entityId: conv.id,
    });

    repo.saveState(raw);
    res.json({ conversation: conv });
  });

  // 12. Generate AI Patient Summary Report for Doctor
  app.post('/api/ai/generate-report', async (req, res) => {
    try {
      const raw = repo.getRawState();
      const { actorId, patientId } = req.body;
      const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
      const patient = raw.patients.find((p) => p.id === patientId) || raw.patients[0];

      const access = canActorAccessPatient(actor, patient, raw);
      if (!access.allowed) {
        res.status(403).json({ error: access.reason });
        return;
      }

      const careCase = raw.careCases.find((c) => c.patientId === patient.id);
      const medicationEvents = raw.medicationEvents.filter(
        (m) => m.patientId === patient.id
      );
      const checkIns = raw.dailyCheckIns.filter((c) => c.patientId === patient.id);
      const notifications = raw.notifications.filter(
        (n) => n.patientId === patient.id
      );
      const conversations = raw.aiConversations.filter(
        (a) => a.patientId === patient.id
      );

      const generated = await generatePatientAiReport({
        patient,
        careCase,
        medicationEvents,
        checkIns,
        notifications,
        conversations,
        doctorName: actor.fullName,
      });

      const nowIso = repo.getEffectiveNowIso();
      const report: AIReport = {
        id: `airep-${Date.now()}`,
        careCaseId: careCase?.id || 'case-01',
        patientId: patient.id,
        organizationId: patient.organizationId,
        generatedBy: `${actor.fullName} (${
          generated.usedGemini ? 'Gemini AI' : 'Strukturaviy AI tahlilchi'
        })`,
        periodStart: patient.dischargeOrProcedureDate.slice(0, 10),
        periodEnd: nowIso.slice(0, 10),
        summary: generated.summary,
        sourceEventIds: generated.sourceEventIds,
        clinicianReviewStatus: 'Loyiha — shifokor tekshirishi kerak',
        createdAt: nowIso,
        isSynthetic: true,
      };

      raw.aiReports.unshift(report);

      appendAuditLog(raw, {
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        organizationId: patient.organizationId,
        patientId: patient.id,
        action: 'AI hisobot loyihasi yaratildi',
        details: `${patient.fullName} uchun ${report.sourceEventIds.length} ta manba yozuv asosida AI hisobot yaratildi.`,
        entityType: 'AI_REPORT',
        entityId: report.id,
      });

      repo.saveState(raw);
      res.json({ report, usedGemini: generated.usedGemini });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI hisobot xatosi' });
    }
  });

  // Doctor reviews / edits AI Report
  app.patch('/api/ai/reports/:id', (req, res) => {
    const raw = repo.getRawState();
    const report = raw.aiReports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'AI hisobot topilmadi.' });
      return;
    }

    const { actorId, doctorEditableNotes, markReviewed } = req.body;
    const actor = raw.users.find((u) => u.id === actorId) || raw.users[2];
    if (doctorEditableNotes !== undefined) {
      report.summary.doctorEditableNotes = String(doctorEditableNotes);
    }
    if (markReviewed) {
      report.clinicianReviewStatus = 'Shifokor tomonidan tasdiqlangan';
      report.reviewedByDoctorName = actor.fullName;
      report.reviewedAt = repo.getEffectiveNowIso();
    }

    repo.saveState(raw);
    res.json({ report });
  });

  // 13. Staff & Clinic Management
  app.post('/api/staff', (req, res) => {
    const raw = repo.getRawState();
    const {
      fullName,
      email,
      phone,
      role,
      organizationId,
      department,
      specialty,
      professionalTitle,
    } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ error: 'Xodim ismi va email manzili kiritilishi shart.' });
      return;
    }

    const nowIso = repo.getEffectiveNowIso();
    const newUserId = `usr-${Date.now()}`;
    const newDocId = `doc-${Date.now()}`;
    const orgId = organizationId || 'org-hosp-1';

    const newUser: UserAccount = {
      id: newUserId,
      authUid: `demo-auth-${Date.now()}`,
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      phone: phone || '+998 90 000 09 99',
      role: role || 'TREATING_DOCTOR',
      organizationMemberships: [orgId],
      primaryOrganizationId: orgId,
      linkedDoctorId:
        role === 'TREATING_DOCTOR' || role === 'FAMILY_DOCTOR' ? newDocId : undefined,
      avatarUrl: String(fullName)
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      status: 'Faol',
      languagePreference: 'uz',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    raw.users.push(newUser);

    let newDocProfile: DoctorProfile | undefined;
    if (role === 'TREATING_DOCTOR' || role === 'FAMILY_DOCTOR') {
      newDocProfile = {
        id: newDocId,
        userId: newUserId,
        fullName: newUser.fullName,
        organizationId: orgId,
        specialty: specialty || 'Terapevt',
        department: department || 'Ichki kasalliklar',
        professionalTitle: professionalTitle || 'Shifokor-mutaxassis',
        licenseIdentifier: `UZ-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        yearsOfExperience: 7,
        biography: 'Klinika ma’muriyati tomonidan taklif etilgan mutaxassis (Sun’iy demo profil).',
        phone: newUser.phone,
        workEmail: newUser.email,
        workSchedule: 'Dushanba - Juma: 09:00 - 17:00',
        districtCoverage: ['Yunusobod tumani'],
        status: 'Faol',
        createdAt: nowIso,
        isSynthetic: true,
      };
      raw.doctorProfiles.push(newDocProfile);
    }

    repo.saveState(raw);
    res.json({ user: newUser, doctorProfile: newDocProfile });
  });

  app.patch('/api/staff/:id', (req, res) => {
    const raw = repo.getRawState();
    const user = raw.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Xodim topilmadi.' });
      return;
    }

    if (req.body.status) user.status = req.body.status;
    if (req.body.role) user.role = req.body.role;
    user.updatedAt = repo.getEffectiveNowIso();
    repo.saveState(raw);
    res.json({ user });
  });

  // Update Organization / Clinic Settings / Subscription Plan
  app.patch('/api/organizations/:id', (req, res) => {
    const raw = repo.getRawState();
    const org = raw.organizations.find((o) => o.id === req.params.id);
    if (!org) {
      res.status(404).json({ error: 'Tashkilot topilmadi.' });
      return;
    }

    const { name, status, subscriptionPlan, address, operatingHours, notificationConfig } =
      req.body;
    if (name) org.name = name;
    if (status) org.status = status;
    if (subscriptionPlan) org.subscriptionPlan = subscriptionPlan;
    if (address) org.address = address;
    if (operatingHours) org.operatingHours = operatingHours;
    if (notificationConfig) {
      org.notificationConfig = { ...org.notificationConfig, ...notificationConfig };
    }

    repo.saveState(raw);
    res.json({ organization: org });
  });

  // Create new Organization (Super Admin)
  app.post('/api/organizations', (req, res) => {
    const raw = repo.getRawState();
    const { name, type, region, district, address, phone, email } = req.body;
    const newOrg = {
      id: `org-${Date.now()}`,
      name: String(name || 'Yangi Demo Klinika').trim(),
      type: type || 'Xususiy klinika',
      region: region || 'Toshkent shahri',
      district: district || 'Mirzo Ulug‘bek tumani',
      address: address || 'Mirzo Ulug‘bek ko‘chasi, 15-uy',
      contact: {
        phone: phone || '+998 71 200 11 22',
        email: email || 'clinic-demo@carebridge.uz',
      },
      description: 'Platforma Super Admini tomonidan qo‘shilgan sun’iy demo tibbiyot muassasasi.',
      departments: ['Umumiy bo‘lim', 'Diagnostika'],
      operatingHours: 'Dushanba - Shanba, 08:30 - 18:30',
      subscriptionPlan: 'PRO' as const,
      status: 'Faol' as const,
      notificationConfig: {
        smsEnabled: true,
        aiVoiceEnabled: true,
        escalationMinutes: 15,
        defaultQuietHours: '22:00 - 07:30',
      },
      createdAt: repo.getEffectiveNowIso(),
      isSynthetic: true,
    };
    raw.organizations.push(newOrg);
    repo.saveState(raw);
    res.json({ organization: newOrg });
  });

  // Create Specialty Template
  app.post('/api/templates', (req, res) => {
    const raw = repo.getRawState();
    const {
      organizationId,
      specialty,
      title,
      durationDays,
      reminderSchedule,
      approvedQuestions,
      followUpAppointments,
      patientInstructions,
      escalationInstructions,
      clinicianApprovedBy,
    } = req.body;

    const tpl: SpecialtyTemplate = {
      id: `tpl-${Date.now()}`,
      organizationId: organizationId || 'org-hosp-1',
      specialty: specialty || 'Umumiy tibbiyot',
      title: String(title || 'Yangi kuzatuv shabloni').trim(),
      durationDays: Number(durationDays) || 7,
      reminderSchedule: reminderSchedule || '09:00 va 20:00 eslatma',
      approvedQuestions: Array.isArray(approvedQuestions)
        ? approvedQuestions
        : ['Bugun o‘zingizni qanday his qilyapsiz?', 'Og‘riq darajangiz 0 dan 10 gacha nechchi?'],
      followUpAppointments: followUpAppointments || '3-kun va 7-kun ko‘rik',
      patientInstructions: patientInstructions || 'Shifokor ko‘rsatmasiga rioya qiling.',
      escalationInstructions: escalationInstructions || 'Og‘riq >= 7 bo‘lsa shifokorga xabar berish.',
      clinicianApprovedBy: clinicianApprovedBy || 'Dr. Sardor Rahimov',
    };

    raw.templates.unshift(tpl);
    repo.saveState(raw);
    res.json({ template: tpl });
  });

  // Toggle Consent Record
  app.patch('/api/consents/:id', (req, res) => {
    const raw = repo.getRawState();
    const cons = raw.consents.find((c) => c.id === req.params.id);
    if (!cons) {
      res.status(404).json({ error: 'Rozilik yozuvi topilmadi.' });
      return;
    }

    cons.active = Boolean(req.body.active);
    if (!cons.active) {
      cons.withdrawnAt = repo.getEffectiveNowIso();
    } else {
      cons.withdrawnAt = undefined;
      cons.grantedAt = repo.getEffectiveNowIso();
    }
    repo.saveState(raw);
    res.json({ consent: cons });
  });

  // 14. Section 20 — Hackathon Demo Control Center Actions
  app.post('/api/demo/action', async (req, res) => {
    try {
      const { actionType, minutesOffset } = req.body;
      let raw = repo.getRawState();
      const nowIso = repo.getEffectiveNowIso();
      let message = '';

      switch (actionType) {
        case 'RESET_DEMO': {
          raw = repo.resetDemoState();
          message = 'Barcha sun’iy demo ma’lumotlar dastlabki holatga tiklandi.';
          break;
        }
        case 'ADVANCE_CLOCK': {
          const addMins = Number(minutesOffset) || 60;
          raw.demoMeta.simulatedOffsetMinutes += addMins;
          repo.saveState(raw);
          repo.getRawState(); // triggers overdue evaluation
          message = `Simulyatsiya soati +${addMins} daqiqaga oldinga surildi (Haqiqiy server vaqti o‘zgarmadi).`;
          break;
        }
        case 'STEP_1_CREATE_PATIENT': {
          const demoPatId = `pat-demo-${Date.now()}`;
          const newPat: Patient = {
            id: demoPatId,
            organizationId: 'org-hosp-1',
            fullName: 'Sanjarbek Karimov (Hackathon Demo Bemor)',
            dateOfBirth: '1972-03-14',
            age: 54,
            sex: 'Erkak',
            contact: '+998 90 000 77 88',
            region: 'Toshkent shahri',
            district: 'Yunusobod tumani',
            treatingDoctorId: 'doc-1',
            familyDoctorId: 'doc-2',
            careCaseType: 'O‘tkir koronar sindromdan keyingi reabilitatsiya',
            specialtyCategory: 'Kardiologiya',
            dischargeOrProcedureDate: nowIso,
            caseStatus: 'Aktiv kuzatuvda',
            consentStatus: {
              smsReminders: true,
              aiVoiceCalls: true,
              caregiverSharing: true,
              caregiverName: 'Dilfuza Karimova',
              caregiverPhone: '+998 90 000 77 99',
              quietHours: '22:00 - 07:30',
            },
            createdAt: nowIso,
            isSynthetic: true,
          };
          raw.patients.unshift(newPat);
          raw.demoMeta.featuredDemoPatientId = demoPatId;
          raw.demoMeta.currentDemoStep = 2;
          repo.saveState(raw);
          message = '1-qadam: Yangi demo bemor (Sanjarbek Karimov) yaratildi.';
          break;
        }
        case 'STEP_2_DISCHARGE_PATIENT': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const result = executePatientDischarge({
            actorId: 'usr-doc-1',
            patientId: targetId,
            hospitalId: 'org-hosp-1',
            treatingDoctorId: 'doc-1',
            diagnosisOrProcedureSummary:
              'Statsionar davolanish yakunlandi — 24 soatlik oilaviy shifokor nazoratiga uzatildi (Challenge #11).',
            dischargeInstructions:
              'Kuniga 2 mahal AQB o‘lchash, Demo-Kardio A 5 mg va Demo-Tenzio B 80 mg rejasini qabul qilish.',
            district: 'Yunusobod tumani',
            familyDoctorId: 'doc-2',
            priority: 'Yuqori',
          });
          raw = repo.getRawState();
          raw.demoMeta.currentDemoStep = 3;
          repo.saveState(raw);
          message = `2-qadam: Bemor shifoxonadan uyga chiqarildi va ${result.followUpTask.id} topshirig‘i yaratildi.`;
          break;
        }
        case 'STEP_3_ASSIGN_FAMILY_DOCTOR': {
          const latestTask = raw.followUpTasks[0];
          if (latestTask) {
            latestTask.status = 'Qabul qilindi';
            latestTask.acceptedAt = nowIso;
            latestTask.notes =
              'Oilaviy shifokor Dr. Malika Tursunova 24 soatlik topshiriqni qabul qildi.';
          }
          raw.demoMeta.currentDemoStep = 4;
          repo.saveState(raw);
          message =
            '3-qadam: Hududiy oilaviy shifokor (Dr. Malika Tursunova) topshiriqni qabul qildi.';
          break;
        }
        case 'STEP_4_TRIGGER_SMS': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const pat = raw.patients.find((p) => p.id === targetId) || raw.patients[0];
          raw.notifications.unshift({
            id: `notif-demo-${Date.now()}`,
            recipientId: pat.id,
            recipientName: pat.fullName,
            recipientPhone: pat.contact,
            patientId: pat.id,
            organizationId: pat.organizationId,
            channel: 'SMS (Simulyatsiya)',
            notificationType: 'Dori eslatmasi',
            message: `CareBridge AI [Demo SMS]: Hurmatli ${pat.fullName}, soat 14:00 dagi Demo-Tenzio B (80 mg) dorisini qabul qilish vaqti bo‘ldi.`,
            status: 'Yetkazildi (Simulyatsiya)',
            isSimulation: true,
            createdAt: nowIso,
            deliveredAt: nowIso,
          });
          raw.demoMeta.currentDemoStep = 5;
          repo.saveState(raw);
          message = `4-qadam: ${pat.fullName} ga SMS dori eslatmasi (Simulyatsiya) yuborildi.`;
          break;
        }
        case 'STEP_5_PATIENT_MED_CONFIRM': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          let medEv = raw.medicationEvents.find(
            (e) => e.patientId === targetId && e.reportedStatus === 'Tasdiqlanmagan'
          );
          if (!medEv) {
            medEv = {
              id: `me-demo-${Date.now()}`,
              medicationPlanId: 'mp-01',
              patientId: targetId,
              organizationId: 'org-hosp-1',
              medicationName: 'Demo-Tenzio B (80 mg) — 14:00 dozasi',
              scheduledTimeLabel: '14:00',
              scheduledAt: nowIso,
              respondedAt: nowIso,
              reportedStatus: 'Ichdim',
              notificationStatus: 'Yuborildi (Simulyatsiya)',
              patientNote: 'Demo markaz orqali "Ichdim" deb tasdiqlandi.',
              isSynthetic: true,
            };
            raw.medicationEvents.unshift(medEv);
          } else {
            medEv.reportedStatus = 'Ichdim';
            medEv.respondedAt = nowIso;
            medEv.patientNote = 'Bemor tomonidan vaqtida qabul qilingani tasdiqlandi.';
          }
          raw.demoMeta.currentDemoStep = 6;
          repo.saveState(raw);
          message = '5-qadam: Bemor dori qabulini "Ichdim" deb tasdiqladi.';
          break;
        }
        case 'STEP_6_START_AI_CALL': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const pat = raw.patients.find((p) => p.id === targetId) || raw.patients[0];
          const careCase = raw.careCases.find((c) => c.patientId === pat.id);
          raw.aiConversations.unshift({
            id: `aiconv-demo-${Date.now()}`,
            careCaseId: careCase?.id || 'case-01',
            patientId: pat.id,
            organizationId: pat.organizationId,
            conversationType: 'Chiqarishdan keyingi 24s muloqot',
            transcript: [
              {
                speaker: 'AI',
                text: `Assalomu alaykum, ${pat.fullName}! Men CareBridge virtual yordamchisiman. Sizga dori qabul qilish bo‘yicha eslatma yuborilgan edi. Dorini qabul qilganingizni tasdiqlaysizmi?`,
                timestamp: nowIso,
              },
              {
                speaker: 'PATIENT',
                text: 'Ha, ichdim. Bugun o‘zimni ancha yaxshi his qilyapman, faqat kechki payt biroz bosh og‘rig‘i bo‘ldi.',
                timestamp: nowIso,
              },
              {
                speaker: 'AI',
                text: 'Rahmat, tasdiqingiz va holatingiz qayd etildi. Ma’lumotlarni davolovchi shifokoringiz hamda oilaviy shifokoringizga yubordim.',
                timestamp: nowIso,
              },
            ],
            structuredSummary: {
              medicationConfirmed: 'Ha (bemor tasdiqladi)',
              reportedSymptoms: 'Kechki payt yengil bosh og‘rig‘i',
              painLevelMentioned: 3,
              requestedDoctorCallback: true,
              requiresClinicianReview: true,
              summaryUz:
                'Bemor dori qabulini tasdiqladi va yengil bosh og‘rig‘i haqida xabar berdi.',
            },
            isSimulation: true,
            createdAt: nowIso,
          });
          raw.demoMeta.currentDemoStep = 7;
          repo.saveState(raw);
          message = '6-qadam: AI ovozli kuzatuv muloqoti simulyatsiyasi bajarildi va saqlandi.';
          break;
        }
        case 'STEP_7_SUBMIT_CHECKIN': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const pat = raw.patients.find((p) => p.id === targetId) || raw.patients[0];
          const careCase = raw.careCases.find((c) => c.patientId === pat.id);
          raw.dailyCheckIns.unshift({
            id: `chk-demo-${Date.now()}`,
            careCaseId: careCase?.id || 'case-01',
            patientId: pat.id,
            organizationId: pat.organizationId,
            scheduledAt: nowIso,
            submittedAt: nowIso,
            overallFeeling: 'Yaxshi',
            painScore: 2,
            reportedSymptoms: 'Bugun ahvolim barqaror, qon bosimim 126/82 mm.sim.ust.',
            temperatureC: 36.6,
            bloodPressure: '126/82',
            requestedDoctorContact: false,
            reviewStatus: 'Javob berildi',
            isSynthetic: true,
          });
          raw.demoMeta.currentDemoStep = 8;
          repo.saveState(raw);
          message = '7-qadam: Bemorning kunlik salomatlik check-in ma’lumoti saqlandi.';
          break;
        }
        case 'STEP_8_GENERATE_REPORT': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const pat = raw.patients.find((p) => p.id === targetId) || raw.patients[0];
          const careCase = raw.careCases.find((c) => c.patientId === pat.id);
          const gen = await generatePatientAiReport({
            patient: pat,
            careCase,
            medicationEvents: raw.medicationEvents.filter((m) => m.patientId === pat.id),
            checkIns: raw.dailyCheckIns.filter((c) => c.patientId === pat.id),
            notifications: raw.notifications.filter((n) => n.patientId === pat.id),
            conversations: raw.aiConversations.filter((a) => a.patientId === pat.id),
            doctorName: 'Dr. Malika Tursunova',
          });
          raw.aiReports.unshift({
            id: `airep-demo-${Date.now()}`,
            careCaseId: careCase?.id || 'case-01',
            patientId: pat.id,
            organizationId: pat.organizationId,
            generatedBy: 'Dr. Malika Tursunova (AI Hisobot Tizimi)',
            periodStart: pat.dischargeOrProcedureDate.slice(0, 10),
            periodEnd: nowIso.slice(0, 10),
            summary: gen.summary,
            sourceEventIds: gen.sourceEventIds,
            clinicianReviewStatus: 'Loyiha — shifokor tekshirishi kerak',
            createdAt: nowIso,
            isSynthetic: true,
          });
          raw.demoMeta.currentDemoStep = 9;
          repo.saveState(raw);
          message = '8-qadam: Shifokor uchun AI bemor tahliliy hisoboti yaratildi.';
          break;
        }
        case 'STEP_9_COMPLETE_FOLLOWUP': {
          const targetId = raw.demoMeta.featuredDemoPatientId || 'pat-01';
          const task =
            raw.followUpTasks.find(
              (t) => t.patientId === targetId && t.status !== 'Bajarildi'
            ) || raw.followUpTasks[0];
          if (task) {
            task.status = 'Bajarildi';
            task.completedAt = nowIso;
            task.contactMethod = 'Telefon muloqoti';
            task.notes =
              '24 soatlik oilaviy shifokor kuzatuvi muvaffaqiyatli yakunlandi. Bemor dori rejasini davom ettirmoqda.';
          }
          const pat = raw.patients.find((p) => p.id === targetId);
          if (pat) pat.caseStatus = 'Aktiv kuzatuvda';
          raw.demoMeta.currentDemoStep = 10;
          repo.saveState(raw);
          message =
            '9-qadam: 24 soatlik oilaviy shifokor kuzatuvi yakunlandi va ko‘rsatkichlar yangilandi!';
          break;
        }
        default:
          message = 'Demo amal bajarildi.';
      }

      res.json({
        message,
        demoMeta: raw.demoMeta,
        effectiveNowIso: repo.getEffectiveNowIso(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Demo amal xatosi' });
    }
  });

  // ==========================================================================
  // DOCTOR-CONTROLLED PATIENT CHAT & PERMISSION ENDPOINTS (Backend Enforced)
  // ==========================================================================

  // Ensure or create a conversation between an authorized doctor and patient (default patientCanSend: false)
  app.post('/api/chat/conversations', (req, res) => {
    try {
      const { actorId, patientId, doctorId } = req.body;
      const raw = repo.getRawState();
      const actor = raw.users.find((u) => u.id === actorId);
      if (!actor) {
        res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi.' });
        return;
      }

      const patient = raw.patients.find((p) => p.id === patientId);
      if (!patient) {
        res.status(404).json({ error: 'Bemor topilmadi.' });
        return;
      }

      const access = canActorAccessPatient(actor, patient, raw);
      if (!access.allowed) {
        res.status(403).json({ error: access.reason || 'Ruxsat yo‘q.' });
        return;
      }

      const resolvedDoctorId =
        doctorId || actor.linkedDoctorId || patient.treatingDoctorId || 'doc-1';
      let conv = raw.conversations.find(
        (c) => c.patientId === patient.id && c.doctorId === resolvedDoctorId
      );

      if (!conv) {
        if (actor.role === 'PATIENT' || actor.role === 'CAREGIVER') {
          res.status(403).json({
            error: 'Shifokoringiz hozircha xabar yozishga ruxsat bermagan.',
          });
          return;
        }
        const nowIso = repo.getEffectiveNowIso();
        conv = {
          id: `conv-${patient.id}-${resolvedDoctorId}`,
          patientId: patient.id,
          doctorId: resolvedDoctorId,
          organizationId: patient.organizationId,
          patientCanSend: false, // Strictly false by default
          status: 'Faol',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        raw.conversations.unshift(conv);
        repo.saveState(raw);
      }

      res.json({ conversation: conv });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Suhbat ochishda xatolik' });
    }
  });

  // Update patientCanSend permission (Strictly restricted to authorized doctor/clinician)
  app.patch('/api/chat/conversations/:id/permission', (req, res) => {
    try {
      const { actorId, patientCanSend, patientId, doctorId } = req.body;
      const raw = repo.getRawState();
      const actor = raw.users.find((u) => u.id === actorId);
      if (!actor) {
        res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi.' });
        return;
      }

      // Patients and Caregivers can NEVER change chat permissions
      if (
        actor.role !== 'TREATING_DOCTOR' &&
        actor.role !== 'FAMILY_DOCTOR' &&
        actor.role !== 'CLINIC_ADMIN' &&
        actor.role !== 'NURSE'
      ) {
        res.status(403).json({
          error: 'Faqat vakolatli shifokor bemorga yozish ruxsatini o‘zgartira oladi.',
        });
        return;
      }

      let conv = raw.conversations.find((c) => c.id === req.params.id);
      if (!conv && patientId) {
        const pat = raw.patients.find((p) => p.id === patientId);
        if (!pat) {
          res.status(404).json({ error: 'Bemor topilmadi.' });
          return;
        }
        const resolvedDocId =
          doctorId || actor.linkedDoctorId || pat.treatingDoctorId || 'doc-1';
        conv = raw.conversations.find(
          (c) => c.patientId === pat.id && c.doctorId === resolvedDocId
        );
        if (!conv) {
          const nowIso = repo.getEffectiveNowIso();
          conv = {
            id: `conv-${pat.id}-${resolvedDocId}`,
            patientId: pat.id,
            doctorId: resolvedDocId,
            organizationId: pat.organizationId,
            patientCanSend: false,
            status: 'Faol',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          raw.conversations.unshift(conv);
        }
      }

      if (!conv) {
        res.status(404).json({ error: 'Suhbat topilmadi.' });
        return;
      }

      const patient = raw.patients.find((p) => p.id === conv!.patientId);
      if (!patient) {
        res.status(404).json({ error: 'Bemor topilmadi.' });
        return;
      }

      const access = canActorAccessPatient(actor, patient, raw);
      if (!access.allowed) {
        res.status(403).json({ error: access.reason || 'Bemor suhbatiga ruxsat yo‘q.' });
        return;
      }

      // Verify doctor owns or is authorized for this patient's conversation
      if (
        actor.linkedDoctorId &&
        conv.doctorId !== actor.linkedDoctorId &&
        patient.treatingDoctorId !== actor.linkedDoctorId &&
        patient.familyDoctorId !== actor.linkedDoctorId &&
        actor.role !== 'CLINIC_ADMIN'
      ) {
        res.status(403).json({
          error: 'Faqat bemorga biriktirilgan shifokor yozish ruxsatini boshqara oladi.',
        });
        return;
      }

      const nowIso = repo.getEffectiveNowIso();
      conv.patientCanSend = Boolean(patientCanSend);
      conv.updatedAt = nowIso;

      appendAuditLog(raw, {
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        organizationId: conv.organizationId,
        patientId: patient.id,
        action: conv.patientCanSend
          ? 'Bemorga chatda yozish ruxsati berildi'
          : 'Bemorning chatda yozish ruxsati o‘chirildi',
        details: `${patient.fullName} uchun "patientCanSend" = ${conv.patientCanSend}`,
        entityType: 'CHAT',
        entityId: conv.id,
      });

      repo.saveState(raw);
      res.json({
        conversation: conv,
        message: 'Xabar yozish ruxsati yangilandi.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ruxsatni yangilashda xatolik' });
    }
  });

  // Send a chat message (Enforces patientCanSend === true when sender is PATIENT/CAREGIVER)
  app.post('/api/chat/messages', (req, res) => {
    try {
      const { actorId, conversationId, patientId, doctorId, content } = req.body;
      const trimmed = String(content || '').trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Xabar matni bo‘sh bo‘lishi mumkin emas.' });
        return;
      }

      const raw = repo.getRawState();
      const actor = raw.users.find((u) => u.id === actorId);
      if (!actor) {
        res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi.' });
        return;
      }

      let conv = conversationId
        ? raw.conversations.find((c) => c.id === conversationId)
        : undefined;

      if (!conv && patientId) {
        const pat = raw.patients.find((p) => p.id === patientId);
        if (!pat) {
          res.status(404).json({ error: 'Bemor topilmadi.' });
          return;
        }
        const resolvedDocId =
          doctorId || actor.linkedDoctorId || pat.treatingDoctorId || 'doc-1';
        conv = raw.conversations.find(
          (c) => c.patientId === pat.id && c.doctorId === resolvedDocId
        );
        if (!conv) {
          // Only a doctor/clinician can auto-create a conversation when sending the first message
          if (actor.role === 'PATIENT' || actor.role === 'CAREGIVER') {
            res.status(403).json({
              error: 'Shifokoringiz hozircha xabar yozishga ruxsat bermagan.',
            });
            return;
          }
          const nowIso = repo.getEffectiveNowIso();
          conv = {
            id: `conv-${pat.id}-${resolvedDocId}`,
            patientId: pat.id,
            doctorId: resolvedDocId,
            organizationId: pat.organizationId,
            patientCanSend: false,
            status: 'Faol',
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          raw.conversations.unshift(conv);
        }
      }

      if (!conv) {
        res.status(404).json({ error: 'Suhbat topilmadi.' });
        return;
      }

      if (conv.status !== 'Faol') {
        res.status(403).json({ error: 'Ushbu suhbat yopilgan.' });
        return;
      }

      const patient = raw.patients.find((p) => p.id === conv!.patientId);
      if (!patient) {
        res.status(404).json({ error: 'Bemor topilmadi.' });
        return;
      }

      // Verify care relationship access
      const access = canActorAccessPatient(actor, patient, raw);
      if (!access.allowed) {
        res.status(403).json({ error: access.reason || 'Suhbatga ruxsat yo‘q.' });
        return;
      }

      // CRITICAL SECURITY RULE: If sender is a patient or caregiver, verify they belong to this conversation AND patientCanSend === true
      if (actor.role === 'PATIENT' || actor.role === 'CAREGIVER') {
        if (actor.linkedPatientId !== conv.patientId) {
          res.status(403).json({
            error: 'Siz faqat o‘zingizga tegishli shifokor suhbatida qatnasha olasiz.',
          });
          return;
        }
        if (conv.patientCanSend !== true) {
          res.status(403).json({
            error: 'Shifokoringiz hozircha xabar yozishga ruxsat bermagan.',
          });
          return;
        }
      }

      const nowIso = repo.getEffectiveNowIso();
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        conversationId: conv.id,
        patientId: conv.patientId,
        doctorId: conv.doctorId,
        senderId: actor.id,
        senderName: actor.fullName,
        senderRole: actor.role,
        content: trimmed,
        createdAt: nowIso,
      };

      raw.messages.push(newMessage);
      conv.updatedAt = nowIso;

      appendAuditLog(raw, {
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        organizationId: conv.organizationId,
        patientId: patient.id,
        action:
          actor.role === 'PATIENT' || actor.role === 'CAREGIVER'
            ? 'Bemor shifokorga chat xabari yubordi'
            : 'Shifokor bemorga chat xabari yubordi',
        details: `${actor.fullName}: "${trimmed.slice(0, 80)}"`,
        entityType: 'CHAT',
        entityId: newMessage.id,
      });

      repo.saveState(raw);
      res.status(201).json({
        message: newMessage,
        conversation: conv,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Xabar yuborishda xatolik' });
    }
  });

  // Mark messages in a conversation as read by the current actor
  app.post('/api/chat/conversations/:id/read', (req, res) => {
    try {
      const { actorId } = req.body;
      const raw = repo.getRawState();
      const actor = raw.users.find((u) => u.id === actorId);
      if (!actor) {
        res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi.' });
        return;
      }

      const conv = raw.conversations.find((c) => c.id === req.params.id);
      if (!conv) {
        res.status(404).json({ error: 'Suhbat topilmadi.' });
        return;
      }

      const isPatientSide = actor.role === 'PATIENT' || actor.role === 'CAREGIVER';
      const nowIso = repo.getEffectiveNowIso();
      let updatedCount = 0;

      for (const msg of raw.messages) {
        if (msg.conversationId === conv.id && !msg.readAt) {
          const msgFromPatient =
            msg.senderRole === 'PATIENT' || msg.senderRole === 'CAREGIVER';
          if (isPatientSide && !msgFromPatient) {
            msg.readAt = nowIso;
            updatedCount++;
          } else if (!isPatientSide && msgFromPatient) {
            msg.readAt = nowIso;
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        repo.saveState(raw);
      }

      res.json({ ok: true, updatedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'O‘qilgan deb belgilashda xatolik' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareBridge AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
