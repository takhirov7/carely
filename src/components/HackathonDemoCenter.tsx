import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  FastForward,
  Lock,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { DatabaseSchema, Patient, UserAccount } from '../shared/types';
import { formatUzDateTime, getRoleLabelUz } from '../utils/formatters';

interface HackathonDemoCenterProps {
  demoMeta: DatabaseSchema['demoMeta'];
  effectiveNowIso: string;
  patients: Patient[];
  users: UserAccount[];
  onRunDemoAction: (actionType: string, minutesOffset?: number) => Promise<void>;
  onOpenPatient: (patientId: string) => void;
  onSwitchPersona: (userId: string) => void;
}

export const HackathonDemoCenter: React.FC<HackathonDemoCenterProps> = ({
  demoMeta,
  effectiveNowIso,
  patients,
  users,
  onRunDemoAction,
  onOpenPatient,
  onSwitchPersona,
}) => {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rbacResult, setRbacResult] = useState<{
    status: number;
    message: string;
    allowed: boolean;
  } | null>(null);

  const featuredPatient =
    patients.find((p) => p.id === demoMeta.featuredDemoPatientId) || patients[0];

  const handleAction = async (actionType: string, minutesOffset?: number) => {
    setBusyAction(actionType);
    try {
      await onRunDemoAction(actionType, minutesOffset);
      setFeedback(`Bajarildi: ${actionType}`);
    } finally {
      setBusyAction(null);
    }
  };

  // Acceptance Test #9 — Backend Organization Isolation Check
  const runAccessControlTest = async (
    actorId: string,
    targetPatientId: string
  ) => {
    const resp = await fetch(
      `/api/patients/${targetPatientId}?actorId=${encodeURIComponent(actorId)}`
    );
    const data = await resp.json();
    if (resp.status === 403) {
      setRbacResult({
        status: 403,
        allowed: false,
        message: `${data.error}: ${data.reason}`,
      });
    } else {
      setRbacResult({
        status: resp.status,
        allowed: true,
        message: `200 OK — Vakolatli kirish tasdiqlandi: ${data.patient?.fullName} (${data.patient?.organizationId})`,
      });
    }
  };

  const demoButtons = [
    {
      step: 1,
      id: 'STEP_1_CREATE_PATIENT',
      label: '1. Demo bemor yaratish',
      desc: 'Yangi sun’iy statsionar bemor (Sanjarbek Karimov) profilini yaratadi.',
    },
    {
      step: 2,
      id: 'STEP_2_DISCHARGE_PATIENT',
      label: '2. Bemorni uyga chiqarish',
      desc: 'Shifoxonadan chiqarish va 24 soatlik kuzatuv ishini (Challenge #11) ochadi.',
    },
    {
      step: 3,
      id: 'STEP_3_ASSIGN_FAMILY_DOCTOR',
      label: '3. Oilaviy shifokorga topshiriq yuborish',
      desc: 'Hududiy oilaviy shifokor (Dr. Malika Tursunova) topshiriqni qabul qiladi.',
    },
    {
      step: 4,
      id: 'STEP_4_TRIGGER_SMS',
      label: '4. SMS eslatmani ishga tushirish',
      desc: 'Bemorga dori qabul qilish vaqti bo‘yicha simulyatsiya SMS yuboradi.',
    },
    {
      step: 5,
      id: 'STEP_5_PATIENT_MED_CONFIRM',
      label: '5. Bemor javobini simulyatsiya qilish',
      desc: 'Bemor dori eslatmasiga "Ichdim" deb javob berishini qayd etadi.',
    },
    {
      step: 6,
      id: 'STEP_6_START_AI_CALL',
      label: '6. AI qo‘ng‘iroqni boshlash',
      desc: 'O‘zbek tilida AI virtual yordamchi suhbati va tahlilini yaratadi.',
    },
    {
      step: 7,
      id: 'STEP_7_SUBMIT_CHECKIN',
      label: '7. Kunlik check-in yuborish',
      desc: 'Bemorning og‘riq shkalasi va AQB ko‘rsatkichlarini saqlaydi.',
    },
    {
      step: 8,
      id: 'STEP_8_GENERATE_REPORT',
      label: '8. Shifokor hisobotini yaratish',
      desc: 'Barcha yig‘ilgan yozuvlar asosida AI shifokor hisobotini tuzadi.',
    },
    {
      step: 9,
      id: 'STEP_9_COMPLETE_FOLLOWUP',
      label: '9. Kuzatuvni yakunlash',
      desc: 'Oilaviy shifokor 24 soatlik vazifani yakunlaydi va analitikani yangilaydi.',
    },
  ];

  const currentStep = demoMeta.currentDemoStep || 1;

  return (
    <div className="space-y-6">
      {/* Header & Progress Bar */}
      <div className="bg-[#10243A] text-white rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[#12B8A6]">
              NATIONAL AI HACKATHON UZBEKISTAN 2026 · CHALLENGE #11
            </span>
            <h1 className="font-display text-2xl font-bold mt-1">
              Hackathon Demo Center — 3 daqiqalik interaktiv taqdimot markazi
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Ushbu boshqaruv markazi hakamlar hay’ati uchun barcha 9 ta asosiy uzluksiz
              kuzatuv qadamini real vaqtda ma&apos;lumotlar bazasida ishga tushirish va
              tekshirish imkonini beradi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {featuredPatient && (
              <button
                type="button"
                onClick={() => onOpenPatient(featuredPatient.id)}
                className="px-4 py-2 text-xs font-semibold bg-[#1769E0] hover:bg-blue-600 text-white rounded-lg"
              >
                Demo bemor profilini ochish ({featuredPatient.fullName.split(' ')[0]})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAction('RESET_DEMO')}
              disabled={busyAction !== null}
              className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Demo ma&apos;lumotlarni tiklash</span>
            </button>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span>Namoyish jarayoni holati:</span>
            <span className="font-mono font-semibold text-[#12B8A6]">
              Qadam {Math.min(currentStep, 9)} / 9
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#12B8A6] transition-all duration-300"
              style={{ width: `${Math.min(100, (currentStep / 9) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Demo Role Switcher inside Demo boshqaruvi */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display font-bold text-base text-[#152238]">
              Demo rolni almashtirish
            </h2>
            <p className="text-xs text-[#64748B]">
              Tizimni turli foydalanuvchi rollari (shifokor, oilaviy shifokor, klinika rahbari yoki bemor) nomidan sinab ko‘ring.
            </p>
          </div>
          <UserCheck className="w-5 h-5 text-[#1769E0]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSwitchPersona(u.id)}
              className="p-3 rounded-xl border border-slate-200 hover:border-[#1769E0] bg-[#F7FAFC] hover:bg-blue-50/40 text-left flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#10243A] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                {u.avatarUrl}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#152238] truncate">
                  {u.fullName}
                </div>
                <div className="text-xs text-[#64748B] truncate">
                  {getRoleLabelUz(u.role)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 10 Action Buttons Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-base text-[#152238]">
              Bجariladigan interaktiv demo amallar (1–9 qadamlar + Tiklash)
            </h2>
            <p className="text-xs text-[#64748B]">
              Har bir tugma haqiqiy backend API chaqiruvini bajaradi va barcha
              boshqaruv panellarini yangilaydi.
            </p>
          </div>
          {feedback && (
            <span className="text-xs font-semibold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              {feedback}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {demoButtons.map((btn) => {
            const isDone = currentStep > btn.step;
            const isNext = currentStep === btn.step;
            return (
              <div
                key={btn.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isNext
                    ? 'border-[#1769E0] bg-blue-50/40'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-[#F7FAFC]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-semibold text-[#1769E0]">
                      QADAM 0{btn.step}
                    </span>
                    {isDone && (
                      <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Bajarildi
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-sm text-[#152238]">
                    {btn.label}
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">{btn.desc}</p>
                </div>

                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => handleAction(btn.id)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    isNext
                      ? 'bg-[#1769E0] text-white hover:bg-blue-700'
                      : 'bg-white border border-slate-200 text-[#152238] hover:border-[#1769E0]'
                  }`}
                >
                  {busyAction === btn.id ? 'Bajarilmoqda...' : btn.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Time Progression & Role Quick-Switch + Backend RBAC Verifier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-[#152238]">
                Simulyatsiya soati (Demo Clock)
              </h3>
              <p className="text-xs text-[#64748B]">
                Haqiqiy server vaqtini o‘zgartirmasdan eslatmalar va 24 soatlik muddat
                o‘tishini (Overdue) tekshirish.
              </p>
            </div>
            <Clock className="w-5 h-5 text-[#1769E0]" />
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7FAFC] border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Simulyatsiya vaqti (Toshkent):</span>
            <span className="font-mono font-bold text-sm text-[#1769E0]">
              {formatUzDateTime(effectiveNowIso)} (+{demoMeta.simulatedOffsetMinutes} daq)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAction('ADVANCE_CLOCK', 15)}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#152238] rounded-lg flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+15 daqiqa (Qayta eslatma)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('ADVANCE_CLOCK', 60)}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#152238] rounded-lg flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+1 soat</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('ADVANCE_CLOCK', 1440)}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+24 soat (Muddat o‘tishini sinash)</span>
            </button>
          </div>
        </div>

        {/* Acceptance Test #9 — Cross-Clinic Access Control Verifier */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-[#152238]">
                Test #9 — Tashkilotlararo xavfsizlik va izolyatsiya tekshiruvi
              </h3>
              <p className="text-xs text-[#64748B]">
                Klinika A shifokori Klinika B bemorining shaxsiy tibbiy ma&apos;lumotlarini
                ocholmasligini backend API darajasida tekshirish.
              </p>
            </div>
            <Lock className="w-5 h-5 text-[#1769E0]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAccessControlTest('usr-dent-1', 'pat-01')}
              className="px-3.5 py-2 text-xs font-semibold bg-red-50 border border-red-200 text-[#DC2626] rounded-lg"
            >
              Stomatologiya shifokori → Shifoxona bemori (403 rad etishni sinash)
            </button>
            <button
              type="button"
              onClick={() => runAccessControlTest('usr-doc-1', 'pat-01')}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-[#16A34A] rounded-lg"
            >
              Davolovchi shifokor → O‘z bemori (200 ruxsatni sinash)
            </button>
          </div>

          {rbacResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono ${
                rbacResult.allowed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              HTTP {rbacResult.status}: {rbacResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
