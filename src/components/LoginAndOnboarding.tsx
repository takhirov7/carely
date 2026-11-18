import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  HeartPulse,
  Lock,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { UserAccount } from '../shared/types';
import { getRoleLabelUz } from '../utils/formatters';
import { CarelyLogo, LanguageSwitcher, ThemeSwitcher } from '../i18n/translations';

interface LoginAndOnboardingProps {
  users: UserAccount[];
  onSelectDemoPersona: (userId: string) => void;
}

export const LoginAndOnboarding: React.FC<LoginAndOnboardingProps> = ({
  users,
  onSelectDemoPersona,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);

  const handleRealLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(
      "Haqiqiy foydalanuvchi autentifikatsiyasi (Firebase Auth) ulanmaganligi sababli tizim xavfsiz izolyatsiyalangan Demo rejimida ishlamoqda. Iltimos, o'ng tarafdagi sun'iy Demo rollardan birini tanlab tizimga kiring."
    );
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#152238] flex flex-col lg:flex-row">
      {/* Left Side — Brand Identity & Clinical Positioning */}
      <div className="lg:w-5/12 bg-[#10243A] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between gap-4 mb-10">
            <CarelyLogo subtitle="Davolanish va kuzatuv tizimi" />
            <span className="text-xs font-mono text-[#12B8A6] border border-[#12B8A6]/40 px-2.5 py-1 rounded-md">
              Challenge #11
            </span>
          </div>

          <h1 className="font-display text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Davolanish tugasa ham, g‘amxo‘rlik davom etadi.
          </h1>
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed mb-8">
            Shifoxonadan chiqarilgan va muolaja olgan bemorlarni oilaviy shifokorlar,
            davolovchi mutaxassislar hamda AI yordamchisi orqali uzluksiz kuzatish
            platformasi.
          </p>

          {/* Minimal Healthcare Continuity Illustration (Clean Vector Diagram) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <div className="text-xs text-slate-300 font-medium mb-4">
              Uzluksiz tibbiy kuzatuv zanjiri (24 soatlik protokol)
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <Building2 className="w-5 h-5 text-[#1769E0] mx-auto mb-1.5" />
                <div className="text-xs font-semibold">1. Shifoxona</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Chiqarish epikrizi va dori rejasi
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <Stethoscope className="w-5 h-5 text-[#12B8A6] mx-auto mb-1.5" />
                <div className="text-xs font-semibold">2. Oilaviy shifokor</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Avtomatik 24s topshiriq va muloqot
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <HeartPulse className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <div className="text-xs font-semibold">3. Bemor va AI</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Dori tasdig‘i va kunlik check-in
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#12B8A6] shrink-0 mt-0.5" />
              <span>
                Shifoxonadan chiqarishda hududiy oilaviy shifokorga avtomatik 24 soatlik
                kuzatuv topshirig‘ini biriktirish
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#12B8A6] shrink-0 mt-0.5" />
              <span>
                SMS eslatmalar, bemor dori qabuli tasdig‘i va kunlik og‘riq/simptomlar
                monitoringi
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#12B8A6] shrink-0 mt-0.5" />
              <span>
                O‘zbek tilida muloqot qiluvchi xavfsiz AI ovozli kuzatuv agenti va
                shifokor uchun AI hisobotlar
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Tibbiy qarorlar faqat litsenziyaga ega shifokorlar tomonidan qabul qilinadi.</span>
          <span className="font-mono">Asia/Tashkent (UTC+05:00)</span>
        </div>
      </div>

      {/* Right Side — Real Auth Form & Isolated Hackathon Demo Personas */}
      <div className="lg:w-7/12 p-6 sm:p-10 lg:p-12 flex flex-col justify-center max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-[#1769E0] tracking-wide">
                TIZIMGA KIRISH VA DEMO MUHIT
              </span>
              <h2 className="font-display text-2xl font-bold text-[#152238] mt-1">
                Carely platformasiga xush kelibsiz
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#64748B] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              Demo
            </span>
          </div>
        </div>

        {/* Isolated Demo Persona Selector (Prominent for Hackathon Reviewers) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#152238]">
                Hackathon Demo Rollari (Bir klik bilan kirish)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Barcha demo profillar 100% sun&apos;iy (fictional) ma&apos;lumotlar bilan
                to‘ldirilgan va real bemor yozuvlaridan to‘liq ajratilgan.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#1769E0] shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectDemoPersona(u.id)}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#1769E0] hover:bg-blue-50/40 text-left transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#10243A] text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0 group-hover:bg-[#1769E0] transition-colors">
                    {u.avatarUrl}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#152238] truncate">
                      {u.fullName}
                    </div>
                    <div className="text-xs text-[#64748B] truncate">
                      {getRoleLabelUz(u.role)}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1769E0] shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Standard Login Form (Requires Authorized Clinic Invitation / Firebase Auth) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-[#152238]">
                Shaxsiy korporativ hisob orqali kirish
              </h3>
              <p className="text-xs text-[#64748B]">
                Shifokor va klinika hisoblari faqat tasdiqlangan taklifnoma asosida
                faollashtiriladi.
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          {authNotice && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#152238] leading-relaxed">
              {authNotice}
            </div>
          )}

          {!forgotMode ? (
            <form onSubmit={handleRealLoginSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#152238] mb-1">
                    Ishchi Email manzili
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shifokor@klinika.uz"
                    className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769E0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#152238] mb-1">
                    Maxfiy parol
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg focus:outline-none focus:border-[#1769E0]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-[#1769E0] hover:underline"
                >
                  Parolni unutdingizmi?
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAuthNotice(
                        "Google OAuth (Firebase Authentication) ulanmagan. Yuqoridagi Demo rollardan birini tanlab to'liq funksional tizimni sinab ko'ring."
                      )
                    }
                    className="px-3.5 py-2 text-xs font-medium text-[#152238] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Google orqali kirish
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Hisobga kirish
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#64748B]">
                Parolni tiklash havolasi faqat tashkilot administratori tomonidan
                tasdiqlangan email manzillariga yuboriladi.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shifokor@klinika.uz"
                  className="flex-1 px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthNotice(
                      "Demo rejimida parol tiklash xabari simulyatsiya qilindi. Yuqoridagi Demo rollardan birini tanlang."
                    );
                    setForgotMode(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] rounded-lg whitespace-nowrap"
                >
                  Havola yuborish
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
