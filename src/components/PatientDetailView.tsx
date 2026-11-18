import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FilePlus,
  HeartPulse,
  History,
  MessageSquare,
  Phone,
  PhoneCall,
  Pill,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import {
  AIConversation,
  AIReport,
  AuditLog,
  CareCase,
  ConsentRecord,
  DailyCheckIn,
  DoctorProfile,
  FollowUpTask,
  MedicationEvent,
  MedicationPlan,
  MedicationReportedStatus,
  NotificationItem,
  Organization,
  Patient,
  TranscriptMessage,
  UserAccount,
} from '../shared/types';
import { formatShortTime, formatUzDateTime } from '../utils/formatters';
import { ConfirmationDialog, StatusBadge } from './SharedUI';

interface PatientDetailViewProps {
  patient: Patient;
  actor: UserAccount;
  effectiveNowIso: string;
  organizations: Organization[];
  doctors: DoctorProfile[];
  careCases: CareCase[];
  followUpTasks: FollowUpTask[];
  medicationPlans: MedicationPlan[];
  medicationEvents: MedicationEvent[];
  dailyCheckIns: DailyCheckIn[];
  notifications: NotificationItem[];
  aiConversations: AIConversation[];
  aiReports: AIReport[];
  consents: ConsentRecord[];
  auditLogs: AuditLog[];
  initialTab?: PatientThreeTabId;
  onBack: () => void;
  onOpenDischargeModal: (patientId: string) => void;
  onCreateMedicationPlan: (payload: any) => Promise<void>;
  onRespondMedicationEvent: (
    eventId: string,
    status: MedicationReportedStatus,
    note?: string
  ) => Promise<void>;
  onSubmitCheckIn: (payload: any) => Promise<void>;
  onReviewCheckIn: (checkInId: string, note: string) => Promise<void>;
  onAddClinicalNote: (caseId: string, content: string) => Promise<void>;
  onGenerateAiReport: (patientId: string) => Promise<void>;
  onReviewAiReport: (
    reportId: string,
    doctorEditableNotes: string,
    markReviewed: boolean
  ) => Promise<void>;
  onTriggerSms: (patientId: string, type: string, customMessage?: string) => Promise<void>;
  onUpdateTask: (taskId: string, payload: any) => Promise<void>;
  onRefreshState: () => Promise<void>;
}

