import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AddPatientModal, DischargeModal } from './components/DischargeModal';
import { DoctorProfileView } from './components/DoctorProfileView';
import { HackathonDemoCenter } from './components/HackathonDemoCenter';
import { LoginAndOnboarding } from './components/LoginAndOnboarding';
import { PatientDetailView } from './components/PatientDetailView';
import {
  ClinicAndTemplatesView,
  NotificationSimulationCenter,
  PatientPortalView,
  PatientSectionId,
  SubscriptionBillingView,
} from './components/RoleViews';
import {
  EmptyState,
  FilterTabs,
  FollowUpTaskCard,
  PageTitle,
  SearchInput,
  StatCard,
  StatusBadge,
} from './components/SharedUI';
import {
  DatabaseSchema,
  MedicationReportedStatus,
  SubscriptionPlanId,
  UserAccount,
} from './shared/types';
import {
  formatUzDateTime,
  getCountdownInfo,
  getRoleLabelUz,
} from './utils/formatters';
import {
  CarelyLogo,
  LanguageSwitcher,
  ThemeSwitcher,
} from './i18n/translations';

type NavSectionId =
  | 'bosh_sahifa'
  | 'bemorlar'
  | 'vazifalar'
  | 'xabarlar'
  | 'hisobotlar'
  | 'shifokorlar'
  | 'klinika_sozlamalari'
  | 'doctor_profile'
  | 'demo_center'
  | 'settings';

