import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  Home,
  Lock,
  MessageSquare,
  Phone,
  PhoneCall,
  Pill,
  Search,
  Send,
  Settings,
  Stethoscope,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  AIConversation,
  CareCase,
  ChatConversation,
  ChatMessage,
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
  SpecialtyTemplate,
  SubscriptionPlanId,
  UserAccount,
} from '../shared/types';
import { formatShortTime, formatUzDateTime, getRoleLabelUz } from '../utils/formatters';
import { FilterTabs, PageTitle, StatCard, StatusBadge } from './SharedUI';

// ============================================================================
// 1. SIMPLIFIED PATIENT MOBILE EXPERIENCE (Sections 8, 9, 12)
//    Strictly 4 Main Sections: 1. Bosh sahifa | 2. Dorilarim | 3. Kunlik holat | 4. Xabarlar
// ============================================================================
export type PatientSectionId = 'bosh_sahifa' | 'dorilarim' | 'kunlik_holat' | 'xabarlar';

interface PatientPortalViewProps {
  patient: Patient;
  actor: UserAccount;
  activeSection: PatientSectionId;
  onSelectSection: (sec: PatientSectionId) => void;
  careCase?: CareCase;
  doctors?: DoctorProfile[];
  conversations?: ChatConversation[];
  messages?: ChatMessage[];
  medicationPlans: MedicationPlan[];
  medicationEvents: MedicationEvent[];
  dailyCheckIns: DailyCheckIn[];
  notifications: NotificationItem[];
  consents: ConsentRecord[];
  onRespondMedication: (
    eventId: string,
    status: MedicationReportedStatus,
    note?: string
  ) => Promise<void>;
  onSubmitCheckIn: (payload: any) => Promise<void>;
  onToggleConsent: (consentId: string, active: boolean) => Promise<void>;
  onTriggerCareTeamContact: () => Promise<void>;
  onOpenPatientAiCall: (patientId: string) => void;
  onSendChatMessage?: (params: {
    conversationId?: string;
    patientId: string;
    doctorId: string;
    content: string;
  }) => Promise<void>;
  onMarkChatRead?: (conversationId: string) => Promise<void>;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  patient,
  actor,
  activeSection,
  onSelectSection,
  careCase,
  doctors = [],
  conversations = [],
  messages = [],
  medicationPlans,
  medicationEvents,
  dailyCheckIns,
  notifications,
  consents,
  onRespondMedication,
  onSubmitCheckIn,
  onToggleConsent,
  onTriggerCareTeamContact,
  onOpenPatientAiCall,
  onSendChatMessage,
  onMarkChatRead,
}) => {
  // Step-by-step 4-question Daily Check-In state (Section 9)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [q1Feeling, setQ1Feeling] = useState<'Yaxshi' | 'O‘rtacha' | 'Yomon'>('Yaxshi');
  const [q2Pain, setQ2Pain] = useState<number>(2);
  const [q3HasComplaint, setQ3HasComplaint] = useState<boolean>(false);
  const [q3ComplaintText, setQ3ComplaintText] = useState<string>('');
  const [q4WantDoctor, setQ4WantDoctor] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);

  // Patient Chat state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    patient.treatingDoctorId || 'doc-1'
  );
  const [patientChatInput, setPatientChatInput] = useState<string>('');
  const [sendingChat, setSendingChat] = useState<boolean>(false);
  const patientChatBottomRef = useRef<HTMLDivElement | null>(null);

  const patientMeds = medicationEvents.filter((m) => m.patientId === patient.id);
  const nextMed =
    patientMeds.find((m) => m.reportedStatus === 'Tasdiqlanmagan') || patientMeds[0];
  const todayCheckIn = dailyCheckIns.find((c) => c.patientId === patient.id);
  const patientNotifs = notifications.filter((n) => n.patientId === patient.id);

  const assignedDoctors = doctors.filter(
    (d) =>
      d.id === patient.treatingDoctorId ||
      d.id === patient.familyDoctorId ||
      conversations.some((c) => c.patientId === patient.id && c.doctorId === d.id)
  );
  const activeDoctor =
    assignedDoctors.find((d) => d.id === selectedDoctorId) ||
    assignedDoctors[0] ||
    doctors[0];
  const activeConversation = conversations.find(
    (c) =>
      c.patientId === patient.id &&
      c.doctorId === (activeDoctor?.id || patient.treatingDoctorId)
  );
  const activeChatMessages = activeConversation
    ? messages
        .filter((m) => m.conversationId === activeConversation.id)
        .sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
    : [];

  useEffect(() => {
    if (activeSection === 'xabarlar' && activeConversation && onMarkChatRead) {
      const hasUnreadFromDoctor = activeChatMessages.some(
        (m) =>
          m.senderRole !== 'PATIENT' &&
          m.senderRole !== 'CAREGIVER' &&
          !m.readAt
      );
      if (hasUnreadFromDoctor) {
        onMarkChatRead(activeConversation.id);
      }
    }
  }, [activeSection, activeConversation, activeChatMessages.length, onMarkChatRead]);

  useEffect(() => {
    if (activeSection === 'xabarlar') {
      patientChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSection, activeChatMessages.length, selectedDoctorId]);

  const handlePatientSendChat = async () => {
    const trimmed = patientChatInput.trim();
    if (
      !trimmed ||
      !onSendChatMessage ||
      !activeConversation ||
      activeConversation.patientCanSend !== true
    ) {
      return;
    }
    setSendingChat(true);
    try {
      await onSendChatMessage({
        conversationId: activeConversation.id,
        patientId: patient.id,
        doctorId: activeConversation.doctorId,
        content: trimmed,
      });
      setPatientChatInput('');
    } finally {
      setSendingChat(false);
    }
  };

  const activeRecoveryPlan = careCase?.recoveryPlan || patient.recoveryPlan;
  const planQuestions =
    activeRecoveryPlan?.checkInQuestions &&
    activeRecoveryPlan.checkInQuestions.length >= 4
      ? activeRecoveryPlan.checkInQuestions
      : [
          'Bugun o‘zingizni qanday his qilyapsiz?',
          'Og‘riq darajangiz nechchi? (0 — og‘riq yo‘q, 10 — juda kuchli)',
          'Yangi shikoyatingiz bormi?',
          'Shifokor bilan bog‘lanishni xohlaysizmi?',
        ];

  const handleWizardSubmit = async () => {
    setSubmitting(true);
    try {
      const mappedFeeling =
        q1Feeling === 'Yomon'
          ? 'Og‘riq kuchaygan'
          : q1Feeling === 'O‘rtacha'
          ? 'O‘rtacha'
          : 'Yaxshi';
      await onSubmitCheckIn({
        patientId: patient.id,
        overallFeeling: mappedFeeling,
        painScore: q2Pain,
        hasNewComplaint: q3HasComplaint,
        reportedSymptoms: q3HasComplaint
          ? q3ComplaintText || 'Bemor yangi bezovtalik / shikoyat borligini bildirdi'
          : 'Yangi shikoyat yo‘q',
        requestedDoctorContact: q4WantDoctor,
      });
      setCheckInSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 pb-20 md:pb-0">
      {/* Desktop Top 4-Item Patient Navigation Bar (Hidden on mobile <768px) */}
      <div className="hidden md:grid bg-white border border-slate-200 rounded-2xl p-3 grid-cols-4 gap-2">
        {(
          [
            { id: 'bosh_sahifa', label: '1. Bosh sahifa', icon: Home },
            { id: 'dorilarim', label: '2. Dorilarim', icon: Pill },
            { id: 'kunlik_holat', label: '3. Kunlik holat', icon: HeartPulse },
            { id: 'xabarlar', label: '4. Xabarlar', icon: Bell },
          ] as const
        ).map((nav) => {
          const Icon = nav.icon;
          const active = activeSection === nav.id;
          return (
            <button
              key={nav.id}
              type="button"
              onClick={() => {
                setCheckInSuccess(false);
                onSelectSection(nav.id);
              }}
              className={`min-h-[50px] px-4 py-2.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
                active
                  ? 'bg-[#1769E0] text-white'
                  : 'bg-[#F7FAFC] text-[#152238] hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{nav.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Fixed Bottom Navigation Bar for Patients (<768px only) */}
      <nav
        aria-label="Bemor mobil navigatsiyasi"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-4 gap-1 shadow-lg no-print"
      >
        {(
          [
            { id: 'bosh_sahifa', label: 'Bosh sahifa', icon: Home },
            { id: 'dorilarim', label: 'Dorilarim', icon: Pill },
            { id: 'kunlik_holat', label: 'Kunlik holat', icon: HeartPulse },
            { id: 'xabarlar', label: 'Xabarlar', icon: Bell },
          ] as const
        ).map((nav) => {
          const Icon = nav.icon;
          const active = activeSection === nav.id;
          return (
            <button
              key={nav.id}
              type="button"
              onClick={() => {
                setCheckInSuccess(false);
                onSelectSection(nav.id);
              }}
              className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'bg-blue-50 text-[#1769E0]'
                  : 'text-[#64748B] hover:text-[#152238]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-full">{nav.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SECTION 1: BOSH SAHIFA (Patient Home) */}
      {activeSection === 'bosh_sahifa' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-[#10243A] text-white rounded-2xl p-5 sm:p-6 space-y-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Assalomu alaykum, {actor.fullName}!
            </h1>
            <p className="text-base text-slate-200">
              {activeRecoveryPlan?.instructions ||
                careCase?.dischargeInstructions ||
                'Shifokor belgilagan dori va kunlik holat rejasi.'}
            </p>
          </div>

          {/* Active Doctor-Configured Recovery Plan Card */}
          <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#12B8A6]">
                  DAVOLANISHDAN KEYINGI NAZORAT REJASI
                </span>
                <h2 className="font-display text-lg font-bold text-[#152238]">
                  {activeRecoveryPlan
                    ? `${activeRecoveryPlan.title} (${activeRecoveryPlan.durationDays} kun)`
                    : `${patient.careCaseType} bo‘yicha kunlik nazorat rejasi`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCheckInSuccess(false);
                  onSelectSection('kunlik_holat');
                }}
                className="min-h-[42px] px-4 py-2 bg-[#12B8A6] hover:bg-teal-600 text-white text-sm font-bold rounded-xl"
              >
                Kunlik holatni topshirish →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {planQuestions.slice(0, 4).map((q, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#152238]"
                >
                  {idx + 1}. {q}
                </span>
              ))}
            </div>
          </div>

          {/* Mobile Priority #1 (<768px): Today's Medication Schedule with Large "Ichdim" Buttons */}
          <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#152238]">
                Bugungi dori jadvali
              </h2>
              <button
                type="button"
                onClick={() => onSelectSection('dorilarim')}
                className="text-sm font-bold text-[#1769E0]"
              >
                Barchasi ({patientMeds.length})
              </button>
            </div>
            <div className="space-y-3">
              {patientMeds.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-mono font-bold text-[#1769E0]">
                        Soat {ev.scheduledTimeLabel}
                      </div>
                      <div className="font-display text-lg font-bold text-[#152238]">
                        {ev.medicationName}
                      </div>
                    </div>
                    <StatusBadge status={ev.reportedStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onRespondMedication(ev.id, 'Ichdim')}
                      className={`min-h-[48px] px-4 py-2.5 text-base font-bold rounded-xl ${
                        ev.reportedStatus === 'Ichdim'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#16A34A] text-white opacity-95'
                      }`}
                    >
                      ✓ Ichdim
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondMedication(ev.id, 'Keyinroq')}
                      className="min-h-[48px] px-3 py-2.5 text-base font-semibold bg-white border border-slate-300 text-[#152238] rounded-xl"
                    >
                      Keyinroq
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Next Medication Reminder (Desktop view & quick jump) */}
            <div className="hidden md:flex bg-white border border-slate-200 rounded-2xl p-5 flex-col justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase text-[#1769E0]">
                  Navbatdagi dori eslatmasi
                </div>
                {nextMed ? (
                  <>
                    <div className="font-display text-xl font-bold text-[#152238] mt-1">
                      {nextMed.medicationName}
                    </div>
                    <div className="text-base font-mono text-[#64748B] mt-1">
                      Vaqt: Soat {nextMed.scheduledTimeLabel} · Holat:{' '}
                      {nextMed.reportedStatus}
                    </div>
                  </>
                ) : (
                  <div className="text-base text-[#64748B] mt-1">
                    Bugungi barcha dorilar tasdiqlangan
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectSection('dorilarim')}
                className="w-full min-h-[48px] px-5 py-3 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl"
              >
                Dorilarimni ko‘rish va tasdiqlash
              </button>
            </div>

            {/* Today's Check-In Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase text-[#12B8A6]">
                  Bugungi salomatlik holati
                </div>
                <div className="font-display text-xl font-bold text-[#152238] mt-1">
                  {todayCheckIn
                    ? `Topshirilgan (${todayCheckIn.overallFeeling})`
                    : 'Bugungi so‘rovnoma kutilmoqda'}
                </div>
                <div className="text-base text-[#64748B] mt-1">
                  4 ta oddiy savolga javob bering
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCheckInSuccess(false);
                  onSelectSection('kunlik_holat');
                }}
                className="w-full min-h-[48px] px-5 py-3 bg-[#12B8A6] hover:bg-teal-600 text-white text-base font-bold rounded-xl"
              >
                Kunlik holatni yuborish
              </button>
            </div>
          </div>

          {/* Next Doctor Appointment & Contact Care Team */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#64748B]">
                Navbatdagi shifokor uchrashuvi / ko‘rigi
              </div>
              <div className="font-display text-xl font-bold text-[#152238] mt-0.5">
                {formatUzDateTime(
                  careCase?.nextAppointmentAt || careCase?.followUpDeadlineAt
                )}
              </div>
              <div className="text-base text-[#64748B] mt-0.5">
                Savolingiz bo‘lsa, tibbiyot xodimi bilan bog‘lanish so‘rovini yuboring.
              </div>
            </div>
            <button
              type="button"
              onClick={onTriggerCareTeamContact}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 bg-slate-100 hover:bg-slate-200 text-[#152238] text-base font-bold rounded-xl flex items-center justify-center gap-2 shrink-0"
            >
              <Phone className="w-5 h-5 text-[#1769E0]" />
              <span>Shifokor bilan bog‘lanish</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: DORILARIM (Section 8 — "Bugungi dorilarim" with large buttons) */}
      {activeSection === 'dorilarim' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#152238]">
              Bugungi dorilarim
            </h2>
            <p className="text-base text-[#64748B] mt-1">
              Har bir dori qabul qilingandan so‘ng &ldquo;Ichdim&rdquo; tugmasini bosing.
            </p>
          </div>

          <div className="space-y-4">
            {patientMeds.map((ev) => {
              const plan = medicationPlans.find((p) => p.id === ev.medicationPlanId);
              return (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-[#F7FAFC] space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-mono font-bold text-[#1769E0]">
                        Qabul vaqti: Soat {ev.scheduledTimeLabel}
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#152238] mt-0.5">
                        {ev.medicationName}
                      </h3>
                      <p className="text-base text-[#64748B] mt-1">
                        Ko‘rsatma:{' '}
                        {plan?.dosageInstructions || 'Shifokor ko‘rsatmasiga binoan'}
                      </p>
                    </div>
                    <StatusBadge status={ev.reportedStatus} />
                  </div>

                  {/* Large Touch-Friendly Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => onRespondMedication(ev.id, 'Ichdim')}
                      className={`min-h-[50px] px-4 py-3 text-lg font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'Ichdim'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-white border-2 border-slate-300 text-[#152238] hover:border-[#16A34A]'
                      }`}
                    >
                      Ichdim
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondMedication(ev.id, 'Keyinroq')}
                      className={`min-h-[50px] px-4 py-3 text-lg font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'Keyinroq'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-white border-2 border-slate-300 text-[#152238] hover:border-[#F59E0B]'
                      }`}
                    >
                      Keyinroq
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondMedication(ev.id, 'O‘tkazib yubordim')}
                      className={`min-h-[50px] px-4 py-3 text-lg font-bold rounded-xl transition-colors ${
                        ev.reportedStatus === 'O‘tkazib yubordim'
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-white border-2 border-slate-300 text-[#152238] hover:border-[#DC2626]'
                      }`}
                    >
                      O‘tkazib yubordim
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: KUNLIK HOLAT (Section 9 — 1 Question per step for older patients) */}
      {activeSection === 'kunlik_holat' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          {checkInSuccess ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-[#16A34A] mx-auto" />
              <h2 className="font-display text-2xl font-bold text-[#152238]">
                Javoblaringiz muvaffaqiyatli yuborildi!
              </h2>
              <p className="text-base text-[#64748B] max-w-md mx-auto">
                Ma&apos;lumotlaringiz shifokoringizga yetkazildi. Agar shifokor aloqasini
                so‘ragan bo‘lsangiz, tibbiyot xodimi siz bilan bog‘lanadi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCheckInSuccess(false);
                  setStep(1);
                  onSelectSection('bosh_sahifa');
                }}
                className="min-h-[48px] px-6 py-3 bg-[#1769E0] text-white text-base font-bold rounded-xl"
              >
                Bosh sahifaga qaytish
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-sm font-bold text-[#1769E0]">
                    SAVOL {step} / 4
                  </span>
                  <h2 className="font-display text-2xl font-bold text-[#152238]">
                    Kunlik salomatlik so‘rovnomasi
                  </h2>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((s) => (
                    <span
                      key={s}
                      className={`w-8 h-2.5 rounded-full ${
                        step >= s ? 'bg-[#1769E0]' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Question 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold text-[#152238]">
                    1. {planQuestions[0]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['Yaxshi', 'O‘rtacha', 'Yomon'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setQ1Feeling(opt);
                          setStep(2);
                        }}
                        className={`min-h-[60px] p-4 text-lg font-bold rounded-xl border-2 transition-colors ${
                          q1Feeling === opt
                            ? 'bg-[#1769E0] text-white border-[#1769E0]'
                            : 'bg-[#F7FAFC] text-[#152238] border-slate-300 hover:border-[#1769E0]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold text-[#152238]">
                    2. {planQuestions[1]}
                  </h3>
                  <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQ2Pain(num)}
                        className={`min-h-[52px] rounded-xl font-mono text-lg font-bold border-2 ${
                          q2Pain === num
                            ? 'bg-[#1769E0] text-white border-[#1769E0]'
                            : 'bg-[#F7FAFC] text-[#152238] border-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-[48px] px-5 py-2.5 text-base font-semibold text-[#64748B]"
                    >
                      Orqaga
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="min-h-[48px] px-6 py-2.5 bg-[#1769E0] text-white text-base font-bold rounded-xl"
                    >
                      Keyingi savol
                    </button>
                  </div>
                </div>
              )}

              {/* Question 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold text-[#152238]">
                    3. {planQuestions[2]}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQ3HasComplaint(true)}
                      className={`min-h-[56px] text-lg font-bold rounded-xl border-2 ${
                        q3HasComplaint
                          ? 'bg-[#1769E0] text-white border-[#1769E0]'
                          : 'bg-[#F7FAFC] text-[#152238] border-slate-300'
                      }`}
                    >
                      Ha
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQ3HasComplaint(false);
                        setStep(4);
                      }}
                      className={`min-h-[56px] text-lg font-bold rounded-xl border-2 ${
                        !q3HasComplaint
                          ? 'bg-[#1769E0] text-white border-[#1769E0]'
                          : 'bg-[#F7FAFC] text-[#152238] border-slate-300'
                      }`}
                    >
                      Yo‘q
                    </button>
                  </div>

                  {q3HasComplaint && (
                    <div>
                      <label className="block text-base font-semibold text-[#152238] mb-1">
                        Shikoyatingizni qisqacha yozing:
                      </label>
                      <textarea
                        rows={3}
                        value={q3ComplaintText}
                        onChange={(e) => setQ3ComplaintText(e.target.value)}
                        placeholder="Masalan: Bosh og‘rig‘i yoki harorat ko‘tarilishi..."
                        className="w-full p-3.5 text-base bg-[#F7FAFC] border border-slate-300 rounded-xl"
                      />
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="min-h-[48px] px-5 py-2.5 text-base font-semibold text-[#64748B]"
                    >
                      Orqaga
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="min-h-[48px] px-6 py-2.5 bg-[#1769E0] text-white text-base font-bold rounded-xl"
                    >
                      Keyingi savol
                    </button>
                  </div>
                </div>
              )}

              {/* Question 4 */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold text-[#152238]">
                    4. {planQuestions[3] || 'Shifokor bilan bog‘lanishni xohlaysizmi?'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQ4WantDoctor(true)}
                      className={`min-h-[56px] text-lg font-bold rounded-xl border-2 ${
                        q4WantDoctor
                          ? 'bg-[#1769E0] text-white border-[#1769E0]'
                          : 'bg-[#F7FAFC] text-[#152238] border-slate-300'
                      }`}
                    >
                      Ha
                    </button>
                    <button
                      type="button"
                      onClick={() => setQ4WantDoctor(false)}
                      className={`min-h-[56px] text-lg font-bold rounded-xl border-2 ${
                        !q4WantDoctor
                          ? 'bg-[#1769E0] text-white border-[#1769E0]'
                          : 'bg-[#F7FAFC] text-[#152238] border-slate-300'
                      }`}
                    >
                      Yo‘q
                    </button>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="min-h-[48px] px-5 py-2.5 text-base font-semibold text-[#64748B]"
                    >
                      Orqaga
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleWizardSubmit}
                      className="min-h-[52px] px-8 py-3 bg-[#16A34A] hover:bg-emerald-700 text-white text-lg font-bold rounded-xl"
                    >
                      {submitting ? 'Yuborilmoqda...' : 'Javoblarni yuborish'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SECTION 4: XABARLAR (Doctor-Controlled Patient Chat + AI Assistant & SMS History) */}
      {activeSection === 'xabarlar' && (
        <div className="space-y-5">
          {/* Doctor-Patient Real-Time Chat Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* Chat Header & Assigned Doctor Switcher */}
            <div className="p-4 sm:p-5 bg-[#F7FAFC] border-b border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#1769E0] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
                    {activeDoctor?.fullName
                      ?.replace('Dr. ', '')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2) || 'SH'}
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#152238]">
                      {activeDoctor?.fullName || 'Biriktirilgan shifokor'}
                    </h2>
                    <div className="text-sm text-[#64748B]">
                      {activeDoctor?.specialty || 'Davolovchi shifokor'}
                    </div>
                  </div>
                </div>

                {/* Permission Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    activeConversation?.patientCanSend
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-[#64748B] border-slate-200'
                  }`}
                >
                  {activeConversation?.patientCanSend ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Bemor yoza oladi</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Faqat shifokor yoza oladi</span>
                    </>
                  )}
                </span>
              </div>

              {/* Switch between Treating Doctor and Family Doctor if patient has multiple assigned doctors */}
              {assignedDoctors.length > 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {assignedDoctors.map((doc) => {
                    const isSelected = doc.id === activeDoctor?.id;
                    const docConv = conversations.find(
                      (c) => c.patientId === patient.id && c.doctorId === doc.id
                    );
                    const unreadCount = docConv
                      ? messages.filter(
                          (m) =>
                            m.conversationId === docConv.id &&
                            m.senderRole !== 'PATIENT' &&
                            m.senderRole !== 'CAREGIVER' &&
                            !m.readAt
                        ).length
                      : 0;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'bg-[#1769E0] text-white'
                            : 'bg-white border border-slate-300 text-[#152238] hover:bg-slate-50'
                        }`}
                      >
                        <Stethoscope className="w-4 h-4 shrink-0" />
                        <span>{doc.fullName}</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-mono">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Healthcare Non-Emergency Notice */}
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bu chat shoshilinch tibbiy yordam uchun mo‘ljallanmagan.</span>
              </div>
            </div>

            {/* Message Thread */}
            <div className="p-4 sm:p-5 space-y-3.5 max-h-[380px] overflow-y-auto bg-[#F8FAFC]">
              {activeChatMessages.length === 0 ? (
                <div className="py-10 text-center text-base text-[#64748B]">
                  Hozircha shifokordan xabarlar yo‘q.
                </div>
              ) : (
                activeChatMessages.map((msg) => {
                  const isFromPatient =
                    msg.senderRole === 'PATIENT' || msg.senderRole === 'CAREGIVER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isFromPatient ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-1.5 shadow-2xs ${
                          isFromPatient
                            ? 'bg-[#1769E0] text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-[#152238] rounded-bl-xs'
                        }`}
                      >
                        <div
                          className={`text-xs font-bold ${
                            isFromPatient ? 'text-blue-100' : 'text-[#1769E0]'
                          }`}
                        >
                          {msg.senderName}
                        </div>
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div
                          className={`text-[11px] font-mono flex items-center justify-end gap-1.5 ${
                            isFromPatient ? 'text-blue-100' : 'text-[#64748B]'
                          }`}
                        >
                          <span>{formatUzDateTime(msg.createdAt)}</span>
                          {isFromPatient && (
                            <span>· {msg.readAt ? 'O‘qildi' : 'Yuborildi'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={patientChatBottomRef} />
            </div>

            {/* Bottom Input OR Permission Restricted Notice */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200">
              {activeConversation?.patientCanSend === true ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePatientSendChat();
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                >
                  <textarea
                    rows={2}
                    value={patientChatInput}
                    onChange={(e) => setPatientChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handlePatientSendChat();
                      }
                    }}
                    placeholder="Shifokorga xabar yozing... (Yuborish uchun Enter)"
                    className="flex-1 p-3.5 text-base bg-[#F7FAFC] border border-slate-300 rounded-xl focus:outline-none focus:border-[#1769E0]"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !patientChatInput.trim()}
                    className="min-h-[50px] px-6 py-3 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingChat ? 'Yuborilmoqda...' : 'Yuborish'}</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-base font-semibold text-[#152238]">
                    <Lock className="w-5 h-5 text-[#64748B] shrink-0" />
                    <span>
                      Shifokoringiz hozircha xabar yozishga ruxsat bermagan.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onTriggerCareTeamContact}
                    className="min-h-[44px] px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-[#152238] text-sm font-bold rounded-xl shrink-0"
                  >
                    Aloqa so‘rovini yuborish
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Card: AI Virtual Assistant & Automated SMS Reminders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#152238]">
                Carely AI yordamchi va avtomatik SMS eslatmalar ({patientNotifs.length})
              </h3>
              <p className="text-sm text-[#64748B] mt-0.5">
                Avtomatik dori eslatmalari va ovozli yordamchi tarixi shifokor chatidan alohida saqlanadi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPatientAiCall(patient.id)}
              className="min-h-[46px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#152238] text-sm font-bold rounded-xl flex items-center gap-2 shrink-0"
            >
              <PhoneCall className="w-4 h-4 text-[#1769E0]" />
              <span>AI muloqotni ochish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. XABARLAR — SIMPLE REAL-TIME DOCTOR-PATIENT CHAT + SEPARATE AI NOTIFICATIONS
//    Strictly 2 Tabs:
//      Tab 1: "Bemorlar bilan chat" (Direct doctor-patient conversations + permission toggle)
//      Tab 2: "AI xabarlari" (AI call summaries, automated SMS reminders, check-in alerts)
// ============================================================================
interface NotificationSimulationCenterProps {
  actor?: UserAccount;
  doctors?: DoctorProfile[];
  patients: Patient[];
  conversations?: ChatConversation[];
  messages?: ChatMessage[];
  notifications: NotificationItem[];
  dailyCheckIns: DailyCheckIn[];
  aiConversations: AIConversation[];
  initialChatPatientId?: string | null;
  onOpenPatient: (patientId: string) => void;
  onTriggerSms: (
    patientId: string,
    notificationType: string,
    customMessage?: string,
    channel?: string
  ) => Promise<void>;
  onSendChatMessage?: (params: {
    conversationId?: string;
    patientId: string;
    doctorId: string;
    content: string;
  }) => Promise<void>;
  onToggleChatPermission?: (params: {
    conversationId?: string;
    patientId: string;
    doctorId: string;
    patientCanSend: boolean;
  }) => Promise<void>;
  onMarkChatRead?: (conversationId: string) => Promise<void>;
}

export const NotificationSimulationCenter: React.FC<
  NotificationSimulationCenterProps
> = ({
  actor,
  patients,
  conversations = [],
  messages = [],
  notifications,
  dailyCheckIns,
  aiConversations,
  initialChatPatientId,
  onOpenPatient,
  onTriggerSms,
  onSendChatMessage,
  onToggleChatPermission,
  onMarkChatRead,
}) => {
  // Strictly 2 tabs: 'bemorlar_chat' ("Bemorlar bilan chat") | 'ai_xabarlari' ("AI xabarlari")
  const [activeTab, setActiveTab] = useState<'bemorlar_chat' | 'ai_xabarlari'>(
    'bemorlar_chat'
  );
  const [chatSearch, setChatSearch] = useState<string>('');
  const [selectedChatPatientId, setSelectedChatPatientId] = useState<string>(
    initialChatPatientId || patients[0]?.id || 'pat-01'
  );
  const [mobileChatView, setMobileChatView] = useState<'list' | 'thread'>(
    initialChatPatientId ? 'thread' : 'list'
  );
  const [doctorMessageText, setDoctorMessageText] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [togglingPermission, setTogglingPermission] = useState<boolean>(false);
  const chatThreadEndRef = useRef<HTMLDivElement | null>(null);

  // SMS simulation state inside AI xabarlari tab
  const [smsPatientId, setSmsPatientId] = useState(patients[0]?.id || 'pat-01');
  const [notifType, setNotifType] = useState('Dori eslatmasi');
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    if (initialChatPatientId) {
      setSelectedChatPatientId(initialChatPatientId);
      setActiveTab('bemorlar_chat');
      setMobileChatView('thread');
    }
  }, [initialChatPatientId]);

  const currentDoctorId = actor?.linkedDoctorId || 'doc-1';

  const resolvePatientConversation = (pat: Patient): ChatConversation | undefined => {
    return (
      conversations.find(
        (c) => c.patientId === pat.id && c.doctorId === currentDoctorId
      ) || conversations.find((c) => c.patientId === pat.id)
    );
  };

  const activePatient =
    patients.find((p) => p.id === selectedChatPatientId) || patients[0];
  const activeConv = activePatient
    ? resolvePatientConversation(activePatient)
    : undefined;
  const activeMessages = activeConv
    ? messages
        .filter((m) => m.conversationId === activeConv.id)
        .sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
    : [];

  useEffect(() => {
    if (activeTab === 'bemorlar_chat' && activeConv && onMarkChatRead) {
      const hasUnreadFromPatient = activeMessages.some(
        (m) =>
          (m.senderRole === 'PATIENT' || m.senderRole === 'CAREGIVER') &&
          !m.readAt
      );
      if (hasUnreadFromPatient) {
        onMarkChatRead(activeConv.id);
      }
    }
  }, [activeTab, activeConv, activeMessages.length, onMarkChatRead]);

  useEffect(() => {
    if (activeTab === 'bemorlar_chat') {
      chatThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedChatPatientId, activeMessages.length]);

  const filteredChatPatients = patients.filter((p) => {
    const q = chatSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.careCaseType.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
    );
  });

  const handleDoctorSend = async () => {
    const trimmed = doctorMessageText.trim();
    if (!trimmed || !activePatient || !onSendChatMessage) return;
    setSendingMessage(true);
    try {
      await onSendChatMessage({
        conversationId: activeConv?.id,
        patientId: activePatient.id,
        doctorId: activeConv?.doctorId || currentDoctorId,
        content: trimmed,
      });
      setDoctorMessageText('');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTogglePermission = async () => {
    if (!activePatient || !onToggleChatPermission) return;
    const nextAllowed = !(activeConv?.patientCanSend === true);
    setTogglingPermission(true);
    try {
      await onToggleChatPermission({
        conversationId: activeConv?.id,
        patientId: activePatient.id,
        doctorId: activeConv?.doctorId || currentDoctorId,
        patientCanSend: nextAllowed,
      });
    } finally {
      setTogglingPermission(false);
    }
  };

  const actionRequiredCheckIns = dailyCheckIns.filter(
    (c) =>
      c.requestedDoctorContact ||
      c.painScore >= 7 ||
      c.reviewStatus === 'Shifokor ko‘rishi kerak'
  );

  const totalUnreadPatientMessages = messages.filter(
    (m) =>
      (m.senderRole === 'PATIENT' || m.senderRole === 'CAREGIVER') && !m.readAt
  ).length;

  const aiEventsCount =
    actionRequiredCheckIns.length + aiConversations.length + notifications.length;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Xabarlar"
        subtitle="Bemorlar bilan bevosita muloqot va alohida AI / SMS xabarnomalar"
      />

      {/* Strictly 2 Primary Tabs inside Xabarlar */}
      <FilterTabs
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as 'bemorlar_chat' | 'ai_xabarlari')}
        options={[
          {
            id: 'bemorlar_chat',
            label: 'Bemorlar bilan chat',
            count:
              totalUnreadPatientMessages > 0
                ? totalUnreadPatientMessages
                : patients.length,
          },
          {
            id: 'ai_xabarlari',
            label: 'AI xabarlari',
            count: aiEventsCount,
          },
        ]}
      />

      {/* TAB 1: BEMORLAR BILAN CHAT (Direct Doctor-Patient Conversations + Permission Control) */}
      {activeTab === 'bemorlar_chat' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[600px] shadow-xs">
          {/* LEFT PANE: Searchable Patient List */}
          <div
            className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col ${
              mobileChatView === 'thread' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3.5 border-b border-slate-200 bg-[#F7FAFC]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Bemor ismini qidiring..."
                  className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#1769E0]"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[540px]">
              {filteredChatPatients.map((pat) => {
                const patConv = resolvePatientConversation(pat);
                const patMsgs = patConv
                  ? messages
                      .filter((m) => m.conversationId === patConv.id)
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() -
                          new Date(b.createdAt).getTime()
                      )
                  : [];
                const lastMsg = patMsgs[patMsgs.length - 1];
                const unreadCount = patMsgs.filter(
                  (m) =>
                    (m.senderRole === 'PATIENT' || m.senderRole === 'CAREGIVER') &&
                    !m.readAt
                ).length;
                const isSelected = activePatient?.id === pat.id;
                const canSend = patConv?.patientCanSend === true;
                const initials = pat.fullName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => {
                      setSelectedChatPatientId(pat.id);
                      setMobileChatView('thread');
                    }}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-[#1769E0]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#10243A] text-white font-display font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-base text-[#152238] truncate">
                          {pat.fullName}
                        </span>
                        {lastMsg && (
                          <span className="text-xs font-mono text-[#64748B] shrink-0">
                            {formatShortTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-[#64748B] truncate">
                        {lastMsg
                          ? lastMsg.content
                          : 'Suhbatni boshlash uchun bosing'}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            canSend
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-[#64748B]'
                          }`}
                        >
                          {canSend ? 'Bemor yoza oladi' : 'Faqat shifokor yoza oladi'}
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#1769E0] text-white text-xs font-bold">
                            {unreadCount} yangi
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Active Patient Conversation Window & Permission Control */}
          <div
            className={`md:col-span-7 lg:col-span-8 flex flex-col justify-between bg-[#F8FAFC] ${
              mobileChatView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activePatient ? (
              <>
                {/* Conversation Header + Permission Toggle */}
                <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setMobileChatView('list')}
                        className="md:hidden min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 text-sm font-bold text-[#152238] flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Ro‘yxat</span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg sm:text-xl font-bold text-[#152238] truncate">
                            {activePatient.fullName} ({activePatient.age} yosh)
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                              activeConv?.patientCanSend
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-[#64748B] border-slate-200'
                            }`}
                          >
                            {activeConv?.patientCanSend ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Bemor yoza oladi</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Faqat shifokor yoza oladi</span>
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#64748B] truncate">
                          {activePatient.careCaseType}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPatient(activePatient.id)}
                      className="min-h-[40px] px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#152238] text-sm font-bold rounded-xl shrink-0"
                    >
                      Bemorni ko‘rish
                    </button>
                  </div>

                  {/* Doctor-Controlled Chat Permission Toggle Bar */}
                  <div className="p-3 rounded-xl bg-[#F7FAFC] border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {activeConv?.patientCanSend ? (
                        <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-5 h-5 text-[#64748B] shrink-0" />
                      )}
                      <div>
                        <div className="text-sm sm:text-base font-bold text-[#152238]">
                          Bemorga yozishga ruxsat berish
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {activeConv?.patientCanSend
                            ? 'Hozir bemor ushbu chatda sizga javob yoza oladi'
                            : 'Hozir bemor faqat siz yuborgan xabarlarni o‘qiy oladi'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={activeConv?.patientCanSend === true}
                      disabled={togglingPermission}
                      onClick={handleTogglePermission}
                      className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeConv?.patientCanSend
                          ? 'bg-[#16A34A] text-white hover:bg-emerald-700'
                          : 'bg-slate-200 text-[#152238] hover:bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full ${
                          activeConv?.patientCanSend ? 'bg-white' : 'bg-slate-500'
                        }`}
                      />
                      <span>
                        {activeConv?.patientCanSend ? 'ON (Ruxsat berilgan)' : 'OFF (Yopiq)'}
                      </span>
                    </button>
                  </div>

                  {/* Non-Emergency Healthcare Notice */}
                  <div className="px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Bu chat shoshilinch tibbiy yordam uchun mo‘ljallanmagan.</span>
                  </div>
                </div>

                {/* Scrollable Message Bubbles */}
                <div className="flex-1 p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[370px]">
                  {activeMessages.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="font-display font-bold text-base text-[#152238]">
                        {activePatient.fullName} bilan hali yozishmalar yo‘q
                      </div>
                      <p className="text-sm text-[#64748B] max-w-sm mx-auto">
                        Quyidagi maydonga tavsiya yoki ko‘rsatma yozib &ldquo;Yuborish&rdquo; tugmasini bosing.
                      </p>
                    </div>
                  ) : (
                    activeMessages.map((msg) => {
                      const isFromDoctor =
                        msg.senderRole !== 'PATIENT' &&
                        msg.senderRole !== 'CAREGIVER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isFromDoctor ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-1 shadow-2xs ${
                              isFromDoctor
                                ? 'bg-[#1769E0] text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-[#152238] rounded-bl-xs'
                            }`}
                          >
                            <div
                              className={`text-xs font-bold ${
                                isFromDoctor ? 'text-blue-100' : 'text-[#1769E0]'
                              }`}
                            >
                              {msg.senderName}
                            </div>
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                            <div
                              className={`text-[11px] font-mono flex items-center justify-end gap-1.5 ${
                                isFromDoctor ? 'text-blue-100' : 'text-[#64748B]'
                              }`}
                            >
                              <span>{formatUzDateTime(msg.createdAt)}</span>
                              {isFromDoctor && (
                                <span>· {msg.readAt ? 'O‘qildi' : 'Yetkazildi'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatThreadEndRef} />
                </div>

                {/* Doctor Message Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleDoctorSend();
                  }}
                  className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                >
                  <textarea
                    rows={2}
                    value={doctorMessageText}
                    onChange={(e) => setDoctorMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleDoctorSend();
                      }
                    }}
                    placeholder={`${activePatient.fullName} ga xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)`}
                    className="flex-1 p-3.5 text-base bg-[#F7FAFC] border border-slate-300 rounded-xl focus:outline-none focus:border-[#1769E0]"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !doctorMessageText.trim()}
                    className="min-h-[50px] px-6 py-3 bg-[#1769E0] hover:bg-blue-700 disabled:opacity-50 text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingMessage ? 'Yuborilmoqda...' : 'Yuborish'}</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="p-10 text-center text-base text-[#64748B]">
                Chap tomondagi ro‘yxatdan bemorni tanlang.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI XABARLARI (AI Summaries, Automated SMS Reminders, Check-In Alerts) */}
      {activeTab === 'ai_xabarlari' && (
        <div className="space-y-5">
          {/* Patient Requests for Clinician Contact / High-Pain Check-In Alerts */}
          {actionRequiredCheckIns.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-bold text-[#152238]">
                Bemor so‘rovlari va shoshilinch kunlik holat xabarlari ({actionRequiredCheckIns.length})
              </h3>
              {actionRequiredCheckIns.map((chk) => {
                const pat = patients.find((p) => p.id === chk.patientId);
                return (
                  <div
                    key={chk.id}
                    className="bg-white border border-red-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                          Bemor so‘rovi
                        </span>
                        <StatusBadge status="Shifokor ko‘rishi kerak" />
                        <span className="text-xs font-mono text-[#64748B]">
                          {formatUzDateTime(chk.submittedAt)}
                        </span>
                      </div>
                      <h4 className="font-display text-lg font-bold text-[#152238]">
                        {pat?.fullName || chk.patientId} — Og‘riq: {chk.painScore}/10
                      </h4>
                      <p className="text-base text-[#152238]">{chk.reportedSymptoms}</p>
                    </div>
                    {pat && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatPatientId(pat.id);
                            setActiveTab('bemorlar_chat');
                            setMobileChatView('thread');
                          }}
                          className="min-h-[42px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
                        >
                          Chatda yozish
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPatient(pat.id)}
                          className="min-h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#152238] text-sm font-bold rounded-xl"
                        >
                          Bemorni ko‘rish
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Phone Call Summaries */}
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold text-[#152238]">
              AI ovozli muloqot xulosalari ({aiConversations.length})
            </h3>
            {aiConversations.map((conv) => {
              const pat = patients.find((p) => p.id === conv.patientId);
              return (
                <div
                  key={conv.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-[#1769E0] border border-blue-200">
                        AI tizimi
                      </span>
                      <span className="font-semibold text-[#152238]">
                        {conv.conversationType}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#64748B]">
                        {formatUzDateTime(conv.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-display text-lg font-bold text-[#152238]">
                      {pat?.fullName || conv.patientId}
                    </h4>
                    <p className="text-base text-[#152238]">
                      {conv.structuredSummary.summaryUz}
                    </p>
                  </div>
                  {pat && (
                    <button
                      type="button"
                      onClick={() => onOpenPatient(pat.id)}
                      className="min-h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#152238] text-sm font-bold rounded-xl shrink-0"
                    >
                      Bemorni ko‘rish
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Automated SMS Reminder Sender & Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-[#152238]">
                Avtomatik SMS eslatmalar tarixi ({notifications.length})
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-[#64748B]">
                SMS xizmati
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSendingSms(true);
                try {
                  await onTriggerSms(smsPatientId, notifType);
                } finally {
                  setSendingSms(false);
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F7FAFC] border border-slate-200"
            >
              <select
                value={smsPatientId}
                onChange={(e) => setSmsPatientId(e.target.value)}
                className="min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              >
                <option value="Dori eslatmasi">Dori eslatmasi</option>
                <option value="Uchrashuv eslatmasi">Uchrashuv eslatmasi</option>
                <option value="Kunlik holat so‘rovi">Kunlik holat so‘rovi</option>
              </select>
              <button
                type="submit"
                disabled={sendingSms}
                className="min-h-[42px] px-4 py-2 bg-[#1769E0] hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
              >
                {sendingSms ? 'Yuborilmoqda...' : 'SMS eslatma yuborish'}
              </button>
            </form>

            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-[#F7FAFC] border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#1769E0]">
                      {n.channel} · {n.notificationType}
                    </div>
                    <p className="text-sm text-[#152238]">{n.message}</p>
                  </div>
                  <div className="text-xs font-mono text-[#64748B]">
                    {formatUzDateTime(n.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. CLINIC ADMIN INTERFACE & SPECIALTY TEMPLATES (Section 11 & 21)
// ============================================================================
interface ClinicAndTemplatesViewProps {
  activeSubPage?: 'dashboard' | 'doctors' | 'templates' | 'settings';
  organizations: Organization[];
  users: UserAccount[];
  doctors: DoctorProfile[];
  patients: Patient[];
  followUpTasks: FollowUpTask[];
  templates: SpecialtyTemplate[];
  onInviteStaff: (payload: any) => Promise<void>;
  onToggleStaffStatus: (userId: string, nextStatus: string) => Promise<void>;
  onCreateTemplate: (payload: any) => Promise<void>;
  onChangePlan: (orgId: string, plan: SubscriptionPlanId) => Promise<void>;
}

export const ClinicAndTemplatesView: React.FC<ClinicAndTemplatesViewProps> = ({
  activeSubPage = 'doctors',
  organizations,
  users,
  doctors,
  patients,
  followUpTasks,
  templates,
  onInviteStaff,
  onToggleStaffStatus,
  onCreateTemplate,
  onChangePlan,
}) => {
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'TREATING_DOCTOR' | 'FAMILY_DOCTOR' | 'NURSE'>(
    'TREATING_DOCTOR'
  );
  const [staffSpecialty, setStaffSpecialty] = useState('Kardiolog');
  const [staffDept, setStaffDept] = useState('Kardiologiya');
  const [staffOrgId, setStaffOrgId] = useState(organizations[0]?.id || 'org-hosp-1');

  const currentOrg = organizations[0];

  if (activeSubPage === 'settings') {
    return (
      <SubscriptionBillingView
        organization={currentOrg}
        onChangePlan={onChangePlan}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Shifokorlar va Klinika Boshqaruvi"
        subtitle="Tibbiyot xodimlari, ish jadvallari va ixtisoslashgan kuzatuv shablonlari"
        action={
          <button
            type="button"
            onClick={() => setShowAddDocModal(!showAddDocModal)}
            className="min-h-[46px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-bold rounded-xl flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>+ Shifokor qo‘shish</span>
          </button>
        }
      />

      {showAddDocModal && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!staffName.trim() || !staffEmail.trim()) return;
            await onInviteStaff({
              fullName: staffName,
              email: staffEmail,
              role: staffRole,
              organizationId: staffOrgId,
              specialty: staffSpecialty,
              department: staffDept,
            });
            setStaffName('');
            setStaffEmail('');
            setShowAddDocModal(false);
          }}
          className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-base"
        >
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Shifokor F.I.Sh
            </label>
            <input
              type="text"
              required
              placeholder="Dr. Kamola Rahimova"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-[#F7FAFC] border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Ishchi Email
            </label>
            <input
              type="email"
              required
              placeholder="k.rahimova@hospital-demo.carebridge.uz"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-[#F7FAFC] border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Mutaxassisligi
            </label>
            <input
              type="text"
              value={staffSpecialty}
              onChange={(e) => setStaffSpecialty(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-[#F7FAFC] border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">Bo‘lim</label>
            <input
              type="text"
              value={staffDept}
              onChange={(e) => setStaffDept(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-[#F7FAFC] border border-slate-300 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddDocModal(false)}
              className="min-h-[44px] px-4 py-2 font-semibold text-[#64748B]"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 bg-[#1769E0] text-white font-semibold rounded-xl"
            >
              Saqlash
            </button>
          </div>
        </form>
      )}

      {/* Simplified Doctor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doctors.map((doc) => {
          const assignedCount = patients.filter(
            (p) => p.treatingDoctorId === doc.id || p.familyDoctorId === doc.id
          ).length;
          const linkedUser = users.find((u) => u.linkedDoctorId === doc.id);
          return (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#152238]">
                    {doc.fullName}
                  </h3>
                  <div className="text-base font-medium text-[#1769E0]">
                    {doc.specialty} · {doc.department}
                  </div>
                </div>
                <StatusBadge status={linkedUser?.status || doc.status} />
              </div>

              <div className="text-sm text-[#64748B] space-y-1">
                <div>Ish vaqti: {doc.workSchedule}</div>
                <div>
                  Biriktirilgan bemorlar:{' '}
                  <strong className="text-[#152238]">{assignedCount} nafar</strong>
                </div>
              </div>

              {linkedUser && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onToggleStaffStatus(
                        linkedUser.id,
                        linkedUser.status === 'Faol' ? 'Nofaol' : 'Faol'
                      )
                    }
                    className="min-h-[40px] px-3.5 py-1.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50"
                  >
                    {linkedUser.status === 'Faol'
                      ? 'Vaqtincha to‘xtatish'
                      : 'Faollashtirish'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 4. B2B SUBSCRIPTION & CLINIC SETTINGS (Section 21)
// ============================================================================
interface SubscriptionBillingViewProps {
  organization: Organization;
  onChangePlan: (orgId: string, plan: SubscriptionPlanId) => Promise<void>;
}

export const SubscriptionBillingView: React.FC<SubscriptionBillingViewProps> = ({
  organization,
  onChangePlan,
}) => {
  const plans: {
    id: SubscriptionPlanId;
    name: string;
    audience: string;
    price: string;
    limits: string;
    features: string[];
  }[] = [
    {
      id: 'STARTER',
      name: 'STARTER',
      audience: 'Kichik xususiy va stomatologiya klinikalari uchun',
      price: '499,000 UZS / oy',
      limits: '10 nafar xodimgacha · 200 ta faol kuzatuv',
      features: [
        'Kichik klinika boshqaruv paneli',
        'Bemor kuzatuvi va dori jadvali',
        'Bazaviy SMS eslatmalar',
      ],
    },
    {
      id: 'PRO',
      name: 'PRO',
      audience: 'Ko‘p tarmoqli poliklinikalar va tibbiyot markazlari uchun',
      price: '1,499,000 UZS / oy',
      limits: '50 nafar xodimgacha · 1,500 ta faol kuzatuv',
      features: [
        'Kunlik bemor check-in va og‘riq dinamikasi',
        'Gemini AI shifokor hisobotlari loyihasi',
        'AI ovozli virtual yordamchi paketi',
      ],
    },
    {
      id: 'ENTERPRISE',
      name: 'ENTERPRISE',
      audience: 'Yirik shifoxonalar va hududiy tibbiyot birlashmalari uchun',
      price: 'Individual shartnoma',
      limits: 'Cheklanmagan bo‘limlar va hududiy poliklinika integratsiyasi',
      features: [
        'Shifoxona va oilaviy poliklinika integratsiyasi (Challenge #11)',
        'Maxsus xavfsizlik va tashkilotlararo izolyatsiya',
        'Korporativ audit va SLA hisobotlari',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
            Demo tariflar — to‘lov tizimi hali ulanmagan.
          </span>
          <h1 className="font-display text-2xl font-bold text-[#152238] mt-2">
            Klinika Sozlamalari va Obuna Tariflari ({organization.name})
          </h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#64748B]">Joriy faol tarif:</div>
          <div className="font-display text-xl font-bold text-[#1769E0]">
            {organization.subscriptionPlan}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = organization.subscriptionPlan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-6 border flex flex-col justify-between ${
                isCurrent ? 'border-[#1769E0] ring-1 ring-[#1769E0]' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="text-sm font-mono font-bold text-[#1769E0]">{p.name}</div>
                <div className="font-display text-2xl font-bold text-[#152238] mt-1 tabular-nums">
                  {p.price}
                </div>
                <p className="text-sm text-[#64748B] mt-1">{p.audience}</p>
                <ul className="mt-4 space-y-2 text-base text-[#152238]">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#12B8A6] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => onChangePlan(organization.id, p.id)}
                className={`mt-6 w-full min-h-[46px] py-2.5 px-4 rounded-xl text-base font-bold ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-[#1769E0] hover:bg-blue-700 text-white'
                }`}
              >
                {isCurrent ? 'Joriy faol tarif' : `${p.name} rejasini tanlash`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