export type PatientThreeTabId = 'umumiy' | 'dorilar' | 'tarix';

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
  actor,
  effectiveNowIso,
  organizations,
  doctors,
  careCases,
  followUpTasks,
  medicationPlans,
  medicationEvents,
  dailyCheckIns,
  notifications,
  aiConversations,
  aiReports,
  auditLogs,
  initialTab = 'umumiy',
  onBack,
  onOpenDischargeModal,
  onCreateMedicationPlan,
  onRespondMedicationEvent,
  onSubmitCheckIn,
  onReviewCheckIn,
  onAddClinicalNote,
  onGenerateAiReport,
  onTriggerSms,
  onUpdateTask,
  onRefreshState,
}) => {
  const [activeTab, setActiveTab] = useState<PatientThreeTabId>(initialTab);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  // Quick Note ("Qayd qo‘shish") modal / inline box
  const [showAddNoteBox, setShowAddNoteBox] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [localNotes, setLocalNotes] = useState<
    { id: string; authorName: string; authorRole: string; content: string; createdAt: string }[]
  >([]);

  // Contact patient ("Bemor bilan bog‘lanish") expandable panel
  const [showContactPanel, setShowContactPanel] = useState(false);

  // Expandable clinical details on Umumiy
  const [showExtraClinicalDetails, setShowExtraClinicalDetails] = useState(false);

  // Medication plan form state
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [medName, setMedName] = useState('Demo-Kardio Plus');
  const [medStrength, setMedStrength] = useState('10 mg');
  const [medForm, setMedForm] = useState<'Tabletka' | 'Kapsula' | 'Eritma' | 'Sprey'>('Tabletka');
  const [medTimes, setMedTimes] = useState('09:00, 21:00');
  const [medInstructions, setMedInstructions] = useState('Ovqatdan so‘ng 1 stakan suv bilan');
  const [creatingMed, setCreatingMed] = useState(false);

  // Daily check-in form state (inside Tarix)
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [feeling, setFeeling] = useState<
    'Yaxshi' | 'O‘rtacha' | 'Bezovtalik bor' | 'Og‘riq kuchaygan'
  >('Yaxshi');
  const [painScore, setPainScore] = useState(2);
  const [symptoms, setSymptoms] = useState('');
  const [bloodPressure, setBloodPressure] = useState('126/80');
  const [temperatureC, setTemperatureC] = useState(36.6);
  const [wantDoctorContact, setWantDoctorContact] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // AI Voice Simulator & AI Report state (inside Tarix expandable section)
  const [showAiTools, setShowAiTools] = useState(false);
  const [generatingAiReport, setGeneratingAiReport] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<
    'Dori qabulini tasdiqlash' | 'Kunlik holat so‘rovi' | 'Chiqarishdan keyingi 24s muloqot'
  >('Dori qabulini tasdiqlash');
  const [liveTranscript, setLiveTranscript] = useState<TranscriptMessage[]>([]);
  const [patientInput, setPatientInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [latestSummary, setLatestSummary] = useState<
    AIConversation['structuredSummary'] | null
  >(null);

  // Recovery Plan ("Nazorat rejasini yaratish") builder state
  const RECOVERY_TEMPLATES: Record<
    'Jarrohlik' | 'Stomatologiya' | 'Umumiy tibbiyot',
    {
      title: string;
      durationDays: number;
      painThreshold: number;
      instructions: string;
      questions: string[];
    }
  > = {
    Jarrohlik: {
      title: 'Operatsiyadan keyingi nazorat rejasi (Jarrohlik)',
      durationDays: 10,
      painThreshold: 6,
      instructions:
        'Chok sohasini toza saqlang, og‘ir yuk ko‘tarmang, dorilarni vaqtida iching va har kuni holatingizni belgilang.',
      questions: [
        'Bugun o‘zingizni qanday his qilyapsiz?',
        'Operatsiya joyida og‘riq darajasi (0–10) nechchi?',
        'Jarohat sohasida qizarish, shish yoki harorat ko‘tarilishi bormi?',
        'Shifokor bilan bog‘lanishni xohlaysizmi?',
      ],
    },
    Stomatologiya: {
      title: 'Stomatologik muolajadan keyingi nazorat rejasi',
      durationDays: 5,
      painThreshold: 5,
      instructions:
        'Issiq ovqat yemang, belgilangan antiseptik va og‘riq qoldiruvchi vositalarni vaqtida qabul qiling.',
      questions: [
        'Bugun o‘zingizni qanday his qilyapsiz?',
        'Tish yoki milk sohasida og‘riq darajasi (0–10) nechchi?',
        'Yonoq shishi yoki qon ketishi kuzatildimi?',
        'Shifokor bilan bog‘lanishni xohlaysizmi?',
      ],
    },
    'Umumiy tibbiyot': {
      title: 'Statsionardan keyingi umumiy nazorat rejasi',
      durationDays: 7,
      painThreshold: 6,
      instructions:
        'Qon bosimini kuniga 2 mahal o‘lchang, shifokor buyurgan dorilarni vaqtida qabul qiling va kunlik so‘rovnomani to‘ldiring.',
      questions: [
        'Bugun o‘zingizni qanday his qilyapsiz?',
        'Og‘riq yoki noqulaylik darajangiz (0–10) nechchi?',
        'Yangi shikoyat (bosh aylanishi, holsizlik, bosim o‘zgarishi) bormi?',
        'Shifokor bilan bog‘lanishni xohlaysizmi?',
      ],
    },
  };

  const existingPlan = careCases[0]?.recoveryPlan || patient.recoveryPlan;
  const defaultTplKey: 'Jarrohlik' | 'Stomatologiya' | 'Umumiy tibbiyot' =
    patient.specialtyCategory === 'Jarrohlik'
      ? 'Jarrohlik'
      : patient.specialtyCategory === 'Stomatologiya'
      ? 'Stomatologiya'
      : 'Umumiy tibbiyot';

  const [showRecoveryPlanBuilder, setShowRecoveryPlanBuilder] = useState(false);
  const [planTemplate, setPlanTemplate] = useState<
    'Jarrohlik' | 'Stomatologiya' | 'Umumiy tibbiyot'
  >(existingPlan?.templateType || defaultTplKey);
  const [planTitle, setPlanTitle] = useState(
    existingPlan?.title || RECOVERY_TEMPLATES[defaultTplKey].title
  );
  const [planDurationDays, setPlanDurationDays] = useState(
    existingPlan?.durationDays || RECOVERY_TEMPLATES[defaultTplKey].durationDays
  );
  const [planPainThreshold, setPlanPainThreshold] = useState(
    existingPlan?.painThreshold ?? RECOVERY_TEMPLATES[defaultTplKey].painThreshold
  );
  const [planFlagNewComplaint, setPlanFlagNewComplaint] = useState(
    existingPlan?.flagAnyNewComplaint ?? true
  );
  const [planInstructions, setPlanInstructions] = useState(
    existingPlan?.instructions || RECOVERY_TEMPLATES[defaultTplKey].instructions
  );
  const [planQuestionsText, setPlanQuestionsText] = useState(
    (
      existingPlan?.checkInQuestions || RECOVERY_TEMPLATES[defaultTplKey].questions
    ).join('\n')
  );
  const [savingRecoveryPlan, setSavingRecoveryPlan] = useState(false);
  const [taskActionNote, setTaskActionNote] = useState('');

  const handleSelectPlanTemplate = (
    tpl: 'Jarrohlik' | 'Stomatologiya' | 'Umumiy tibbiyot'
  ) => {
    setPlanTemplate(tpl);
    setPlanTitle(RECOVERY_TEMPLATES[tpl].title);
    setPlanDurationDays(RECOVERY_TEMPLATES[tpl].durationDays);
    setPlanPainThreshold(RECOVERY_TEMPLATES[tpl].painThreshold);
    setPlanInstructions(RECOVERY_TEMPLATES[tpl].instructions);
    setPlanQuestionsText(RECOVERY_TEMPLATES[tpl].questions.join('\n'));
  };

  const handleActivateRecoveryPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRecoveryPlan(true);
    try {
      const parsedQuestions = planQuestionsText
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);
      await fetch(`/api/patients/${patient.id}/recovery-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: actor.id,
          templateType: planTemplate,
          title: planTitle,
          durationDays: planDurationDays,
          checkInQuestions: parsedQuestions,
          painThreshold: planPainThreshold,
          flagAnyNewComplaint: planFlagNewComplaint,
          flagDoctorContactRequest: true,
          instructions: planInstructions,
        }),
      });
      setShowRecoveryPlanBuilder(false);
      await onRefreshState();
    } finally {
      setSavingRecoveryPlan(false);
    }
  };

  const clinic = organizations.find((o) => o.id === patient.organizationId);
  const treatingDoc = doctors.find((d) => d.id === patient.treatingDoctorId);
  const familyDoc = doctors.find((d) => d.id === patient.familyDoctorId);

  // Ensure every patient has complete, realistic clinical records
  const effectiveCase: CareCase = useMemo(() => {
    if (careCases.length > 0) return careCases[0];
    return {
      id: `case-${patient.id}`,
      patientId: patient.id,
      organizationId: patient.organizationId,
      treatingDoctorId: patient.treatingDoctorId,
      familyDoctorId: patient.familyDoctorId,
      careType:
        patient.specialtyCategory === 'Stomatologiya'
          ? 'Stomatologik kuzatuv'
          : 'Shifoxonadan chiqarish (Challenge #11)',
      diagnosisOrProcedureSummary: `${patient.careCaseType} (${patient.specialtyCategory} bo‘limi). Statsionar/ambulator muolaja yakunlanib, rejaviy uy sharoitida tiklanish va dori nazoratiga o‘tkazilgan.`,
      dischargeInstructions:
        'Shifokor buyurgan dori vositalarini belgilangan vaqtda qabul qilish, kunlik o‘zini his qilish va og‘riq darajasini ilovada belgilash, bezovtalik kuchaysa shifokor bilan bog‘lanish.',
      priority:
        patient.caseStatus === 'Shifokor ko‘rishi kerak' ? 'Yuqori' : 'O‘rta',
      dischargeAt: patient.dischargeOrProcedureDate,
      followUpDeadlineAt: '2026-11-18T14:00:00+05:00',
      nextAppointmentAt: '2026-11-22T10:00:00+05:00',
      caseStatus: patient.caseStatus,
      clinicalNotes: [
        {
          id: `note-default-${patient.id}`,
          careCaseId: `case-${patient.id}`,
          authorId: treatingDoc?.userId || 'usr-doc-1',
          authorName: treatingDoc?.fullName || 'Dr. Sardor Rahimov',
          authorRole: treatingDoc?.specialty || 'Davolovchi shifokor',
          content: `Bemor ${patient.fullName} (${patient.careCaseType}) bo‘yicha ambulator kuzatuvga olindi. Dori rejasi va kunlik holat monitoringi faollashtirildi.`,
          createdAt: patient.dischargeOrProcedureDate,
        },
      ],
      startedAt: patient.dischargeOrProcedureDate,
      isSynthetic: true,
    };
  }, [careCases, patient, treatingDoc]);

  const effectiveMedPlans: MedicationPlan[] = useMemo(() => {
    if (medicationPlans.length > 0) return medicationPlans;
    const isDental = patient.specialtyCategory === 'Stomatologiya';
    const isSurg = patient.specialtyCategory === 'Jarrohlik';
    return [
      {
        id: `mp-fallback-1-${patient.id}`,
        careCaseId: effectiveCase.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        approvedByDoctorId: patient.treatingDoctorId,
        medicationName: isDental
          ? 'Demo-Amoksi Forte'
          : isSurg
          ? 'Demo-Seftriakson A'
          : 'Demo-Kardio A',
        strength: isDental ? '500 mg' : '10 mg',
        form: 'Tabletka',
        prescribedDose: '1 tabletkadan kuniga 2 mahal',
        frequency: 'Ertalab va kechqurun',
        dosageInstructions: 'Ovqatdan keyin 1 stakan suv bilan qabul qilinsin',
        scheduledTimes: ['09:00', '21:00'],
        startDate: '2026-11-14',
        endDate: '2026-11-28',
        status: 'Faol',
        isSynthetic: true,
      },
    ];
  }, [medicationPlans, patient, effectiveCase.id]);

  const effectiveMedEvents: MedicationEvent[] = useMemo(() => {
    if (medicationEvents.length > 0) return medicationEvents;
    const primaryPlan = effectiveMedPlans[0];
    const needsReview = patient.caseStatus === 'Shifokor ko‘rishi kerak';
    return [
      {
        id: `me-fallback-1-${patient.id}`,
        medicationPlanId: primaryPlan.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        medicationName: `${primaryPlan.medicationName} (${primaryPlan.strength}) — 09:00 dozasi`,
        scheduledTimeLabel: '09:00',
        scheduledAt: '2026-11-17T09:00:00+05:00',
        respondedAt: '2026-11-17T09:10:00+05:00',
        reportedStatus: 'Ichdim',
        notificationStatus: 'Yuborildi (Simulyatsiya)',
        patientNote: 'Ertalab o‘z vaqtida qabul qildim.',
        isSynthetic: true,
      },
      {
        id: `me-fallback-2-${patient.id}`,
        medicationPlanId: primaryPlan.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        medicationName: `${primaryPlan.medicationName} (${primaryPlan.strength}) — 21:00 dozasi`,
        scheduledTimeLabel: '21:00',
        scheduledAt: '2026-11-17T21:00:00+05:00',
        reportedStatus: needsReview ? 'O‘tkazib yubordim' : 'Tasdiqlanmagan',
        notificationStatus: needsReview ? 'Qayta eslatildi' : 'Kutilmoqda',
        isSynthetic: true,
      },
    ];
  }, [medicationEvents, effectiveMedPlans, patient]);

  const effectiveCheckIns: DailyCheckIn[] = useMemo(() => {
    const needsReview = patient.caseStatus === 'Shifokor ko‘rishi kerak';
    const baseHistory: DailyCheckIn[] = [
      {
        id: `chk-hist-1-${patient.id}`,
        careCaseId: effectiveCase.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        scheduledAt: '2026-11-16T10:00:00+05:00',
        submittedAt: '2026-11-16T10:15:00+05:00',
        overallFeeling: 'O‘rtacha',
        painScore: needsReview ? 5 : 3,
        reportedSymptoms: 'Og‘riq avvalgiga nisbatan kamaydi, uyqu va ishtaha yaxshilandi.',
        temperatureC: 36.7,
        bloodPressure: '126/80',
        requestedDoctorContact: false,
        reviewStatus: 'Javob berildi',
        reviewedByDoctorId: patient.treatingDoctorId,
        doctorReviewNote: 'Ijobiy o‘zgarish kuzatilmoqda.',
        isSynthetic: true,
      },
    ];
    if (dailyCheckIns.length > 0) {
      return [...dailyCheckIns, ...baseHistory];
    }
    return [
      {
        id: `chk-today-${patient.id}`,
        careCaseId: effectiveCase.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        scheduledAt: '2026-11-17T10:00:00+05:00',
        submittedAt: '2026-11-17T10:35:00+05:00',
        overallFeeling: needsReview ? 'Bezovtalik bor' : 'Yaxshi',
        painScore: needsReview ? 5 : 2,
        reportedSymptoms: needsReview
          ? 'Bugun biroz noqulaylik saqlanmoqda, shifokor maslahati zarur.'
          : 'Bugun o‘zimni ancha tetik his qilyapman, dorilarni vaqtida ichyapman.',
        temperatureC: 36.6,
        bloodPressure: '122/78',
        requestedDoctorContact: needsReview,
        reviewStatus: needsReview ? 'Shifokor ko‘rishi kerak' : 'Javob berildi',
        isSynthetic: true,
      },
      ...baseHistory,
    ];
  }, [dailyCheckIns, effectiveCase.id, patient]);

  const effectiveNotifications: NotificationItem[] = useMemo(() => {
    if (notifications.length > 0) return notifications;
    return [
      {
        id: `notif-fb-1-${patient.id}`,
        recipientId: patient.id,
        recipientName: patient.fullName,
        recipientPhone: patient.contact,
        patientId: patient.id,
        organizationId: patient.organizationId,
        channel: 'SMS (Simulyatsiya)',
        notificationType: 'Dori eslatmasi',
        message: `Hurmatli ${patient.fullName}, soat 09:00 dagi rejaviy dori vositasini qabul qilish vaqti bo‘ldi.`,
        status: 'Yetkazildi (Simulyatsiya)',
        isSimulation: true,
        createdAt: '2026-11-17T09:00:00+05:00',
        deliveredAt: '2026-11-17T09:00:03+05:00',
      },
    ];
  }, [notifications, patient]);

  const effectiveAiConversations: AIConversation[] = useMemo(() => {
    if (aiConversations.length > 0) return aiConversations;
    return [
      {
        id: `aiconv-fb-${patient.id}`,
        careCaseId: effectiveCase.id,
        patientId: patient.id,
        organizationId: patient.organizationId,
        conversationType: 'Dori qabulini tasdiqlash',
        transcript: [
          {
            speaker: 'AI',
            text: `Assalomu alaykum, ${patient.fullName}! Ertalabki dori vositasini qabul qilganingizni tasdiqlaysizmi?`,
            timestamp: '2026-11-17T09:15:00+05:00',
          },
          {
            speaker: 'PATIENT',
            text: 'Vaalaykum assalom, ha, nonushtadan keyin ichdim. Ahvolim yaxshi.',
            timestamp: '2026-11-17T09:15:20+05:00',
          },
        ],
        structuredSummary: {
          medicationConfirmed: 'Ha (bemor tasdiqladi)',
          reportedSymptoms: 'Yangi shikoyat qayd etilmadi',
          painLevelMentioned: effectiveCheckIns[0]?.painScore ?? 2,
          requestedDoctorCallback: false,
          requiresClinicianReview: false,
          summaryUz: `Bemor ${patient.fullName} rejaviy dorini qabul qilganini tasdiqladi, umumiy holati barqaror.`,
        },
        isSimulation: true,
        createdAt: '2026-11-17T09:16:00+05:00',
      },
    ];
  }, [aiConversations, effectiveCase.id, effectiveCheckIns, patient]);

  const allNotes = useMemo(
    () => [...localNotes, ...effectiveCase.clinicalNotes],
    [localNotes, effectiveCase.clinicalNotes]
  );

  const activeTask = followUpTasks[0];
  const latestCheckIn = effectiveCheckIns[0];
  const latestAiReport = aiReports[0];

  const isClinician =
    actor.role === 'TREATING_DOCTOR' ||
    actor.role === 'FAMILY_DOCTOR' ||
    actor.role === 'NURSE' ||
    actor.role === 'CLINIC_ADMIN' ||
    actor.role === 'SUPER_ADMIN';

  const takenMedsCount = effectiveMedEvents.filter(
    (e) => e.reportedStatus === 'Ichdim'
  ).length;
  const missedMeds = effectiveMedEvents.filter(
    (e) => e.reportedStatus === 'O‘tkazib yubordim'
  );
  const pendingMeds = effectiveMedEvents.filter(
    (e) => e.reportedStatus === 'Tasdiqlanmagan' || e.reportedStatus === 'Keyinroq'
  );

  // Build clear list of items requiring doctor attention (Card #4 in Umumiy)
  const attentionItems = useMemo(() => {
    const items: { text: string; urgent: boolean }[] = [];
    if (latestCheckIn.requestedDoctorContact) {
      items.push({
        text: 'Bemor shifokor bilan bog‘lanishni so‘radi',
        urgent: true,
      });
    }
    if (latestCheckIn.painScore >= 4) {
      items.push({
        text: `Bemor og‘riq darajasini ${latestCheckIn.painScore}/10 deb belgiladi (${latestCheckIn.reportedSymptoms})`,
        urgent: latestCheckIn.painScore >= 6,
      });
    }
    if (missedMeds.length > 0) {
      items.push({
        text: `${missedMeds.length} ta dori dozasi o‘tkazib yuborilgan (${missedMeds[0].medicationName})`,
        urgent: true,
      });
    } else if (pendingMeds.length > 0) {
      items.push({
        text: `${pendingMeds.length} ta dori qabuli bo‘yicha tasdiq kutilmoqda`,
        urgent: false,
      });
    }
    if (activeTask && activeTask.status !== 'Bajarildi') {
      items.push({
        text: `${activeTask.taskType} (${activeTask.status})`,
        urgent: activeTask.status === 'Muddati o‘tgan',
      });
    }
    return items;
  }, [latestCheckIn, missedMeds, pendingMeds, activeTask]);

  const activeRecoveryPlan = effectiveCase.recoveryPlan || patient.recoveryPlan;

  // Unified Recovery Timeline ("Nazorat tarixi"): check-ins, complaints, auto tasks, doctor actions, completions
  const recoveryTimeline = useMemo(() => {
    const events: {
      id: string;
      timestamp: string;
      type: 'PLAN' | 'CHECK_IN' | 'TASK_CREATED' | 'DOCTOR_ACTION' | 'TASK_COMPLETED';
      badge: string;
      badgeTone: string;
      title: string;
      detail: string;
    }[] = [];

    if (activeRecoveryPlan) {
      events.push({
        id: `tl-plan-${activeRecoveryPlan.id}`,
        timestamp: activeRecoveryPlan.activatedAt,
        type: 'PLAN',
        badge: 'Nazorat rejasi',
        badgeTone: 'bg-blue-50 text-[#1769E0] border-blue-200',
        title: `${activeRecoveryPlan.title} faollashtirildi`,
        detail: `${activeRecoveryPlan.activatedByDoctorName} · ${activeRecoveryPlan.durationDays} kunlik reja · Og‘riq chegarasi: >= ${activeRecoveryPlan.painThreshold}/10`,
      });
    }

    for (const chk of effectiveCheckIns) {
      const isConcerning =
        chk.reviewStatus === 'Shifokor ko‘rishi kerak' ||
        chk.painScore >= (activeRecoveryPlan?.painThreshold ?? 6) ||
        chk.requestedDoctorContact;
      events.push({
        id: `tl-chk-${chk.id}`,
        timestamp: chk.submittedAt,
        type: 'CHECK_IN',
        badge: isConcerning ? 'Shikoyat / Check-in' : 'Kunlik holat',
        badgeTone: isConcerning
          ? 'bg-red-50 text-[#DC2626] border-red-200'
          : 'bg-teal-50 text-[#12B8A6] border-teal-200',
        title: `Bemor kunlik holat yubordi: ${chk.overallFeeling} (Og‘riq: ${chk.painScore}/10)`,
        detail: `${chk.reportedSymptoms}${
          chk.doctorReviewNote ? ` · Shifokor xulosasi: ${chk.doctorReviewNote}` : ''
        }`,
      });
    }

    for (const t of followUpTasks) {
      events.push({
        id: `tl-task-create-${t.id}`,
        timestamp: t.createdAt,
        type: 'TASK_CREATED',
        badge: 'Avtomatik vazifa',
        badgeTone: 'bg-amber-50 text-amber-800 border-amber-200',
        title: `Vazifa yaratildi: ${t.taskType}`,
        detail: t.notes,
      });

      if (t.status === 'Bajarildi' && t.completedAt) {
        events.push({
          id: `tl-task-done-${t.id}`,
          timestamp: t.completedAt,
          type: 'TASK_COMPLETED',
          badge: 'Bajarildi',
          badgeTone: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
          title: `Vazifa yakunlandi (${t.contactMethod || 'Shifokor ko‘rigi'})`,
          detail: t.notes,
        });
      }
    }

    for (const n of allNotes) {
      events.push({
        id: `tl-note-${n.id}`,
        timestamp: n.createdAt,
        type: 'DOCTOR_ACTION',
        badge: 'Shifokor qaydi',
        badgeTone: 'bg-slate-100 text-[#152238] border-slate-300',
        title: `${n.authorName} (${n.authorRole})`,
        detail: n.content,
      });
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeRecoveryPlan, effectiveCheckIns, followUpTasks, allNotes]);

  const handleSaveDoctorNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    if (careCases.length > 0) {
      await onAddClinicalNote(effectiveCase.id, newNoteText.trim());
    } else {
      setLocalNotes((prev) => [
        {
          id: `local-note-${Date.now()}`,
          authorName: actor.fullName,
          authorRole: 'Shifokor',
          content: newNoteText.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setNewNoteText('');
    setShowAddNoteBox(false);
  };

  const handleStartSimulatedCall = () => {
    const greeting =
      callType === 'Dori qabulini tasdiqlash'
        ? `Assalomu alaykum, ${patient.fullName}! Men Carely virtual yordamchisiman. Sizga dori qabul qilish bo‘yicha eslatma yuborilgan edi. Dorini qabul qilganingizni tasdiqlaysizmi?`
        : `Assalomu alaykum, ${patient.fullName}! Men Carely virtual yordamchisiman. Bugun o‘zingizni qanday his qilyapsiz va og‘riq darajangiz 0 dan 10 gacha nechchi?`;

    setLiveTranscript([
      {
        speaker: 'AI',
        text: greeting,
        timestamp: effectiveNowIso,
      },
    ]);
    setLatestSummary(null);
    setCallActive(true);
  };

  const handleSendVoiceResponse = async (quickReply?: string) => {
    const textToSend = (quickReply ?? patientInput).trim();
    if (!textToSend || aiThinking) return;

    const userMsg: TranscriptMessage = {
      speaker: 'PATIENT',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };
    const updatedTranscript = [...liveTranscript, userMsg];
    setLiveTranscript(updatedTranscript);
    setPatientInput('');
    setAiThinking(true);

    try {
      const resp = await fetch('/api/ai/call-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          conversationType: callType,
          transcript: updatedTranscript,
          patientMessage: textToSend,
        }),
      });
      const data = await resp.json();
      const aiMsg: TranscriptMessage = {
        speaker: 'AI',
        text:
          data.aiReply ||
          'Rahmat, javobingiz qayd etildi va shifokoringizga yuboriladi.',
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setLiveTranscript([...updatedTranscript, aiMsg]);
      if (data.structuredSummary) {
        setLatestSummary(data.structuredSummary);
      }
    } finally {
      setAiThinking(false);
    }
  };

  const handleEndAndSaveCall = async () => {
    if (liveTranscript.length === 0) {
      setCallActive(false);
      return;
    }
    await fetch('/api/ai/call-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        conversationType: callType,
        transcript: liveTranscript,
        structuredSummary: latestSummary || {
          medicationConfirmed: 'Ha (bemor tasdiqladi)',
          reportedSymptoms: 'Muloqot davomida qayd etildi',
          painLevelMentioned: 2,
          requestedDoctorCallback: false,
          requiresClinicianReview: false,
          summaryUz: 'Simulyatsiya muloqoti saqlandi.',
        },
      }),
    });
    setCallActive(false);
    await onRefreshState();
  };

  // Strictly THREE simple tabs: Umumiy | Dorilar | Tarix
  const tabs: {
    id: PatientThreeTabId;
    label: string;
  }[] = [
    { id: 'umumiy', label: 'Umumiy' },
    { id: 'dorilar', label: 'Dorilar' },
    { id: 'tarix', label: 'Tarix' },
  ];

  return (
    <div className="space-y-6 text-base">
      {/* =====================================================================
          1. SIMPLE PATIENT HEADER + 3 LARGE CLEAR ACTION BUTTONS + 3 TABS
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Patient Identity: Only Name, Age, Treatment Type, Assigned Doctor, and Follow-Up Status */}
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-[#152238] flex items-center gap-2 text-base font-bold shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Orqaga</span>
            </button>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#152238]">
                  {patient.fullName}
                </h1>
                <span className="text-lg font-semibold text-[#64748B]">
                  ({patient.age} yosh)
                </span>
                <StatusBadge status={patient.caseStatus} />
              </div>

              <div className="text-base sm:text-lg font-semibold text-[#152238]">
                {patient.careCaseType}
              </div>

              <div className="text-base text-[#64748B]">
                Mas’ul shifokor:{' '}
                <strong className="text-[#152238]">
                  {treatingDoc?.fullName || 'Dr. Sardor Rahimov'}
                </strong>
                {familyDoc ? ` · Oilaviy shifokor: ${familyDoc.fullName}` : ''}
              </div>
            </div>
          </div>

          {/* Clear Action Buttons */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 w-full lg:w-auto">
            {isClinician && (
              <button
                type="button"
                onClick={() => setShowRecoveryPlanBuilder(!showRecoveryPlanBuilder)}
                className="min-h-[48px] px-5 py-3 text-base font-bold text-white bg-[#12B8A6] hover:bg-teal-600 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
              >
                <HeartPulse className="w-5 h-5" />
                <span>
                  {activeRecoveryPlan
                    ? 'Nazorat rejasini sozlash'
                    : 'Nazorat rejasini yaratish'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowContactPanel(!showContactPanel)}
              className="min-h-[48px] px-5 py-3 text-base font-bold text-white bg-[#1769E0] hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>Bemor bilan bog‘lanish</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddNoteBox(true);
              }}
              className="min-h-[48px] px-5 py-3 text-base font-bold text-[#152238] bg-[#F7FAFC] hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
            >
              <FilePlus className="w-5 h-5 text-[#1769E0]" />
              <span>Qayd qo‘shish</span>
            </button>

            {isClinician && patient.caseStatus !== 'Yakunlangan' && (
              <button
                type="button"
                onClick={() => setConfirmCompleteOpen(true)}
                className="min-h-[48px] px-5 py-3 text-base font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Kuzatuvni yakunlash</span>
              </button>
            )}
          </div>
        </div>

        {/* Recovery Plan Builder ("Nazorat rejasini yaratish") */}
        {showRecoveryPlanBuilder && (
          <form
            onSubmit={handleActivateRecoveryPlan}
            className="p-5 rounded-2xl bg-[#F7FAFC] border-2 border-[#12B8A6]/40 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                  Davolanishdan keyingi nazorat rejasini yaratish
                </h3>
                <p className="text-sm text-[#64748B]">
                  Shablonni tanlang, kunlik savollar va avtomatik vazifa qoidalarini tasdiqlang
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-teal-50 text-[#12B8A6] border border-teal-200">
                1. Shablon → 2. Savollar → 3. Faollashtirish
              </span>
            </div>

            {/* 3 Simple Template Buttons: Jarrohlik | Stomatologiya | Umumiy tibbiyot */}
            <div>
              <label className="block text-sm font-bold text-[#152238] mb-2">
                1. Yo‘nalish shablonini tanlang:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['Jarrohlik', 'Stomatologiya', 'Umumiy tibbiyot'] as const).map(
                  (tpl) => {
                    const selected = planTemplate === tpl;
                    return (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => handleSelectPlanTemplate(tpl)}
                        className={`min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base border text-left flex items-center justify-between transition-colors ${
                          selected
                            ? 'bg-[#1769E0] text-white border-[#1769E0]'
                            : 'bg-white text-[#152238] border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{tpl}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-[#152238] mb-1">
                  Reja nomi
                </label>
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#152238] mb-1">
                  Davomiyligi (kun)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={planDurationDays}
                  onChange={(e) => setPlanDurationDays(Number(e.target.value) || 7)}
                  className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#152238] mb-1">
                2. Bemor uchun kunlik check-in savollari (har bir qatorda 1 ta savol):
              </label>
              <textarea
                rows={4}
                required
                value={planQuestionsText}
                onChange={(e) => setPlanQuestionsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white border border-slate-200">
              <div>
                <label className="block text-sm font-bold text-[#152238] mb-1">
                  3. Avtomatik vazifa ochish qoidasi — Og‘riq chegarasi: &ge;{' '}
                  {planPainThreshold}/10
                </label>
                <input
                  type="range"
                  min={3}
                  max={9}
                  value={planPainThreshold}
                  onChange={(e) => setPlanPainThreshold(Number(e.target.value))}
                  className="w-full accent-[#1769E0]"
                />
                <span className="text-xs text-[#64748B]">
                  Bemor og‘riqni {planPainThreshold} yoki undan yuqori belgilasa, Vazifalar bo‘limida avtomatik topshiriq ochiladi.
                </span>
              </div>

              <div className="flex flex-col justify-center gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm sm:text-base font-semibold text-[#152238]">
                  <input
                    type="checkbox"
                    checked={planFlagNewComplaint}
                    onChange={(e) => setPlanFlagNewComplaint(e.target.checked)}
                    className="w-4 h-4 accent-[#1769E0]"
                  />
                  <span>Yangi shikoyat yozilsa avtomatik vazifa yaratish</span>
                </label>
                <span className="text-xs text-[#64748B]">
                  Takroriy vazifalar yaratilmaydi (mavjud ochiq vazifa yangilanadi).
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#152238] mb-1">
                Bemor uchun shifokor ko‘rsatmasi
              </label>
              <input
                type="text"
                value={planInstructions}
                onChange={(e) => setPlanInstructions(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-base"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowRecoveryPlanBuilder(false)}
                className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#64748B]"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={savingRecoveryPlan}
                className="min-h-[46px] px-6 py-2.5 bg-[#12B8A6] hover:bg-teal-600 text-white text-base font-bold rounded-xl"
              >
                {savingRecoveryPlan
                  ? 'Faollashtirilmoqda...'
                  : 'Nazorat rejasini faollashtirish'}
              </button>
            </div>
          </form>
        )}

        {/* Expandable Contact Box when "Bemor bilan bog‘lanish" is clicked */}
        {showContactPanel && (
          <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-base font-bold text-[#152238]">
                Bemor telefoni: <span className="font-mono text-[#1769E0]">{patient.contact}</span>
              </div>
              <div className="text-sm text-[#64748B]">
                Yaqin qarindoshi: {patient.consentStatus.caregiverName || 'Biriktirilmagan'}{' '}
                {patient.consentStatus.caregiverPhone
                  ? `(${patient.consentStatus.caregiverPhone})`
                  : ''}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  await onTriggerSms(
                    patient.id,
                    'Dori eslatmasi',
                    `Hurmatli ${patient.fullName}, shifokoringiz ${actor.fullName} siz bilan bog‘lanmoqda. Dorilarni o‘z vaqtida qabul qilishni unutmang.`
                  );
                  setShowContactPanel(false);
                }}
                className="min-h-[44px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
              >
                SMS eslatma yuborish
              </button>
              <button
                type="button"
                onClick={() => setShowContactPanel(false)}
                className="min-h-[44px] px-4 py-2 bg-white border border-slate-300 text-[#152238] text-base font-semibold rounded-xl"
              >
                Yopish
              </button>
            </div>
          </div>
        )}

        {/* Expandable Quick Doctor Note Box when "Qayd qo‘shish" is clicked */}
        {showAddNoteBox && (
          <form
            onSubmit={handleSaveDoctorNote}
            className="p-4 sm:p-5 rounded-xl bg-[#F7FAFC] border border-slate-300 space-y-3"
          >
            <div className="font-display font-bold text-lg text-[#152238]">
              Shifokor qaydini qo‘shish
            </div>
            <textarea
              rows={3}
              required
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Bemor holati bo‘yicha xulosa yoki tavsiyani yozing..."
              className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl"
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddNoteBox(false)}
                className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#64748B]"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
              >
                Saqlash
              </button>
            </div>
          </form>
        )}

        {/* 3 SIMPLE TABS: Umumiy | Dorilar | Tarix */}
        <div
          className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-200"
          role="tablist"
        >
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
                className={`min-h-[48px] px-4 py-2.5 text-base sm:text-lg font-bold rounded-xl transition-colors text-center ${
                  active
                    ? 'bg-[#1769E0] text-white shadow-xs'
                    : 'bg-[#F7FAFC] text-[#152238] border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 1 — UMUMIY (Strictly the 4 Most Important Things + Optional Expandable Info)
         ===================================================================== */}
      {activeTab === 'umumiy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Latest patient-reported health condition and complaints */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                  1. Bemorning so‘nggi holati va shikoyatlari
                </h2>
                <StatusBadge status={latestCheckIn.reviewStatus} />
              </div>

              <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg">
                  <span className="font-bold text-[#152238]">
                    Umumiy holat: {latestCheckIn.overallFeeling}
                  </span>
                  <span>·</span>
                  <span className="font-bold text-[#1769E0]">
                    Og‘riq: {latestCheckIn.painScore}/10
                  </span>
                </div>

                <p className="text-base text-[#152238] leading-relaxed">
                  {latestCheckIn.reportedSymptoms}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-[#64748B]">
                  {latestCheckIn.bloodPressure && (
                    <span>Qon bosimi: <strong>{latestCheckIn.bloodPressure}</strong></span>
                  )}
                  {latestCheckIn.temperatureC && (
                    <span>Harorat: <strong>{latestCheckIn.temperatureC}°C</strong></span>
                  )}
                  <span>Vaqt: {formatUzDateTime(latestCheckIn.submittedAt)}</span>
                </div>
              </div>
            </div>

            {/* 2. Items requiring doctor attention */}
            <div
              className={`rounded-2xl p-5 sm:p-6 space-y-3 border ${
                attentionItems.some((i) => i.urgent)
                  ? 'bg-red-50/40 border-red-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                  2. Shifokor e’tiborini talab qiladigan holatlar
                </h2>
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 ${
                    attentionItems.some((i) => i.urgent)
                      ? 'text-[#DC2626]'
                      : 'text-[#64748B]'
                  }`}
                />
              </div>

              {attentionItems.length > 0 ? (
                <ul className="space-y-2.5">
                  {attentionItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3 text-base font-medium text-[#152238]"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${
                          item.urgent ? 'bg-[#DC2626]' : 'bg-amber-500'
                        }`}
                      />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-base font-semibold text-emerald-900">
                  Hozircha shoshilinch ogohlantirish yo‘q. Bemor rejali kuzatuvda.
                </div>
              )}
            </div>

            {/* 3. Medication schedule and intake confirmations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                    3. Dori jadvali va qabul tasdiqlari
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    Bugun tasdiqlangan dorilar: {takenMedsCount} / {effectiveMedEvents.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dorilar')}
                  className="min-h-[42px] px-3.5 py-2 text-sm font-bold text-[#1769E0] bg-blue-50 hover:bg-blue-100 rounded-xl"
                >
                  Barcha dorilar →
                </button>
              </div>

              <div className="space-y-2.5">
                {effectiveMedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-[#F7FAFC] border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-base text-[#152238] truncate">
                        {ev.medicationName}
                      </div>
                      <div className="text-sm text-[#64748B]">
                        Qabul vaqti: <strong>{ev.scheduledTimeLabel}</strong>
                      </div>
                    </div>
                    <StatusBadge status={ev.reportedStatus} />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Next follow-up appointment or task */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                  4. Keyingi uchrashuv va kuzatuv vazifasi
                </h2>
                <Calendar className="w-5 h-5 text-[#1769E0] shrink-0" />
              </div>

              {activeTask && activeTask.status !== 'Bajarildi' ? (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-base text-[#152238]">
                      {activeTask.taskType}
                    </span>
                    <StatusBadge status={activeTask.status} />
                  </div>
                  <p className="text-base text-[#152238]">{activeTask.notes}</p>
                  <div className="text-sm text-[#64748B]">
                    Muddat: <strong>{formatUzDateTime(activeTask.dueAt)}</strong>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    <input
                      type="text"
                      value={taskActionNote}
                      onChange={(e) => setTaskActionNote(e.target.value)}
                      placeholder="Shifokor izohi (masalan: Bemor bilan bog‘lanildi, tavsiya berildi)..."
                      className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                    />
                    <div className="flex flex-wrap gap-2.5">
                      {activeTask.status === 'Yangi' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTask(activeTask.id, {
                              actorId: actor.id,
                              status: 'Qabul qilindi',
                            })
                          }
                          className="min-h-[44px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
                        >
                          Vazifani qabul qilish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowContactPanel(true)}
                        className="min-h-[44px] px-4 py-2 bg-white border border-slate-300 text-[#152238] text-base font-bold rounded-xl"
                      >
                        Bemor bilan bog‘lanish
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateTask(activeTask.id, {
                            actorId: actor.id,
                            status: 'Bajarildi',
                            contactMethod: 'Telefon muloqoti',
                            notes:
                              taskActionNote.trim() ||
                              'Shifokor bemor bilan bog‘lanib, shikoyatni ko‘rib chiqdi va vazifani yakunladi.',
                          });
                          setTaskActionNote('');
                        }}
                        className="min-h-[44px] px-4 py-2 bg-[#16A34A] hover:bg-emerald-700 text-white text-base font-bold rounded-xl"
                      >
                        Bajarildi deb belgilash
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2">
                  <div className="font-bold text-base text-[#152238]">
                    Navbatdagi shifokor ko‘rigi:
                  </div>
                  <div className="text-lg font-bold text-[#1769E0]">
                    {formatUzDateTime(
                      effectiveCase.nextAppointmentAt || effectiveCase.followUpDeadlineAt
                    )}
                  </div>
                  <div className="text-sm text-[#64748B]">
                    Shifokor ko‘rsatmasi: {effectiveCase.dischargeInstructions}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Recovery Plan Summary Card (if created) */}
          {activeRecoveryPlan && (
            <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-[#12B8A6]">
                    FAOL NAZORAT REJASI · {activeRecoveryPlan.templateType}
                  </span>
                  <h3 className="font-display text-lg font-bold text-[#152238]">
                    {activeRecoveryPlan.title} ({activeRecoveryPlan.durationDays} kun)
                  </h3>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white border border-teal-200 text-[#152238]">
                  Ogohlantirish: Og‘riq &ge; {activeRecoveryPlan.painThreshold}/10
                </span>
              </div>
              <p className="text-sm sm:text-base text-[#152238]">
                <strong>Ko‘rsatma:</strong> {activeRecoveryPlan.instructions}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeRecoveryPlan.checkInQuestions.map((q, idx) => (
                  <span
                    key={idx}
                    className="text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#152238]"
                  >
                    {idx + 1}. {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* COMPACT RECOVERY TIMELINE ("Nazorat tarixi") */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                  Nazorat tarixi
                </h2>
                <p className="text-sm text-[#64748B]">
                  Kunlik check-inlar, shikoyatlar, avtomatik vazifalar va shifokor harakatlari
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tarix')}
                className="min-h-[40px] px-3.5 py-1.5 text-sm font-bold text-[#1769E0] bg-blue-50 hover:bg-blue-100 rounded-xl"
              >
                To‘liq tarix ({recoveryTimeline.length}) →
              </button>
            </div>

            <div className="space-y-2.5">
              {recoveryTimeline.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#F7FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${item.badgeTone}`}
                      >
                        {item.badge}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-[#152238]">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm text-[#64748B] truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs font-mono text-[#64748B] shrink-0">
                    {formatUzDateTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Expandable Secondary Clinical & Personal Details (Hidden by default to prevent clutter) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtraClinicalDetails(!showExtraClinicalDetails)}
              className="w-full min-h-[54px] px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-display font-bold text-base sm:text-lg text-[#152238]">
                Qo‘shimcha klinik va aloqa ma’lumotlari (Tashxis, ko‘rsatmalar, manzil)
              </span>
              {showExtraClinicalDetails ? (
                <ChevronUp className="w-5 h-5 text-[#64748B]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#64748B]" />
              )}
            </button>

            {showExtraClinicalDetails && (
              <div className="p-5 sm:p-6 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2">
                  <div className="font-bold text-[#152238]">
                    Klinik tashxis va shifokor ko‘rsatmasi:
                  </div>
                  <p className="text-[#152238]">
                    {effectiveCase.diagnosisOrProcedureSummary}
                  </p>
                  <p className="text-sm text-[#64748B] pt-1">
                    <strong>Ko‘rsatma:</strong> {effectiveCase.dischargeInstructions}
                  </p>
                  {isClinician && (
                    <button
                      type="button"
                      onClick={() => onOpenDischargeModal(patient.id)}
                      className="mt-2 min-h-[42px] px-4 py-2 text-sm font-bold text-[#1769E0] bg-blue-50 hover:bg-blue-100 rounded-xl"
                    >
                      Kuzatuv rejasini tahrirlash
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2">
                  <div className="font-bold text-[#152238]">
                    Bemor aloqa ma’lumotlari:
                  </div>
                  <div>
                    Telefon: <strong>{patient.contact}</strong>
                  </div>
                  <div>
                    Tuman / Manzil: <strong>{patient.district}</strong>
                  </div>
                  <div>
                    Muassasa: <strong>{clinic?.name.split('(')[0]}</strong>
                  </div>
                  <div>
                    Yaqin qarindoshi:{' '}
                    <strong>{patient.consentStatus.caregiverName || 'Biriktirilmagan'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2 — DORILAR (Medication schedule and intake confirmations)
         ===================================================================== */}
      {activeTab === 'dorilar' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#152238]">
                  Bugungi dori jadvali va qabul tasdiqlari ({takenMedsCount}/
                  {effectiveMedEvents.length})
                </h2>
                <p className="text-base text-[#64748B]">
                  Bemor qabul qilgan dorilarni tekshirish yoki belgilash
                </p>
              </div>
              {isClinician && (
                <button
                  type="button"
                  onClick={() => setShowAddMedForm(!showAddMedForm)}
                  className="min-h-[48px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
                >
                  {showAddMedForm ? 'Formani yopish' : '+ Yangi dori qo‘shish'}
                </button>
              )}
            </div>

            {showAddMedForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreatingMed(true);
                  try {
                    await onCreateMedicationPlan({
                      actorId: actor.id,
                      patientId: patient.id,
                      careCaseId: effectiveCase.id,
                      medicationName: medName,
                      strength: medStrength,
                      form: medForm,
                      prescribedDose: '1 dozadan belgilangan vaqtda',
                      frequency: 'Kunlik reja asosida',
                      dosageInstructions: medInstructions,
                      scheduledTimes: medTimes
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    setShowAddMedForm(false);
                  } finally {
                    setCreatingMed(false);
                  }
                }}
                className="p-5 rounded-xl bg-[#F7FAFC] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-base"
              >
                <div>
                  <label className="block font-bold text-[#152238] mb-1">
                    Dori nomi
                  </label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#152238] mb-1">
                      Dozasi
                    </label>
                    <input
                      type="text"
                      value={medStrength}
                      onChange={(e) => setMedStrength(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#152238] mb-1">
                      Shakli
                    </label>
                    <select
                      value={medForm}
                      onChange={(e) => setMedForm(e.target.value as any)}
                      className="w-full min-h-[46px] px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="Tabletka">Tabletka</option>
                      <option value="Kapsula">Kapsula</option>
                      <option value="Eritma">Eritma</option>
                      <option value="Sprey">Sprey</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[#152238] mb-1">
                    Qabul vaqtlari (vergul bilan)
                  </label>
                  <input
                    type="text"
                    value={medTimes}
                    onChange={(e) => setMedTimes(e.target.value)}
                    placeholder="09:00, 14:00, 21:00"
                    className="w-full min-h-[46px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#152238] mb-1">
                    Qabul qilish yo‘riqnomasi
                  </label>
                  <input
                    type="text"
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMedForm(false)}
                    className="min-h-[46px] px-4 py-2 font-semibold text-[#64748B]"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={creatingMed}
                    className="min-h-[46px] px-6 py-2.5 bg-[#1769E0] text-white font-bold rounded-xl"
                  >
                    {creatingMed ? 'Saqlanmoqda...' : 'Dori rejasini saqlash'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {effectiveMedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-[#F7FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-bold text-[#1769E0]">
                        Soat {ev.scheduledTimeLabel}
                      </span>
                      <StatusBadge status={ev.reportedStatus} />
                    </div>
                    <div className="font-display text-lg font-bold text-[#152238]">
                      {ev.medicationName}
                    </div>
                    {ev.patientNote && (
                      <div className="text-base text-[#64748B]">
                        Izoh: {ev.patientNote}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onRespondMedicationEvent(ev.id, 'Ichdim')}
                      className={`min-h-[46px] px-4 py-2 text-base font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'Ichdim'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-white border border-slate-300 text-[#152238] hover:border-[#16A34A]'
                      }`}
                    >
                      Ichdim
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondMedicationEvent(ev.id, 'Keyinroq')}
                      className={`min-h-[46px] px-4 py-2 text-base font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'Keyinroq'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-white border border-slate-300 text-[#152238] hover:border-[#F59E0B]'
                      }`}
                    >
                      Keyinroq
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onRespondMedicationEvent(ev.id, 'O‘tkazib yubordim')
                      }
                      className={`min-h-[46px] px-4 py-2 text-base font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'O‘tkazib yubordim'
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-white border border-slate-300 text-[#152238] hover:border-[#DC2626]'
                      }`}
                    >
                      O‘tkazib yubordim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="font-display text-lg font-bold text-[#152238]">
              Shifokor buyurgan dori vositalari ({effectiveMedPlans.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {effectiveMedPlans.map((mp) => (
                <div
                  key={mp.id}
                  className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC] space-y-1.5"
                >
                  <div className="font-display font-bold text-base text-[#152238]">
                    {mp.medicationName} ({mp.strength}, {mp.form})
                  </div>
                  <div className="text-base text-[#64748B]">{mp.dosageInstructions}</div>
                  <div className="text-sm font-bold text-[#1769E0]">
                    Belgilangan vaqtlar: {mp.scheduledTimes.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3 — TARIX (Nazorat tarixi, Daily check-ins, Doctor notes, SMS, AI calls)
         ===================================================================== */}
      {activeTab === 'tarix' && (
        <div className="space-y-6">
          {/* 0. Unified Recovery Timeline ("Nazorat tarixi") */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-[#152238]">
                  Nazorat tarixi ({recoveryTimeline.length})
                </h2>
                <p className="text-base text-[#64748B]">
                  Kunlik holatlar, shikoyatlar, avtomatik yaratilgan vazifalar, shifokor qabul qilgan choralar va yakunlangan topshiriqlar
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recoveryTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#F7FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${item.badgeTone}`}
                      >
                        {item.badge}
                      </span>
                      <span className="font-bold text-base text-[#152238]">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-[#64748B]">{item.detail}</p>
                  </div>
                  <span className="text-xs font-mono text-[#64748B] shrink-0">
                    {formatUzDateTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1. Doctor Notes Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-[#152238]">
                Shifokor qaydlari ({allNotes.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowAddNoteBox(true)}
                className="min-h-[44px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
              >
                + Qayd qo‘shish
              </button>
            </div>

            <div className="space-y-3">
              {allNotes.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#64748B]">
                    <span className="font-bold text-base text-[#152238]">
                      {n.authorName} ({n.authorRole})
                    </span>
                    <span>{formatUzDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-base text-[#152238] leading-relaxed">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Daily Check-Ins History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#152238]">
                  Kunlik salomatlik hisobotlari ({effectiveCheckIns.length})
                </h2>
                <p className="text-base text-[#64748B]">
                  Bemor yuborgan kunlik holat va og‘riq ko‘rsatkichlari
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckInModal(!showCheckInModal)}
                className="min-h-[44px] px-4 py-2 text-base font-bold text-[#1769E0] bg-blue-50 hover:bg-blue-100 rounded-xl"
              >
                {showCheckInModal ? 'Formani yopish' : '+ Yangi holat kiritish'}
              </button>
            </div>

            {showCheckInModal && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingCheckIn(true);
                  try {
                    await onSubmitCheckIn({
                      patientId: patient.id,
                      overallFeeling: feeling,
                      painScore,
                      reportedSymptoms:
                        symptoms || 'Bugun o‘zimni barqaror his qilyapman.',
                      bloodPressure,
                      temperatureC,
                      requestedDoctorContact: wantDoctorContact,
                    });
                    setSymptoms('');
                    setShowCheckInModal(false);
                  } finally {
                    setSubmittingCheckIn(false);
                  }
                }}
                className="p-5 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-4 text-base"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#152238] mb-1">
                      Bugungi umumiy holat
                    </label>
                    <select
                      value={feeling}
                      onChange={(e) => setFeeling(e.target.value as any)}
                      className="w-full min-h-[46px] px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="Yaxshi">Yaxshi</option>
                      <option value="O‘rtacha">O‘rtacha</option>
                      <option value="Bezovtalik bor">Bezovtalik bor</option>
                      <option value="Og‘riq kuchaygan">Og‘riq kuchaygan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#152238] mb-1">
                      Og‘riq darajasi (0–10): {painScore} ball
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painScore}
                      onChange={(e) => setPainScore(Number(e.target.value))}
                      className="w-full accent-[#1769E0] mt-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[#152238] mb-1">
                    Bemor shikoyati yoki izohi
                  </label>
                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Shikoyatlarni yozing..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingCheckIn}
                    className="min-h-[46px] px-6 py-2.5 bg-[#1769E0] text-white font-bold rounded-xl"
                  >
                    {submittingCheckIn ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {effectiveCheckIns.map((chk) => (
                <div
                  key={chk.id}
                  className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3 text-base">
                      <span className="font-bold text-[#152238]">
                        Holat: {chk.overallFeeling}
                      </span>
                      <span className="font-bold text-[#1769E0]">
                        Og‘riq: {chk.painScore}/10
                      </span>
                      <span className="text-sm text-[#64748B]">
                        {formatUzDateTime(chk.submittedAt)}
                      </span>
                    </div>
                    <StatusBadge status={chk.reviewStatus} />
                  </div>
                  <p className="text-base text-[#152238]">{chk.reportedSymptoms}</p>
                  <div className="text-sm text-[#64748B] flex flex-wrap gap-4">
                    {chk.bloodPressure && <span>Qon bosimi: {chk.bloodPressure}</span>}
                    {chk.temperatureC && <span>Harorat: {chk.temperatureC}°C</span>}
                  </div>
                  {chk.doctorReviewNote ? (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                      Shifokor xulosasi: {chk.doctorReviewNote}
                    </div>
                  ) : (
                    isClinician &&
                    !chk.id.startsWith('chk-hist-') &&
                    !chk.id.startsWith('chk-today-') && (
                      <button
                        type="button"
                        onClick={() =>
                          onReviewCheckIn(
                            chk.id,
                            `${actor.fullName} tomonidan ko‘rib chiqildi.`
                          )
                        }
                        className="min-h-[42px] px-4 py-2 bg-[#1769E0] text-white text-sm font-bold rounded-xl"
                      >
                        Ko‘rib chiqildi deb belgilash
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. SMS, AI Calls & Follow-Up History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#152238]">
                  SMS xabarnomalar, AI muloqotlar va kuzatuv tarixi
                </h2>
                <p className="text-base text-[#64748B]">
                  Bemorga yuborilgan eslatmalar va muloqotlar xronologiyasi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiTools(!showAiTools)}
                className="min-h-[44px] px-4 py-2 text-sm font-bold text-[#1769E0] bg-blue-50 hover:bg-blue-100 rounded-xl"
              >
                {showAiTools ? 'Qo‘shimcha vositalarni yopish' : 'AI qo‘ng‘iroq va xulosa'}
              </button>
            </div>

            {showAiTools && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-bold text-base text-[#152238]">
                    Avtomatik yordamchi qo‘ng‘irog‘i va qisqacha xulosa
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleStartSimulatedCall}
                      className="min-h-[42px] px-4 py-2 bg-[#1769E0] text-white text-sm font-bold rounded-xl flex items-center gap-2"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Qo‘ng‘iroqni sinash</span>
                    </button>
                    <button
                      type="button"
                      disabled={generatingAiReport}
                      onClick={async () => {
                        setGeneratingAiReport(true);
                        try {
                          await onGenerateAiReport(patient.id);
                        } finally {
                          setGeneratingAiReport(false);
                        }
                      }}
                      className="min-h-[42px] px-4 py-2 bg-white border border-slate-300 text-[#152238] text-sm font-bold rounded-xl"
                    >
                      {generatingAiReport ? 'Yaratilmoqda...' : 'Xulosa tayyorlash'}
                    </button>
                  </div>
                </div>

                {callActive && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white max-h-52 overflow-y-auto space-y-2">
                      {liveTranscript.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-sm ${
                            m.speaker === 'AI'
                              ? 'bg-white/10 text-slate-100'
                              : 'bg-[#1769E0] text-white ml-6'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={patientInput}
                        onChange={(e) => setPatientInput(e.target.value)}
                        placeholder="Bemor javobini yozing..."
                        className="flex-1 min-h-[42px] px-3.5 py-2 text-base bg-white border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendVoiceResponse()}
                        className="min-h-[42px] px-4 py-2 bg-[#1769E0] text-white font-bold rounded-xl"
                      >
                        Yuborish
                      </button>
                      <button
                        type="button"
                        onClick={handleEndAndSaveCall}
                        className="min-h-[42px] px-4 py-2 bg-[#DC2626] text-white font-bold rounded-xl"
                      >
                        Yakunlash
                      </button>
                    </div>
                  </div>
                )}

                {latestAiReport && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-sm space-y-1">
                    <div className="font-bold text-[#152238]">Qisqacha xulosa:</div>
                    <p className="text-[#64748B]">
                      {latestAiReport.summary.medicationConfirmationSummary}{' '}
                      {latestAiReport.summary.dailyCheckInResponses}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <h3 className="font-bold text-base text-[#152238]">
                  Telefon va ovozli muloqotlar ({effectiveAiConversations.length})
                </h3>
                {effectiveAiConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-1"
                  >
                    <div className="flex justify-between font-bold text-base text-[#1769E0]">
                      <span>{conv.conversationType}</span>
                      <span className="text-sm text-[#64748B]">
                        {formatShortTime(conv.createdAt)}
                      </span>
                    </div>
                    <p className="text-base text-[#152238]">
                      {conv.structuredSummary.summaryUz}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-base text-[#152238]">
                  Yuborilgan SMS eslatmalar ({effectiveNotifications.length})
                </h3>
                {effectiveNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base text-[#152238]">
                        {notif.notificationType}
                      </span>
                      <StatusBadge status={notif.status} />
                    </div>
                    <p className="text-base text-[#64748B]">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {auditLogs.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <h3 className="font-bold text-base text-[#152238]">
                  Kuzatuv amallari xronologiyasi
                </h3>
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-[#F7FAFC] flex flex-wrap items-center justify-between gap-2 text-base"
                  >
                    <div>
                      <span className="font-bold text-[#152238]">{log.action}</span>
                      <span className="text-sm text-[#64748B] block">{log.details}</span>
                    </div>
                    <span className="text-sm text-[#1769E0] font-semibold">
                      {formatUzDateTime(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Completing Monitoring */}
      <ConfirmationDialog
        isOpen={confirmCompleteOpen}
        title="Bemor kuzatuvini yakunlashni tasdiqlaysizmi?"
        description={`${patient.fullName} bo‘yicha faol kuzatuv yakunlanadi va barcha joriy vazifalar bajarilgan sifatida belgilanadi.`}
        confirmLabel="Ha, kuzatuvni yakunlash"
        onConfirm={async () => {
          if (activeTask && activeTask.status !== 'Bajarildi') {
            await onUpdateTask(activeTask.id, {
              actorId: actor.id,
              status: 'Bajarildi',
              contactMethod: 'Telefon muloqoti',
              notes: 'Shifokor tomonidan bemor kuzatuvi yakunlandi.',
            });
          }
          await fetch(`/api/patients/${patient.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseStatus: 'Yakunlangan' }),
          });
          setConfirmCompleteOpen(false);
          await onRefreshState();
        }}
        onCancel={() => setConfirmCompleteOpen(false)}
      />
    </div>
  );
};