export default function App() {
  const [actorId, setActorId] = useState<string>('usr-doc-1');
  const [lastDoctorPersonaId, setLastDoctorPersonaId] =
    useState<string>('usr-doc-1');
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<NavSectionId>('bosh_sahifa');
  const [patientSection, setPatientSection] =
    useState<PatientSectionId>('bosh_sahifa');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDoctorProfileId, setSelectedDoctorProfileId] =
    useState<string>('doc-1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);

  // Server state
  const [appState, setAppState] = useState<DatabaseSchema | null>(null);
  const [actor, setActor] = useState<UserAccount | null>(null);
  const [effectiveNowIso, setEffectiveNowIso] = useState<string>(
    '2026-11-17T14:00:00+05:00'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [dischargeModalOpen, setDischargeModalOpen] = useState<boolean>(false);
  const [dischargeDefaultPatientId, setDischargeDefaultPatientId] = useState<
    string | undefined
  >(undefined);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState<boolean>(false);

  // Filters for Patient Page (Section 5)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patientTabFilter, setPatientTabFilter] = useState<
    'ALL' | 'ACTIVE' | 'REVIEW' | 'COMPLETED'
  >('ALL');
  const [showExtraFilters, setShowExtraFilters] = useState<boolean>(false);
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('ALL');

  // Filters & Selection for Vazifalar Page (Strictly 3 tabs: Bugungi | Kutilayotgan | Bajarilgan)
  const [taskFilter, setTaskFilter] = useState<'TODAY' | 'PENDING' | 'COMPLETED'>(
    'TODAY'
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskContactMethod, setTaskContactMethod] = useState<
    'Telefon muloqoti' | 'Video konsultatsiya' | 'Uyga tashrif' | 'Klinikada qabul'
  >('Telefon muloqoti');
  const [taskNoteInput, setTaskNoteInput] = useState<string>('');
  const [chatTargetPatientId, setChatTargetPatientId] = useState<string | null>(
    null
  );
  const [showDetailedReports, setShowDetailedReports] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const fetchState = useCallback(
    async (overrideActorId?: string) => {
      const targetActor = overrideActorId || actorId;
      try {
        const resp = await fetch(
          `/api/state?actorId=${encodeURIComponent(targetActor)}`
        );
        const data = await resp.json();
        if (data.state) {
          setAppState(data.state);
          setActor(data.actor);
          if (data.effectiveNowIso) {
            setEffectiveNowIso(data.effectiveNowIso);
          }
          if (data.actor?.linkedDoctorId) {
            setSelectedDoctorProfileId(data.actor.linkedDoctorId);
          }
        }
      } catch (err) {
        console.error('Failed to load state:', err);
      } finally {
        setLoading(false);
      }
    },
    [actorId]
  );

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleSelectPersona = async (newUserId: string) => {
    setActorId(newUserId);
    if (newUserId !== 'usr-pat-1' && newUserId !== 'usr-caregiver-1') {
      setLastDoctorPersonaId(newUserId);
    }
    if (appState) {
      const nextActor = appState.users.find((u) => u.id === newUserId);
      if (nextActor) {
        setActor(nextActor);
        if (nextActor.linkedDoctorId) {
          setSelectedDoctorProfileId(nextActor.linkedDoctorId);
        }
      }
    }
    setShowLoginScreen(false);
    setSelectedPatientId(null);
    setActiveNav('bosh_sahifa');
    setPatientSection('bosh_sahifa');
    setAccountDropdownOpen(false);
    await fetchState(newUserId);
    showToast('Demo rol almashtirildi — sun’iy ma’lumotlar yuklandi');
  };

  // API Mutation Handlers
  const handleConfirmDischarge = async (payload: any) => {
    const resp = await fetch('/api/discharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actorId }),
    });
    if (resp.ok) {
      await fetchState();
      showToast(
        'Bemor uyga chiqarildi va oilaviy shifokorga 24 soatlik vazifa yuborildi!'
      );
    }
  };

  const handleAddPatient = async (payload: any) => {
    const resp = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actorId }),
    });
    if (resp.ok) {
      const data = await resp.json();
      await fetchState();
      showToast(`Yangi bemor (${data.patient.fullName}) ro‘yxatga olindi!`);
    }
  };

  const handleUpdateTask = async (taskId: string, payload: any) => {
    const resp = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actorId }),
    });
    if (resp.ok) {
      await fetchState();
      showToast(`Vazifa holati yangilandi: ${payload.status}`);
    }
  };

  const handleSaveDoctorProfile = async (doctorId: string, updates: any) => {
    const resp = await fetch(`/api/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (resp.ok) {
      await fetchState();
      showToast('Shifokor profili saqlandi!');
    }
  };

  const handleCreateMedicationPlan = async (payload: any) => {
    const resp = await fetch('/api/medications/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      await fetchState();
      showToast('Yangi dori rejasi qo‘shildi!');
    }
  };

  const handleRespondMedicationEvent = async (
    eventId: string,
    reportedStatus: MedicationReportedStatus,
    patientNote?: string
  ) => {
    const resp = await fetch(`/api/medications/events/${eventId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedStatus, patientNote, actorId }),
    });
    if (resp.ok) {
      await fetchState();
      showToast(`Dori holati "${reportedStatus}" sifatida saqlandi!`);
    }
  };

  const handleSubmitCheckIn = async (payload: any) => {
    const resp = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const data = await resp.json();
      await fetchState();
      if (data.autoTask) {
        showToast(
          'Kunlik holat saqlandi va shifokor uchun Vazifalar bo‘limida tekshirish topshirig‘i yaratildi!'
        );
      } else {
        showToast('Kunlik salomatlik holati saqlandi!');
      }
    }
  };

  const handleReviewCheckIn = async (checkInId: string, note: string) => {
    await fetch(`/api/checkins/${checkInId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: actor?.linkedDoctorId || 'doc-1',
        doctorReviewNote: note,
      }),
    });
    await fetchState();
    showToast('Kunlik holat shifokor tomonidan ko‘rib chiqildi.');
  };

  const handleAddClinicalNote = async (caseId: string, content: string) => {
    await fetch(`/api/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, content }),
    });
    await fetchState();
    showToast('Shifokor qaydi saqlandi.');
  };

  const handleGenerateAiReport = async (patientId: string) => {
    const resp = await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, patientId }),
    });
    if (resp.ok) {
      await fetchState();
      showToast('AI shifokor hisoboti loyihasi yaratildi!');
    }
  };

  const handleReviewAiReport = async (
    reportId: string,
    doctorEditableNotes: string,
    markReviewed: boolean
  ) => {
    await fetch(`/api/ai/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, doctorEditableNotes, markReviewed }),
    });
    await fetchState();
    showToast(
      markReviewed
        ? 'AI hisoboti shifokor tomonidan tasdiqlandi!'
        : 'Hisobot izohi saqlandi.'
    );
  };

  const handleTriggerSms = async (
    patientId: string,
    notificationType: string,
    customMessage?: string,
    channel?: string
  ) => {
    const resp = await fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorId,
        patientId,
        notificationType,
        customMessage,
        channel,
      }),
    });
    if (resp.ok) {
      await fetchState();
      showToast('SMS xabarnoma yuborildi!');
    }
  };

  const handleSendChatMessage = async (params: {
    conversationId?: string;
    patientId: string;
    doctorId: string;
    content: string;
  }) => {
    const resp = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, actorId }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Xabar yuborishda xatolik');
      return;
    }
    await fetchState();
  };

  const handleToggleChatPermission = async (params: {
    conversationId?: string;
    patientId: string;
    doctorId: string;
    patientCanSend: boolean;
  }) => {
    const convId =
      params.conversationId || `conv-${params.patientId}-${params.doctorId}`;
    const resp = await fetch(
      `/api/chat/conversations/${encodeURIComponent(convId)}/permission`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, actorId }),
      }
    );
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Ruxsatni o‘zgartirishda xatolik');
      return;
    }
    await fetchState();
    showToast('Xabar yozish ruxsati yangilandi.');
  };

  const handleMarkChatRead = useCallback(
    async (conversationId: string) => {
      try {
        await fetch(
          `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actorId }),
          }
        );
        await fetchState();
      } catch {
        // ignore read receipt network errors
      }
    },
    [actorId, fetchState]
  );

  const handleRunDemoAction = async (
    actionType: string,
    minutesOffset?: number
  ) => {
    const resp = await fetch('/api/demo/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType, minutesOffset }),
    });
    const data = await resp.json();
    await fetchState();
    if (data.message) {
      showToast(data.message);
    }
  };

  // Filtered patients for Patient List Page (Section 5)
  const filteredPatients = useMemo(() => {
    if (!appState) return [];
    return appState.patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.careCaseType.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q);

      const matchesTab =
        patientTabFilter === 'ALL'
          ? true
          : patientTabFilter === 'ACTIVE'
          ? p.caseStatus === 'Aktiv kuzatuvda' ||
            p.caseStatus === 'Oilaviy shifokor biriktirilgan'
          : patientTabFilter === 'REVIEW'
          ? p.caseStatus === 'Shifokor ko‘rishi kerak'
          : p.caseStatus === 'Yakunlangan' || p.caseStatus === 'Arxivlangan';

      const matchesDoc =
        doctorFilter === 'ALL' ||
        p.treatingDoctorId === doctorFilter ||
        p.familyDoctorId === doctorFilter;
      const matchesSpec =
        specialtyFilter === 'ALL' || p.specialtyCategory === specialtyFilter;

      return matchesSearch && matchesTab && matchesDoc && matchesSpec;
    });
  }, [
    appState,
    searchQuery,
    patientTabFilter,
    doctorFilter,
    specialtyFilter,
  ]);

  if (loading || !appState || !actor) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-3">
          <div className="flex justify-center">
            <CarelyLogo darkText />
          </div>
          <div className="font-display font-bold text-xl text-[#152238]">
            Carely yuklanmoqda...
          </div>
          <div className="text-base text-[#64748B]">
            Davolanish tugasa ham, g‘amxo‘rlik davom etadi.
          </div>
        </div>
      </div>
    );
  }

  if (showLoginScreen) {
    return (
      <LoginAndOnboarding
        users={appState.users}
        onSelectDemoPersona={handleSelectPersona}
      />
    );
  }

  const isPatientOrCaregiver =
    actor.role === 'PATIENT' || actor.role === 'CAREGIVER';
  const isClinicAdmin =
    actor.role === 'CLINIC_ADMIN' || actor.role === 'SUPER_ADMIN';

  // Core KPI metrics computed from saved database state (Section 4)
  const activePatientsCount = appState.patients.filter(
    (p) => p.caseStatus !== 'Arxivlangan' && p.caseStatus !== 'Yakunlangan'
  ).length;

  const openTasks = appState.followUpTasks.filter(
    (t) => t.status !== 'Bajarildi'
  );
  const completedTasks = appState.followUpTasks.filter(
    (t) => t.status === 'Bajarildi'
  );
  const overdueTasks = openTasks.filter(
    (t) => getCountdownInfo(t.dueAt, effectiveNowIso, t.status).isOverdue
  );

  const reviewRequiredPatients = appState.patients.filter(
    (p) => p.caseStatus === 'Shifokor ko‘rishi kerak'
  );
  const needsReviewTotal = reviewRequiredPatients.length + overdueTasks.length;

  // Priority-sorted Today's Tasks (Overdue & Urgent first, max 6 shown on home)
  const prioritySortedTasks = [...openTasks].sort((a, b) => {
    const cdA = getCountdownInfo(a.dueAt, effectiveNowIso, a.status);
    const cdB = getCountdownInfo(b.dueAt, effectiveNowIso, b.status);
    if (cdA.isOverdue && !cdB.isOverdue) return -1;
    if (!cdA.isOverdue && cdB.isOverdue) return 1;
    return cdA.hoursRemaining - cdB.hoursRemaining;
  });

  // Strictly 3 Task Buckets for Vazifalar: Bugungi | Kutilayotgan | Bajarilgan
  const todayTasks = prioritySortedTasks.filter((t) => {
    const cd = getCountdownInfo(t.dueAt, effectiveNowIso, t.status);
    return cd.isOverdue || cd.hoursRemaining <= 24;
  });
  const pendingTasks = prioritySortedTasks.filter((t) => {
    const cd = getCountdownInfo(t.dueAt, effectiveNowIso, t.status);
    return !cd.isOverdue && cd.hoursRemaining > 24;
  });

  const filteredTasks =
    taskFilter === 'COMPLETED'
      ? completedTasks
      : taskFilter === 'PENDING'
      ? pendingTasks.length > 0
        ? pendingTasks
        : prioritySortedTasks
      : todayTasks;

  // Medication & Response Rate metrics for Hisobotlar page
  const medTakenTotal = appState.medicationEvents.filter(
    (e) => e.reportedStatus === 'Ichdim'
  ).length;
  const medMissedTotal = appState.medicationEvents.filter(
    (e) => e.reportedStatus === 'O‘tkazib yubordim'
  ).length;
  const medUnconfirmedTotal = appState.medicationEvents.filter(
    (e) => e.reportedStatus === 'Tasdiqlanmagan'
  ).length;
  const medRespondedCount = appState.medicationEvents.filter(
    (e) => e.reportedStatus !== 'Tasdiqlanmagan'
  ).length;
  const patientResponseRatePct =
    appState.medicationEvents.length > 0
      ? Math.round((medRespondedCount / appState.medicationEvents.length) * 100)
      : 86;

  const weeklyMedicationChart = [
    { day: 'Dush', Ichdim: 11, Kutilmoqda: 2, Otkazildi: 1 },
    { day: 'Sesh', Ichdim: 13, Kutilmoqda: 1, Otkazildi: 1 },
    { day: 'Chor', Ichdim: 12, Kutilmoqda: 2, Otkazildi: 0 },
    { day: 'Pay', Ichdim: 14, Kutilmoqda: 1, Otkazildi: 1 },
    {
      day: 'Bugun',
      Ichdim: medTakenTotal,
      Kutilmoqda: medUnconfirmedTotal,
      Otkazildi: medMissedTotal,
    },
  ];

  const currentDoctorProfile =
    appState.doctorProfiles.find((d) => d.id === selectedDoctorProfileId) ||
    appState.doctorProfiles.find((d) => d.id === actor.linkedDoctorId) ||
    appState.doctorProfiles[0];

  const currentOrganization =
    appState.organizations.find((o) => o.id === actor.primaryOrganizationId) ||
    appState.organizations[0];

  const selectedPatient = selectedPatientId
    ? appState.patients.find((p) => p.id === selectedPatientId)
    : null;

  // STRICTLY 5 MAIN NAVIGATION SECTIONS FOR DOCTORS (Section 3)
  const doctorNavItems: {
    id: NavSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'bosh_sahifa', label: 'Bosh sahifa', icon: LayoutDashboard },
    {
      id: 'bemorlar',
      label: 'Bemorlar',
      icon: Users,
      badge: appState.patients.length,
    },
    {
      id: 'vazifalar',
      label: 'Vazifalar',
      icon: Activity,
      badge: openTasks.length,
    },
    {
      id: 'xabarlar',
      label: 'Xabarlar',
      icon: Bell,
      badge: appState.notifications.length,
    },
    {
      id: 'hisobotlar',
      label: 'Hisobotlar',
      icon: FileText,
      badge: appState.aiReports.length,
    },
  ];

  // STRICTLY 5 MAIN NAVIGATION SECTIONS FOR CLINIC ADMIN (Section 11)
  const clinicAdminNavItems: {
    id: NavSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'bosh_sahifa', label: 'Bosh sahifa', icon: LayoutDashboard },
    {
      id: 'shifokorlar',
      label: 'Shifokorlar',
      icon: Stethoscope,
      badge: appState.doctorProfiles.length,
    },
    {
      id: 'bemorlar',
      label: 'Bemorlar va kuzatuvlar',
      icon: Users,
      badge: appState.patients.length,
    },
    {
      id: 'hisobotlar',
      label: 'Hisobotlar',
      icon: FileText,
      badge: appState.aiReports.length,
    },
    {
      id: 'klinika_sozlamalari',
      label: 'Klinika sozlamalari',
      icon: Settings,
    },
  ];

  const primarySidebarItems = isClinicAdmin
    ? clinicAdminNavItems
    : doctorNavItems;

  const currentPageTitle = selectedPatient
    ? selectedPatient.fullName
    : isPatientOrCaregiver && activeNav !== 'settings' && activeNav !== 'demo_center'
    ? 'Shaxsiy bemor kabineti'
    : activeNav === 'bosh_sahifa'
    ? 'Bosh sahifa'
    : activeNav === 'bemorlar'
    ? 'Bemorlar'
    : activeNav === 'vazifalar'
    ? 'Vazifalar'
    : activeNav === 'xabarlar'
    ? 'Xabarlar'
    : activeNav === 'hisobotlar'
    ? 'Hisobotlar'
    : activeNav === 'shifokorlar'
    ? 'Shifokorlar'
    : activeNav === 'klinika_sozlamalari'
    ? 'Klinika sozlamalari'
    : activeNav === 'doctor_profile'
    ? 'Mening profilim'
    : activeNav === 'demo_center'
    ? 'Demo boshqaruvi'
    : 'Sozlamalar';

  const renderCompactPatientList = (patientsList: typeof appState.patients) => {
    return (
      <>
        {/* Compact Professional Desktop Table (Displays 5–7 patients comfortably without excessive scrolling) */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7FAFC] border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                <th className="py-2.5 px-4">Bemor va yoshi</th>
                <th className="py-2.5 px-4">Davolanish turi</th>
                <th className="py-2.5 px-4">So‘nggi check-in</th>
                <th className="py-2.5 px-4">Dori holati</th>
                <th className="py-2.5 px-4">Kuzatuv holati</th>
                <th className="py-2.5 px-4 text-right">Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {patientsList.map((pat) => {
                const latestChk = appState.dailyCheckIns.find(
                  (c) => c.patientId === pat.id
                );
                const openTask = appState.followUpTasks.find(
                  (t) => t.patientId === pat.id && t.status !== 'Bajarildi'
                );
                const patMeds = appState.medicationEvents.filter(
                  (e) => e.patientId === pat.id
                );
                const takenCount = patMeds.filter(
                  (e) => e.reportedStatus === 'Ichdim'
                ).length;
                const hasMissed = patMeds.some(
                  (e) => e.reportedStatus === 'O‘tkazib yubordim'
                );
                const medStatusLabel =
                  patMeds.length > 0
                    ? hasMissed
                      ? 'O‘tkazib yubordim'
                      : takenCount === patMeds.length
                      ? 'Ichdim'
                      : `Ichdim (${takenCount}/${patMeds.length})`
                    : pat.caseStatus === 'Shifokor ko‘rishi kerak'
                    ? 'Tasdiqlanmagan'
                    : 'Ichdim (1/2)';
                const medBadgeTone =
                  medStatusLabel === 'O‘tkazib yubordim'
                    ? 'bg-red-50 text-[#DC2626] border-red-200'
                    : medStatusLabel === 'Tasdiqlanmagan'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-[#16A34A] border-emerald-200';
                const treatingDoc = appState.doctorProfiles.find(
                  (d) => d.id === pat.treatingDoctorId
                );

                return (
                  <tr
                    key={pat.id}
                    onClick={() => setSelectedPatientId(pat.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-display font-bold text-sm text-[#152238] group-hover:text-[#1769E0] transition-colors">
                        {pat.fullName}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {pat.age} yosh · {pat.sex} ·{' '}
                        <span className="font-mono">{pat.id.toUpperCase()}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 max-w-[230px]">
                      <div className="font-semibold text-xs text-[#152238] truncate">
                        {pat.careCaseType}
                      </div>
                      <div className="text-xs text-[#64748B] truncate">
                        {pat.specialtyCategory} ·{' '}
                        {treatingDoc?.fullName || 'Dr. Sardor Rahimov'}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 max-w-[200px]">
                      {latestChk ? (
                        <div>
                          <div className="font-semibold text-xs text-[#152238]">
                            {latestChk.overallFeeling} ·{' '}
                            <span className="font-mono text-[#1769E0]">
                              Og‘riq: {latestChk.painScore}/10
                            </span>
                          </div>
                          <div className="text-xs text-[#64748B] truncate">
                            {latestChk.reportedSymptoms}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-xs text-[#152238]">
                            Yaxshi ·{' '}
                            <span className="font-mono text-[#1769E0]">
                              Og‘riq: 2/10
                            </span>
                          </div>
                          <div className="text-xs text-[#64748B] truncate">
                            Rejali kunlik check-in
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${medBadgeTone}`}
                      >
                        {medStatusLabel}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="flex flex-col items-start gap-0.5">
                        <StatusBadge status={pat.caseStatus} />
                        <span className="text-[11px] text-[#64748B] truncate max-w-[170px]">
                          {openTask ? openTask.taskType : 'Rejali kuzatuv'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatientId(pat.id);
                        }}
                        className="min-h-[34px] px-3 py-1.5 bg-[#F7FAFC] group-hover:bg-[#1769E0] group-hover:text-white border border-slate-200 group-hover:border-[#1769E0] text-[#152238] text-xs font-bold rounded-lg transition-colors"
                      >
                        Ochish
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Mobile Patient Cards (<768px only) */}
        <div className="md:hidden space-y-2.5">
          {patientsList.map((pat) => {
            const latestChk = appState.dailyCheckIns.find(
              (c) => c.patientId === pat.id
            );
            const openTask = appState.followUpTasks.find(
              (t) => t.patientId === pat.id && t.status !== 'Bajarildi'
            );
            const patMeds = appState.medicationEvents.filter(
              (e) => e.patientId === pat.id
            );
            const takenCount = patMeds.filter(
              (e) => e.reportedStatus === 'Ichdim'
            ).length;
            const hasMissed = patMeds.some(
              (e) => e.reportedStatus === 'O‘tkazib yubordim'
            );
            const medStatusLabel =
              patMeds.length > 0
                ? hasMissed
                  ? 'O‘tkazib yubordim'
                  : takenCount === patMeds.length
                  ? 'Ichdim'
                  : `Ichdim (${takenCount}/${patMeds.length})`
                : pat.caseStatus === 'Shifokor ko‘rishi kerak'
                ? 'Tasdiqlanmagan'
                : 'Ichdim (1/2)';

            return (
              <div
                key={pat.id}
                onClick={() => setSelectedPatientId(pat.id)}
                className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 cursor-pointer active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-[#152238] truncate">
                      {pat.fullName} ({pat.age} yosh)
                    </h3>
                    <p className="text-xs text-[#64748B] truncate">
                      {pat.careCaseType}
                    </p>
                  </div>
                  <StatusBadge status={pat.caseStatus} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[#64748B]">So‘nggi check-in: </span>
                    <strong className="text-[#152238]">
                      {latestChk
                        ? `Og‘riq ${latestChk.painScore}/10`
                        : 'Og‘riq 2/10'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Dori: </span>
                    <strong className="text-[#1769E0]">{medStatusLabel}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#64748B] truncate">
                    {openTask ? openTask.taskType : 'Rejali kuzatuv'}
                  </span>
                  <span className="font-bold text-[#1769E0] shrink-0">
                    Profilni ochish →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#152238] flex">
      {/* Toast Notification (Positioned above bottom nav on mobile <768px) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-22 md:bottom-5 left-4 right-4 md:left-auto md:right-5 z-50 bg-[#10243A] text-white px-5 py-3.5 rounded-xl shadow-lg border border-white/15 flex items-center gap-3 text-base font-medium max-w-md"
        >
          <CheckCircle2 className="w-5 h-5 text-[#12B8A6] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Left Sidebar (Hidden when viewing as Patient/Caregiver mobile portal) */}
      {!isPatientOrCaregiver && (
        <aside className="hidden lg:flex flex-col justify-between w-68 bg-[#10243A] text-white shrink-0 no-print">
          <div>
            {/* Brand Logo */}
            <div className="h-20 px-6 flex items-center gap-3.5 border-b border-white/10">
              <CarelyLogo subtitle="Davolanish va kuzatuv tizimi" />
            </div>

            {/* Strictly 5 Primary Navigation Items */}
            <nav className="p-4 space-y-2" aria-label="Asosiy navigatsiya">
              {primarySidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = !selectedPatientId && activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(null);
                      setActiveNav(item.id);
                    }}
                    className={`w-full min-h-[48px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#1769E0] text-white'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="font-mono text-sm opacity-90 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Mission Tagline */}
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="px-4 py-3 rounded-xl bg-white/5 text-sm text-slate-200 leading-relaxed">
              &ldquo;Davolanish tugasa ham, g‘amxo‘rlik davom etadi.&rdquo;
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Top Header Bar */}
        <header className="min-h-[68px] bg-white border-b border-slate-200 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          {/* Left: Current Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden shrink-0">
              <CarelyLogo compact />
            </div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-[#152238] truncate">
              {currentPageTitle}
            </h1>
          </div>

          {/* Right: Demo Patient/Doctor Switcher + Compact Notifications Icon + Main Action + Profile Avatar Dropdown */}
          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Compact Demo Patient/Doctor Mode Switcher */}
            <div
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200"
              role="group"
              aria-label="Demo rejim: Shifokor yoki Bemor"
            >
              <button
                type="button"
                onClick={() => {
                  if (isPatientOrCaregiver) {
                    handleSelectPersona(lastDoctorPersonaId || 'usr-doc-1');
                  } else if (activeNav === 'settings' || activeNav === 'demo_center') {
                    setSelectedPatientId(null);
                    setActiveNav('bosh_sahifa');
                  }
                }}
                className={`min-h-[32px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  !isPatientOrCaregiver
                    ? 'bg-[#1769E0] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#152238]'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                <span>Shifokor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isPatientOrCaregiver) {
                    handleSelectPersona('usr-pat-1');
                  } else if (activeNav === 'settings' || activeNav === 'demo_center') {
                    setSelectedPatientId(null);
                    setActiveNav('bosh_sahifa');
                  }
                }}
                className={`min-h-[32px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isPatientOrCaregiver
                    ? 'bg-[#1769E0] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#152238]'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Bemor</span>
              </button>
            </div>

            {/* Compact Notifications Icon */}
            <button
              type="button"
              onClick={() => {
                setSelectedPatientId(null);
                if (isPatientOrCaregiver) {
                  setActiveNav('bosh_sahifa');
                  setPatientSection('xabarlar');
                } else {
                  setActiveNav('xabarlar');
                }
              }}
              aria-label="Xabarlar"
              title="Xabarlar"
              className="relative w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-[#152238] transition-colors"
            >
              <Bell className="w-5 h-5 text-[#64748B]" />
              {appState.notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1769E0] text-white text-[11px] font-bold flex items-center justify-center">
                  {appState.notifications.length}
                </span>
              )}
            </button>

            {/* Main Relevant Action */}
            {!isPatientOrCaregiver && (
              <button
                type="button"
                onClick={() => {
                  setDischargeDefaultPatientId(selectedPatientId || 'pat-01');
                  setDischargeModalOpen(true);
                }}
                className="hidden sm:inline-flex min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-[#1769E0] hover:bg-blue-700 rounded-xl items-center gap-2 transition-colors"
              >
                <span>Bemorni uyga chiqarish</span>
              </button>
            )}

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                aria-expanded={accountDropdownOpen}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#10243A] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                  {actor.avatarUrl}
                </div>
                <div className="hidden sm:block max-w-[160px]">
                  <div className="text-sm font-bold text-[#152238] leading-tight truncate">
                    {actor.fullName}
                  </div>
                  <div className="text-xs text-[#64748B] truncate">
                    {getRoleLabelUz(actor.role)}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-sm">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#152238] truncate">
                        {actor.fullName}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-[#64748B] shrink-0">
                        Demo
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {getRoleLabelUz(actor.role)}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(null);
                        setActiveNav('doctor_profile');
                        setAccountDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 text-[#152238] font-medium"
                    >
                      <User className="w-4 h-4 text-[#1769E0]" />
                      <span>Mening profilim</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(null);
                        setActiveNav('settings');
                        setAccountDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 text-[#152238] font-medium"
                    >
                      <Settings className="w-4 h-4 text-[#64748B]" />
                      <span>Sozlamalar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(null);
                        setActiveNav('demo_center');
                        setAccountDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 text-[#152238] font-medium"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#12B8A6]" />
                      <span>Demo boshqaruvi</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        setShowLoginScreen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-[#DC2626] font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Chiqish</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile "Ko‘proq" Bottom Sheet Menu (<768px only) */}
        {mobileMenuOpen && !isPatientOrCaregiver && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end no-print">
            <div className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 pb-24 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="font-display text-lg font-bold text-[#152238]">
                    Ko‘proq bo‘limlar
                  </div>
                  <div className="text-sm text-[#64748B]">
                    Hisobotlar, shifokor profili va sozlamalar
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 text-sm font-bold text-[#152238]"
                >
                  Yopish
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setActiveNav('hisobotlar');
                    setMobileMenuOpen(false);
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center justify-between ${
                    activeNav === 'hisobotlar'
                      ? 'bg-[#1769E0] text-white'
                      : 'bg-[#F7FAFC] text-[#152238] border border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#1769E0]" />
                    <span>Hisobotlar</span>
                  </span>
                  <span className="text-sm font-mono opacity-80">
                    {appState.aiReports.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setActiveNav('doctor_profile');
                    setMobileMenuOpen(false);
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 ${
                    activeNav === 'doctor_profile'
                      ? 'bg-[#1769E0] text-white'
                      : 'bg-[#F7FAFC] text-[#152238] border border-slate-200'
                  }`}
                >
                  <User className="w-5 h-5 text-[#1769E0]" />
                  <span>Profil (Shifokor kabineti)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setActiveNav('settings');
                    setMobileMenuOpen(false);
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 ${
                    activeNav === 'settings'
                      ? 'bg-[#1769E0] text-white'
                      : 'bg-[#F7FAFC] text-[#152238] border border-slate-200'
                  }`}
                >
                  <Settings className="w-5 h-5 text-[#64748B]" />
                  <span>Sozlamalar</span>
                </button>

                {isClinicAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(null);
                      setActiveNav('shifokorlar');
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 bg-[#F7FAFC] text-[#152238] border border-slate-200"
                  >
                    <Stethoscope className="w-5 h-5 text-[#1769E0]" />
                    <span>Shifokorlar ro‘yxati</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDischargeDefaultPatientId(selectedPatientId || 'pat-01');
                    setDischargeModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 bg-blue-50 text-[#1769E0] border border-blue-200"
                >
                  <Activity className="w-5 h-5" />
                  <span>Bemorni uyga chiqarish (24s vazifa)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setActiveNav('demo_center');
                    setMobileMenuOpen(false);
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 ${
                    activeNav === 'demo_center'
                      ? 'bg-[#1769E0] text-white'
                      : 'bg-[#F7FAFC] text-[#152238] border border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-[#12B8A6]" />
                  <span>Demo boshqaruvi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLoginScreen(true);
                  }}
                  className="min-h-[48px] px-4 py-3 rounded-xl text-base font-bold flex items-center gap-3 bg-red-50 text-[#DC2626] border border-red-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Chiqish</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport Content (With mobile-safe bottom padding so nothing hides behind bottom nav) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-[1360px] w-full mx-auto">
          {/* 1. Simplified 4-Tab Patient Profile Page (Section 6) */}
          {selectedPatient ? (
            <PatientDetailView
              patient={selectedPatient}
              actor={actor}
              effectiveNowIso={effectiveNowIso}
              organizations={appState.organizations}
              doctors={appState.doctorProfiles}
              careCases={appState.careCases.filter(
                (c) => c.patientId === selectedPatient.id
              )}
              followUpTasks={appState.followUpTasks.filter(
                (t) => t.patientId === selectedPatient.id
              )}
              medicationPlans={appState.medicationPlans.filter(
                (m) => m.patientId === selectedPatient.id
              )}
              medicationEvents={appState.medicationEvents.filter(
                (e) => e.patientId === selectedPatient.id
              )}
              dailyCheckIns={appState.dailyCheckIns.filter(
                (d) => d.patientId === selectedPatient.id
              )}
              notifications={appState.notifications.filter(
                (n) => n.patientId === selectedPatient.id
              )}
              aiConversations={appState.aiConversations.filter(
                (a) => a.patientId === selectedPatient.id
              )}
              aiReports={appState.aiReports.filter(
                (r) => r.patientId === selectedPatient.id
              )}
              consents={appState.consents.filter(
                (c) => c.patientId === selectedPatient.id
              )}
              auditLogs={appState.auditLogs.filter(
                (l) => !l.patientId || l.patientId === selectedPatient.id
              )}
              onBack={() => setSelectedPatientId(null)}
              onOpenDischargeModal={(patId) => {
                setDischargeDefaultPatientId(patId);
                setDischargeModalOpen(true);
              }}
              onCreateMedicationPlan={handleCreateMedicationPlan}
              onRespondMedicationEvent={handleRespondMedicationEvent}
              onSubmitCheckIn={handleSubmitCheckIn}
              onReviewCheckIn={handleReviewCheckIn}
              onAddClinicalNote={handleAddClinicalNote}
              onGenerateAiReport={handleGenerateAiReport}
              onReviewAiReport={handleReviewAiReport}
              onTriggerSms={handleTriggerSms}
              onUpdateTask={handleUpdateTask}
              onRefreshState={fetchState}
            />
          ) : activeNav === 'demo_center' ? (
            <HackathonDemoCenter
              demoMeta={appState.demoMeta}
              effectiveNowIso={effectiveNowIso}
              patients={appState.patients}
              users={appState.users}
              onRunDemoAction={handleRunDemoAction}
              onOpenPatient={(patId) => setSelectedPatientId(patId)}
              onSwitchPersona={handleSelectPersona}
            />
          ) : activeNav === 'settings' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <PageTitle
                  title="Sozlamalar"
                  subtitle="Foydalanuvchi profili, til, ko‘rinish va xabarnoma qoidalari"
                />
                {isPatientOrCaregiver && (
                  <button
                    type="button"
                    onClick={() => setActiveNav('bosh_sahifa')}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1769E0] text-white text-sm font-semibold"
                  >
                    Kabinetga qaytish
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-xl text-[#152238]">
                    Shaxsiy hisob ma&apos;lumotlari
                  </h2>
                  <div className="space-y-3 text-base">
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between items-center gap-3">
                      <span className="text-[#64748B]">Foydalanuvchi:</span>
                      <span className="font-bold text-[#152238]">{actor.fullName}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between items-center gap-3">
                      <span className="text-[#64748B]">Tizimdagi rol:</span>
                      <span className="font-bold text-[#1769E0]">
                        {getRoleLabelUz(actor.role)}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2.5">
                      <div className="font-semibold text-[#152238]">Til:</div>
                      <LanguageSwitcher />
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-2.5">
                      <div className="font-semibold text-[#152238]">Ko‘rinish:</div>
                      <ThemeSwitcher />
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between items-center gap-3">
                      <span className="text-[#64748B]">Vaqt mintaqasi:</span>
                      <span className="font-mono font-bold text-[#152238]">
                        Asia/Tashkent (UTC+05:00)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-xl text-[#152238]">
                    Klinika xabarnoma va xavfsizlik qoidalari
                  </h2>
                  <div className="space-y-3 text-base">
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between">
                      <span className="text-[#64748B]">SMS eslatmalar moduli:</span>
                      <span className="font-bold text-[#16A34A]">
                        {currentOrganization.notificationConfig.smsEnabled
                          ? 'Faol (Simulyatsiya)'
                          : 'O‘chirilgan'}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between">
                      <span className="text-[#64748B]">AI ovozli yordamchi:</span>
                      <span className="font-bold text-[#1769E0]">
                        {currentOrganization.notificationConfig.aiVoiceEnabled
                          ? 'Faol (Rozilik asosida)'
                          : 'O‘chirilgan'}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 flex justify-between">
                      <span className="text-[#64748B]">Tinchlik soatlari:</span>
                      <span className="font-mono font-bold text-[#152238]">
                        {currentOrganization.notificationConfig.defaultQuietHours}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isPatientOrCaregiver ? (
            /* 2. Simplified Patient Mobile Interface — Strictly 4 Main Sections (Section 8, 9, 12) */
            <PatientPortalView
              patient={
                appState.patients.find((p) => p.id === actor.linkedPatientId) ||
                appState.patients[0]
              }
              actor={actor}
              activeSection={patientSection}
              onSelectSection={setPatientSection}
              careCase={
                appState.careCases.find(
                  (c) =>
                    c.patientId ===
                    (actor.linkedPatientId || appState.patients[0]?.id)
                ) || appState.careCases[0]
              }
              doctors={appState.doctorProfiles}
              conversations={appState.conversations}
              messages={appState.messages}
              medicationPlans={appState.medicationPlans}
              medicationEvents={appState.medicationEvents}
              dailyCheckIns={appState.dailyCheckIns}
              notifications={appState.notifications}
              consents={appState.consents}
              onRespondMedication={handleRespondMedicationEvent}
              onSubmitCheckIn={handleSubmitCheckIn}
              onToggleConsent={async (id, active) => {
                await fetch(`/api/consents/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ active }),
                });
                await fetchState();
                showToast('Rozilik holati yangilandi.');
              }}
              onTriggerCareTeamContact={async () => {
                const patId = actor.linkedPatientId || appState.patients[0].id;
                await handleTriggerSms(
                  patId,
                  'Bemor shifokor aloqasini so‘radi',
                  'Bemor mobil ilova orqali shifokor bilan bog‘lanishni so‘radi.',
                  'Ilova ichida'
                );
              }}
              onOpenPatientAiCall={(patId) => setSelectedPatientId(patId)}
              onSendChatMessage={handleSendChatMessage}
              onMarkChatRead={handleMarkChatRead}
            />
          ) : activeNav === 'doctor_profile' ? (
            <DoctorProfileView
              doctor={currentDoctorProfile}
              allDoctors={appState.doctorProfiles}
              onSelectDoctor={(docId) => setSelectedDoctorProfileId(docId)}
              organizations={appState.organizations}
              patients={appState.patients}
              careCases={appState.careCases}
              followUpTasks={appState.followUpTasks}
              dailyCheckIns={appState.dailyCheckIns}
              effectiveNowIso={effectiveNowIso}
              onOpenPatient={(patId) => setSelectedPatientId(patId)}
              onSaveDoctorProfile={handleSaveDoctorProfile}
            />
          ) : activeNav === 'xabarlar' ? (
            /* 3. XABARLAR: Doctor-Patient Chat + Separate AI Notifications */
            <NotificationSimulationCenter
              actor={actor}
              doctors={appState.doctorProfiles}
              patients={appState.patients}
              conversations={appState.conversations}
              messages={appState.messages}
              notifications={appState.notifications}
              dailyCheckIns={appState.dailyCheckIns}
              aiConversations={appState.aiConversations}
              initialChatPatientId={chatTargetPatientId}
              onOpenPatient={(patId) => setSelectedPatientId(patId)}
              onTriggerSms={handleTriggerSms}
              onSendChatMessage={handleSendChatMessage}
              onToggleChatPermission={handleToggleChatPermission}
              onMarkChatRead={handleMarkChatRead}
            />
          ) : activeNav === 'shifokorlar' ? (
            /* 4. Clinic Admin: Doctors & Specialty Templates (Section 11) */
            <ClinicAndTemplatesView
              activeSubPage="doctors"
              organizations={appState.organizations}
              users={appState.users}
              doctors={appState.doctorProfiles}
              patients={appState.patients}
              followUpTasks={appState.followUpTasks}
              templates={appState.templates}
              onInviteStaff={async (payload) => {
                await fetch('/api/staff', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                await fetchState();
                showToast('Yangi shifokor tizimga qo‘shildi!');
              }}
              onToggleStaffStatus={async (userId, nextStatus) => {
                await fetch(`/api/staff/${userId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: nextStatus }),
                });
                await fetchState();
                showToast('Shifokor holati yangilandi.');
              }}
              onCreateTemplate={async (payload) => {
                await fetch('/api/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                await fetchState();
                showToast('Yangi kuzatuv shabloni yaratildi!');
              }}
              onChangePlan={async (orgId, plan: SubscriptionPlanId) => {
                await fetch(`/api/organizations/${orgId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionPlan: plan }),
                });
                await fetchState();
                showToast(`Tarif rejasi "${plan}" ga o‘zgartirildi.`);
              }}
            />
          ) : activeNav === 'klinika_sozlamalari' ? (
            <SubscriptionBillingView
              organization={currentOrganization}
              onChangePlan={async (orgId, plan: SubscriptionPlanId) => {
                await fetch(`/api/organizations/${orgId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionPlan: plan }),
                });
                await fetchState();
                showToast(`Tarif rejasi "${plan}" ga o‘zgartirildi.`);
              }}
            />
          ) : activeNav === 'hisobotlar' ? (
            /* 5. HISOBOTLAR — SIMPLE REPORTS (4 Main Stats + 1 Chart + 1 Compact Table + Expandable "Batafsil hisobot") */
            <div className="space-y-6">
              <PageTitle
                title="Hisobotlar"
                subtitle="Bemorlar kuzatuvi ko‘rsatkichlari va AI shifokor hisobotlari"
                action={
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-[46px] px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-[#152238] text-base font-semibold rounded-xl flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4 text-[#1769E0]" />
                      <span>Chop etish / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleGenerateAiReport(
                          appState.patients[0]?.id || 'pat-01'
                        );
                        setShowDetailedReports(true);
                      }}
                      className="min-h-[46px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>AI hisobot yaratish</span>
                    </button>
                  </div>
                }
              />

              {/* Strictly 4 Main Statistics at the Top */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <StatCard
                  label="Aktiv bemorlar"
                  value={activePatientsCount}
                  helperText="Hozir kuzatuvda"
                  icon={Users}
                  tone="blue"
                />
                <StatCard
                  label="Bajarilgan kuzatuvlar"
                  value={completedTasks.length}
                  helperText="Yakunlangan vazifalar"
                  icon={CheckCircle2}
                  tone="green"
                />
                <StatCard
                  label="Kuzatuvi kechikkanlar"
                  value={overdueTasks.length}
                  helperText="Muddati o‘tgan vazifalar"
                  icon={AlertTriangle}
                  tone="red"
                />
                <StatCard
                  label="Bemorlarning javob berish darajasi"
                  value={`${patientResponseRatePct}%`}
                  helperText="Dori va holat tasdig‘i"
                  icon={Activity}
                  tone="teal"
                />
              </div>

              {/* 1 Simple Weekly Follow-Up Chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#152238]">
                    Haftalik kuzatuv va dori tasdig‘i dinamikasi
                  </h2>
                  <p className="text-sm sm:text-base text-[#64748B]">
                    Bemorlar tomonidan tasdiqlangan va kutilayotgan kuzatuv javoblari
                  </p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyMedicationChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="day" stroke="#64748B" fontSize={13} />
                      <YAxis stroke="#64748B" fontSize={13} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="Ichdim"
                        name="Tasdiqlangan"
                        fill="#16A34A"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="Kutilmoqda"
                        name="Kutilmoqda"
                        fill="#D97706"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="Otkazildi"
                        name="O‘tkazib yuborilgan"
                        fill="#DC2626"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 1 Compact Patient Monitoring Summary Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                      Bemorlar monitoringi qisqacha jadvali
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      Har bir bemorning dori, kunlik holat va kuzatuv ko‘rsatkichi
                    </p>
                  </div>
                </div>
                {renderCompactPatientList(appState.patients.slice(0, 7))}
              </div>

              {/* Expandable "Batafsil hisobot" Section (Complex Analytics & AI Report Cards) */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDetailedReports(!showDetailedReports)}
                  aria-expanded={showDetailedReports}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                      Batafsil hisobot ({appState.aiReports.length} ta AI hisobot)
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      AI tomonidan tayyorlangan tahliliy hisobotlar va shifokor xulosalari
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F7FAFC] border border-slate-200 text-sm font-bold text-[#1769E0] shrink-0">
                    <span>{showDetailedReports ? 'Yopish' : 'Ochish'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showDetailedReports ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {showDetailedReports && (
                  <div className="p-5 pt-0 border-t border-slate-100 space-y-4">
                    {appState.aiReports.map((rep) => {
                      const pat = appState.patients.find(
                        (p) => p.id === rep.patientId
                      );
                      return (
                        <div
                          key={rep.id}
                          className="bg-[#F7FAFC] border border-slate-200 rounded-2xl p-5 space-y-4 mt-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <span className="inline-block text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                                AI tomonidan tayyorlangan — shifokor tekshirishi kerak.
                              </span>
                              <h3 className="font-display font-bold text-lg sm:text-xl text-[#152238] mt-2">
                                Bemor: {pat?.fullName || rep.patientId} · Davr:{' '}
                                {rep.summary.reportingPeriod}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={rep.clinicianReviewStatus} />
                              {pat && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPatientId(pat.id)}
                                  className="min-h-[42px] px-4 py-2 text-sm font-bold text-white bg-[#1769E0] hover:bg-blue-700 rounded-xl"
                                >
                                  Bemorni ko‘rish
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm sm:text-base">
                            <div className="p-4 rounded-xl bg-white border border-slate-200">
                              <div className="font-bold text-[#152238]">
                                Dori qabuli tasdig‘i:
                              </div>
                              <div className="text-[#64748B] mt-1">
                                {rep.summary.medicationConfirmationSummary}
                              </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white border border-slate-200">
                              <div className="font-bold text-[#152238]">
                                Kunlik holat va og‘riq:
                              </div>
                              <div className="text-[#64748B] mt-1">
                                {rep.summary.dailyCheckInResponses} (
                                {rep.summary.painScoreTrend})
                              </div>
                            </div>
                          </div>
                          <div className="text-sm sm:text-base text-[#152238] bg-blue-50/70 border border-blue-200 p-4 rounded-xl">
                            <strong>Shifokor qaydi:</strong>{' '}
                            {rep.summary.doctorEditableNotes}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeNav === 'vazifalar' ? (
            /* 6. VAZIFALAR — COMPACT TASK MANAGEMENT (Strictly 3 Tabs: Bugungi | Kutilayotgan | Bajarilgan) */
            (() => {
              const activeTask = selectedTaskId
                ? appState.followUpTasks.find((t) => t.id === selectedTaskId) ||
                  null
                : null;
              const activeTaskPatient = activeTask
                ? appState.patients.find((p) => p.id === activeTask.patientId)
                : undefined;
              const activeTaskDoctor = activeTask
                ? appState.doctorProfiles.find(
                    (d) => d.id === activeTask.assignedDoctorId
                  )
                : undefined;
              const activeTaskCd = activeTask
                ? getCountdownInfo(
                    activeTask.dueAt,
                    effectiveNowIso,
                    activeTask.status
                  )
                : null;

              const openTaskDetails = (task: (typeof appState.followUpTasks)[0]) => {
                setSelectedTaskId(task.id);
                setTaskContactMethod(task.contactMethod || 'Telefon muloqoti');
                setTaskNoteInput(task.notes || '');
              };

              return (
                <div className="space-y-4">
                  {/* Compact Page Header */}
                  <PageTitle
                    title="Vazifalar"
                    subtitle="Shifoxonadan chiqarilgan bemorlar bilan 24 soatlik va rejali kuzatuv vazifalari"
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setDischargeDefaultPatientId('pat-01');
                          setDischargeModalOpen(true);
                        }}
                        className="min-h-[44px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl"
                      >
                        + Bemorni uyga chiqarish
                      </button>
                    }
                  />

                  {/* Compact Overdue Notice Strip (No oversized stacked cards) */}
                  {overdueTasks.length > 0 && !activeTask && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 text-red-800 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                        <span>
                          Muddati o‘tgan vazifalar: <strong>{overdueTasks.length} ta</strong> — ro‘yxatning yuqori qismida ko‘rsatilgan.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskFilter('TODAY');
                          openTaskDetails(overdueTasks[0]);
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-white border border-red-200 text-red-700 font-bold text-xs hover:bg-red-100/50"
                      >
                        Ko‘rish →
                      </button>
                    </div>
                  )}

                  {/* Strictly 3 Simple Tabs: Bugungi | Kutilayotgan | Bajarilgan */}
                  {!activeTask && (
                    <FilterTabs
                      activeId={taskFilter}
                      onSelect={(id) =>
                        setTaskFilter(id as 'TODAY' | 'PENDING' | 'COMPLETED')
                      }
                      options={[
                        {
                          id: 'TODAY',
                          label: 'Bugungi',
                          count: todayTasks.length,
                        },
                        {
                          id: 'PENDING',
                          label: 'Kutilayotgan',
                          count:
                            pendingTasks.length > 0
                              ? pendingTasks.length
                              : prioritySortedTasks.length,
                        },
                        {
                          id: 'COMPLETED',
                          label: 'Bajarilgan',
                          count: completedTasks.length,
                        },
                      ]}
                    />
                  )}

                  {/* TASK DETAILS VIEW (Opened when clicking a task row, mobile card, or "Ko‘rish" button) */}
                  {activeTask && activeTaskCd ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(null)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7FAFC] hover:bg-slate-100 border border-slate-200 text-sm sm:text-base font-bold text-[#152238] flex items-center gap-2"
                        >
                          <span>← Vazifalar ro‘yxatiga qaytish</span>
                        </button>
                        <StatusBadge
                          status={
                            activeTask.status === 'Bajarildi'
                              ? 'Bajarildi'
                              : activeTaskCd.isOverdue
                              ? 'Muddati o‘tgan'
                              : activeTask.status
                          }
                        />
                      </div>

                      {/* Patient & Task Core Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-1.5">
                          <div className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Bemor ma’lumotlari
                          </div>
                          <h3 className="font-display text-xl font-bold text-[#152238]">
                            {activeTaskPatient?.fullName || activeTask.patientId}
                            {activeTaskPatient
                              ? ` (${activeTaskPatient.age} yosh)`
                              : ''}
                          </h3>
                          <p className="text-sm sm:text-base text-[#152238]">
                            {activeTaskPatient?.careCaseType || 'Rejali kuzatuv'}
                          </p>
                          {activeTaskPatient && (
                            <div className="pt-1 text-sm text-[#64748B] space-y-0.5">
                              <div>
                                Telefon:{' '}
                                <strong className="font-mono text-[#152238]">
                                  {activeTaskPatient.contact}
                                </strong>
                              </div>
                              <div>
                                Hudud: <strong>{activeTaskPatient.district}</strong>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-1.5">
                          <div className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Vazifa va muddat
                          </div>
                          <div className="font-display text-lg font-bold text-[#152238]">
                            {activeTask.taskType}
                          </div>
                          <div className="text-sm sm:text-base font-mono font-semibold text-[#1769E0]">
                            Muddat: {formatUzDateTime(activeTask.dueAt)} (
                            {activeTaskCd.label})
                          </div>
                          <div className="text-sm text-[#64748B]">
                            Mas’ul shifokor:{' '}
                            <strong className="text-[#152238]">
                              {activeTaskDoctor?.fullName || actor.fullName}
                            </strong>
                          </div>
                          {activeTask.completedAt && (
                            <div className="text-sm text-[#16A34A] font-semibold">
                              Bajarilgan vaqt:{' '}
                              {formatUzDateTime(activeTask.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Task Description / Clinical Note */}
                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1">
                        <div className="text-xs font-bold uppercase tracking-wide text-[#1769E0]">
                          Vazifa tavsifi va ko‘rsatma
                        </div>
                        <p className="text-sm sm:text-base text-[#152238] leading-relaxed">
                          {activeTask.notes}
                        </p>
                      </div>

                      {/* Follow-Up Completion Form (If not yet completed) */}
                      {activeTask.status !== 'Bajarildi' && (
                        <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-3.5">
                          <h4 className="font-display text-base sm:text-lg font-bold text-[#152238]">
                            Kuzatuv natijasini qayd etish
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-sm font-semibold text-[#152238] mb-1">
                                Muloqot usuli
                              </label>
                              <select
                                value={taskContactMethod}
                                onChange={(e) =>
                                  setTaskContactMethod(e.target.value as any)
                                }
                                className="w-full min-h-[44px] px-3.5 py-2 text-sm sm:text-base bg-white border border-slate-300 rounded-xl"
                              >
                                <option value="Telefon muloqoti">
                                  Telefon muloqoti
                                </option>
                                <option value="Klinikada qabul">
                                  Poliklinikada qabul
                                </option>
                                <option value="Uyga tashrif">
                                  Uyga tashrif (Patronaj)
                                </option>
                                <option value="Video konsultatsiya">
                                  Video konsultatsiya
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-[#152238] mb-1">
                                Shifokor xulosasi (ixtiyoriy)
                              </label>
                              <input
                                type="text"
                                value={taskNoteInput}
                                onChange={(e) => setTaskNoteInput(e.target.value)}
                                placeholder="Masalan: Bemor bilan bog‘lanildi, ahvoli barqaror..."
                                className="w-full min-h-[44px] px-3.5 py-2 text-sm sm:text-base bg-white border border-slate-300 rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Clear Accessible Action Buttons (Minimum 44px touch targets) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {activeTask.status !== 'Bajarildi' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await handleUpdateTask(activeTask.id, {
                                  status: 'Bajarildi',
                                  contactMethod: taskContactMethod,
                                  notes:
                                    taskNoteInput.trim() ||
                                    'Shifokor tomonidan bemor bilan muloqot o‘tkazildi va kuzatuv yakunlandi.',
                                });
                                setSelectedTaskId(null);
                              }}
                              className="min-h-[46px] px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white text-sm sm:text-base font-bold rounded-xl"
                            >
                              Kuzatuvni yakunlash
                            </button>
                          )}

                          {activeTaskPatient && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(null);
                                  setChatTargetPatientId(activeTaskPatient.id);
                                  setActiveNav('xabarlar');
                                }}
                                className="min-h-[46px] px-4 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl"
                              >
                                Bemor bilan bog‘lanish
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(null);
                                  setSelectedPatientId(activeTaskPatient.id);
                                }}
                                className="min-h-[46px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#152238] text-sm sm:text-base font-bold rounded-xl"
                              >
                                Bemorni ko‘rish
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <EmptyState
                      title="Ushbu bo‘limda vazifalar yo‘q"
                      description="Boshqa bo‘limni tanlang yoki yangi bemorni uyga chiqarish vazifasini yarating."
                    />
                  ) : (
                    <>
                      {/* DESKTOP COMPACT TABLE (>=768px): Patient name | Task description | Deadline | Status | Small "Ko‘rish" button */}
                      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#F7FAFC] border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                              <th className="py-2.5 px-4">Bemor</th>
                              <th className="py-2.5 px-4">Vazifa tavsifi</th>
                              <th className="py-2.5 px-4">Muddat</th>
                              <th className="py-2.5 px-4">Holat</th>
                              <th className="py-2.5 px-4 text-right">Amal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredTasks.map((task) => {
                              const pat = appState.patients.find(
                                (p) => p.id === task.patientId
                              );
                              const cd = getCountdownInfo(
                                task.dueAt,
                                effectiveNowIso,
                                task.status
                              );
                              const isDone = task.status === 'Bajarildi';
                              const displayStatus = isDone
                                ? 'Bajarildi'
                                : cd.isOverdue
                                ? 'Muddati o‘tgan'
                                : task.status;

                              return (
                                <tr
                                  key={task.id}
                                  onClick={() => openTaskDetails(task)}
                                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                                >
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <div className="font-display font-bold text-[15px] text-[#152238]">
                                      {pat?.fullName || task.patientId}
                                    </div>
                                    {pat && (
                                      <div className="text-xs text-[#64748B]">
                                        {pat.age} yosh · {pat.district}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 max-w-[320px]">
                                    <div className="font-semibold text-sm text-[#152238] truncate">
                                      {task.taskType}
                                    </div>
                                    <div className="text-xs text-[#64748B] truncate">
                                      {pat?.careCaseType || task.notes}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <div
                                      className={`font-mono text-xs font-semibold ${
                                        cd.isOverdue && !isDone
                                          ? 'text-[#DC2626]'
                                          : 'text-[#152238]'
                                      }`}
                                    >
                                      {formatUzDateTime(task.dueAt)}
                                    </div>
                                    <div className="text-xs text-[#64748B]">
                                      {cd.label}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <StatusBadge status={displayStatus} />
                                  </td>
                                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTaskDetails(task);
                                      }}
                                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#F7FAFC] hover:bg-[#1769E0] hover:text-white border border-slate-200 text-sm font-bold text-[#1769E0] transition-colors"
                                    >
                                      Ko‘rish
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* MOBILE COMPACT LIST (<768px): 2–3 short lines showing patient name, task, deadline, and status */}
                      <div className="md:hidden space-y-2">
                        {filteredTasks.map((task) => {
                          const pat = appState.patients.find(
                            (p) => p.id === task.patientId
                          );
                          const cd = getCountdownInfo(
                            task.dueAt,
                            effectiveNowIso,
                            task.status
                          );
                          const isDone = task.status === 'Bajarildi';
                          const displayStatus = isDone
                            ? 'Bajarildi'
                            : cd.isOverdue
                            ? 'Muddati o‘tgan'
                            : task.status;

                          return (
                            <div
                              key={task.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => openTaskDetails(task)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  openTaskDetails(task);
                                }
                              }}
                              className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 space-y-1.5 active:bg-slate-50 transition-colors cursor-pointer"
                            >
                              {/* Line 1: Patient Name & Status Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display font-bold text-[15px] text-[#152238] truncate">
                                  {pat?.fullName || task.patientId}
                                  {pat ? ` (${pat.age})` : ''}
                                </span>
                                <StatusBadge status={displayStatus} />
                              </div>

                              {/* Line 2: Compact Task Description */}
                              <p className="text-sm text-[#152238] truncate">
                                {task.taskType}
                                {pat ? ` · ${pat.careCaseType}` : ''}
                              </p>

                              {/* Line 3: Deadline & Compact "Ko‘rish" Action */}
                              <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                                <span
                                  className={`font-mono font-medium truncate ${
                                    cd.isOverdue && !isDone
                                      ? 'text-[#DC2626]'
                                      : 'text-[#64748B]'
                                  }`}
                                >
                                  Muddat: {formatUzDateTime(task.dueAt)}
                                </span>
                                <span className="font-bold text-[#1769E0] shrink-0">
                                  Ko‘rish →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()
          ) : activeNav === 'bemorlar' ? (
            /* 7. SIMPLIFIED PATIENT LIST PAGE (Section 5) */
            <div className="space-y-6">
              <PageTitle
                title="Bemorlar"
                subtitle="Sizga biriktirilgan bemorlar"
                action={
                  <button
                    type="button"
                    onClick={() => setAddPatientModalOpen(true)}
                    className="min-h-[48px] px-5 py-3 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>+ Bemor qo‘shish</span>
                  </button>
                }
              />

              {/* Search and Simple Filters Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Bemor ismi yoki ID bo‘yicha qidirish"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExtraFilters(!showExtraFilters)}
                    className="min-h-[46px] px-4 py-2.5 bg-[#F7FAFC] hover:bg-slate-100 border border-slate-300 rounded-xl text-base font-semibold text-[#152238] flex items-center gap-2 shrink-0"
                  >
                    <Filter className="w-4 h-4 text-[#64748B]" />
                    <span>Qo‘shimcha filtrlar</span>
                  </button>
                </div>

                {/* 4 Simple Filter Tabs */}
                <FilterTabs
                  activeId={patientTabFilter}
                  onSelect={(id) => setPatientTabFilter(id as any)}
                  options={[
                    {
                      id: 'ALL',
                      label: 'Barchasi',
                      count: appState.patients.length,
                    },
                    {
                      id: 'ACTIVE',
                      label: 'Faol kuzatuvda',
                      count: appState.patients.filter(
                        (p) =>
                          p.caseStatus === 'Aktiv kuzatuvda' ||
                          p.caseStatus === 'Oilaviy shifokor biriktirilgan'
                      ).length,
                    },
                    {
                      id: 'REVIEW',
                      label: 'Ko‘rib chiqish kerak',
                      count: reviewRequiredPatients.length,
                    },
                    {
                      id: 'COMPLETED',
                      label: 'Kuzatuv yakunlangan',
                      count: appState.patients.filter(
                        (p) =>
                          p.caseStatus === 'Yakunlangan' ||
                          p.caseStatus === 'Arxivlangan'
                      ).length,
                    },
                  ]}
                />

                {/* Expandable Extra Filters (Doctor & Specialty) */}
                {showExtraFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-semibold text-[#152238] mb-1">
                        Shifokor bo‘yicha filtrlash
                      </label>
                      <select
                        value={doctorFilter}
                        onChange={(e) => setDoctorFilter(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 text-base bg-[#F7FAFC] border border-slate-300 rounded-xl"
                      >
                        <option value="ALL">Barcha shifokorlar</option>
                        {appState.doctorProfiles.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} ({d.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#152238] mb-1">
                        Tibbiy yo‘nalish bo‘yicha
                      </label>
                      <select
                        value={specialtyFilter}
                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 text-base bg-[#F7FAFC] border border-slate-300 rounded-xl"
                      >
                        <option value="ALL">Barcha yo‘nalishlar</option>
                        <option value="Jarrohlik">Jarrohlik</option>
                        <option value="Kardiologiya">Kardiologiya</option>
                        <option value="Terapiya">Terapiya</option>
                        <option value="Stomatologiya">Stomatologiya</option>
                        <option value="Pediatriya">Pediatriya</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {filteredPatients.length === 0 ? (
                <EmptyState
                  title="Qidiruv bo‘yicha bemor topilmadi"
                  description="Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalang."
                  actionLabel="Filtrlarni tozalash"
                  onAction={() => {
                    setSearchQuery('');
                    setPatientTabFilter('ALL');
                    setDoctorFilter('ALL');
                    setSpecialtyFilter('ALL');
                  }}
                />
              ) : (
                renderCompactPatientList(filteredPatients)
              )}
            </div>
          ) : (
            /* 8. SIMPLIFIED DOCTOR / CLINIC HOME DASHBOARD ("Bosh sahifa" — Section 4) */
            <div className="space-y-5 md:space-y-6">
              {/* Top Greeting Header (Section 4) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
                <div>
                  <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#152238]">
                    Assalomu alaykum, doktor!
                  </h1>
                  <p className="text-base text-[#64748B] mt-1">
                    Bugun sizning e&apos;tiboringizni talab qiladigan vazifalar (
                    {actor.fullName})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddPatientModalOpen(true)}
                    className="w-full sm:w-auto min-h-[46px] px-4 py-2.5 bg-[#F7FAFC] hover:bg-slate-100 border border-slate-300 text-[#152238] text-base font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-[#1769E0]" />
                    <span>+ Bemor qo‘shish</span>
                  </button>
                </div>
              </div>

              {/* Strictly 4 Primary KPI Cards (2x2 compact grid on mobile <768px, 4 cols on desktop) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  label="Aktiv bemorlar"
                  value={activePatientsCount}
                  helperText="Hozir kuzatuvda"
                  icon={Users}
                  tone="blue"
                  onClick={() => {
                    setPatientTabFilter('ACTIVE');
                    setActiveNav('bemorlar');
                  }}
                />
                <StatCard
                  label="Bugungi vazifalar"
                  value={openTasks.length}
                  helperText="Bugun bajarilishi kerak"
                  icon={Clock}
                  tone="teal"
                  onClick={() => {
                    setTaskFilter('TODAY');
                    setActiveNav('vazifalar');
                  }}
                />
                <StatCard
                  label="Yangi xabarlar"
                  value={appState.notifications.length}
                  helperText="Bemorlardan kelgan"
                  icon={Bell}
                  tone="amber"
                  onClick={() => setActiveNav('xabarlar')}
                />
                <StatCard
                  label="Ko‘rib chiqish kerak"
                  value={needsReviewTotal}
                  helperText="Shifokor e'tibori zarur"
                  icon={AlertTriangle}
                  tone="red"
                  onClick={() => {
                    setPatientTabFilter('REVIEW');
                    setActiveNav('bemorlar');
                  }}
                />
              </div>

              {/* Main Priority Section: "Bugungi eng muhim vazifalar" (Section 4) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#152238]">
                      Bugungi eng muhim vazifalar
                    </h2>
                    <p className="text-base text-[#64748B]">
                      Shoshilinch ko‘rib chiqish va 24 soatlik shifoxonadan keyingi kuzatuvlar
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('vazifalar')}
                    className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#1769E0] hover:bg-blue-50 rounded-xl"
                  >
                    Barcha vazifalar ({openTasks.length})
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {prioritySortedTasks.slice(0, 6).map((task) => {
                    const pat = appState.patients.find(
                      (p) => p.id === task.patientId
                    );
                    const cd = getCountdownInfo(
                      task.dueAt,
                      effectiveNowIso,
                      task.status
                    );
                    return (
                      <div
                        key={task.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-display text-lg font-bold text-[#152238]">
                              {pat?.fullName || task.patientId}
                            </span>
                            <StatusBadge
                              status={
                                cd.isOverdue
                                  ? 'Muddati o‘tgan'
                                  : task.status === 'Yangi'
                                  ? 'Yangi vazifa'
                                  : task.status
                              }
                            />
                          </div>
                          <div className="text-base text-[#152238]">
                            {task.taskType} — {pat?.careCaseType}
                          </div>
                          <div className="text-sm font-mono text-[#64748B]">
                            Muddat: {formatUzDateTime(task.dueAt)} ({cd.label})
                          </div>
                        </div>

                        {pat && (
                          <button
                            type="button"
                            onClick={() => setSelectedPatientId(pat.id)}
                            className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-semibold rounded-xl shrink-0"
                          >
                            Bemorni ko‘rish
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compact Patient List Section on Doctor Dashboard (Displays 6 patients without excessive scrolling) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                      Kuzatuvdagi bemorlar ro‘yxati
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      Bemor ustiga bosib to‘liq davolanish tarixi, dorilar va kunlik holat profilini oching
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientTabFilter('ALL');
                      setActiveNav('bemorlar');
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 text-sm font-semibold text-[#1769E0] hover:bg-blue-50 rounded-xl"
                  >
                    Barcha bemorlar ({appState.patients.length})
                  </button>
                </div>

                {renderCompactPatientList(appState.patients.slice(0, 6))}
              </div>

              {/* Secondary Section: "So‘nggi bemor xabarlari" (Section 4: 3 to 5 recent items) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#152238]">
                      So‘nggi bemor xabarlari
                    </h2>
                    <p className="text-base text-[#64748B]">
                      Bemorlardan kelgan oxirgi holat ma&apos;lumotlari va murojaatlar
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('xabarlar')}
                    className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#1769E0] hover:bg-blue-50 rounded-xl"
                  >
                    Barchasini ko‘rish
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {appState.dailyCheckIns.slice(0, 4).map((chk) => {
                    const pat = appState.patients.find(
                      (p) => p.id === chk.patientId
                    );
                    return (
                      <div
                        key={chk.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-display text-lg font-bold text-[#152238]">
                              {pat?.fullName || chk.patientId}
                            </span>
                            <StatusBadge status={chk.reviewStatus} />
                            <span className="text-sm font-mono text-[#64748B]">
                              Og‘riq: {chk.painScore}/10
                            </span>
                          </div>
                          <p className="text-base text-[#152238]">
                            {chk.reportedSymptoms}
                          </p>
                        </div>
                        {pat && (
                          <button
                            type="button"
                            onClick={() => setSelectedPatientId(pat.id)}
                            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#152238] text-base font-semibold rounded-xl shrink-0"
                          >
                            Bemorni ko‘rish
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Clean Mobile Bottom Navigation Bar (<768px only) */}
        {!isPatientOrCaregiver && (
          <nav
            aria-label="Mobil pastki navigatsiya"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-1.5 py-1.5 grid grid-cols-5 gap-1 shadow-lg no-print"
          >
            {(
              [
                { id: 'bosh_sahifa', label: 'Bosh sahifa', icon: LayoutDashboard },
                { id: 'bemorlar', label: 'Bemorlar', icon: Users },
                {
                  id: 'vazifalar',
                  label: 'Vazifalar',
                  icon: Activity,
                  badge: openTasks.length,
                },
                {
                  id: 'xabarlar',
                  label: 'Xabarlar',
                  icon: Bell,
                  badge: appState.notifications.length,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive =
                !selectedPatientId &&
                !mobileMenuOpen &&
                activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setMobileMenuOpen(false);
                    setActiveNav(item.id);
                  }}
                  className={`relative min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[#1769E0]'
                      : 'text-[#64748B] hover:text-[#152238]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate max-w-full">{item.label}</span>
                </button>
              );
            })}

            {/* 5th Item: "Ko‘proq" (Contains Hisobotlar, Profil, Sozlamalar) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs font-bold transition-colors ${
                mobileMenuOpen ||
                activeNav === 'hisobotlar' ||
                activeNav === 'doctor_profile' ||
                activeNav === 'settings'
                  ? 'bg-blue-50 text-[#1769E0]'
                  : 'text-[#64748B] hover:text-[#152238]'
              }`}
            >
              <Menu className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-full">Ko‘proq</span>
            </button>
          </nav>
        )}
      </div>

      {/* Modals for Official Challenge #11 Discharge & Adding Patients */}
      <DischargeModal
        isOpen={dischargeModalOpen}
        onClose={() => setDischargeModalOpen(false)}
        patients={appState.patients}
        defaultPatientId={dischargeDefaultPatientId}
        organizations={appState.organizations}
        doctors={appState.doctorProfiles}
        onConfirmDischarge={handleConfirmDischarge}
      />

      <AddPatientModal
        isOpen={addPatientModalOpen}
        onClose={() => setAddPatientModalOpen(false)}
        organizations={appState.organizations}
        doctors={appState.doctorProfiles}
        defaultOrgId={currentOrganization.id}
        onAddPatient={handleAddPatient}
      />
    </div>
  );
}
