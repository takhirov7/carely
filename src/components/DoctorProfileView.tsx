import React, { useState } from 'react';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Save,
  Search,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CareCase,
  DailyCheckIn,
  DoctorProfile,
  FollowUpTask,
  Organization,
  Patient,
} from '../shared/types';
import { formatUzDateTime, getCountdownInfo } from '../utils/formatters';

interface DoctorProfileViewProps {
  doctor: DoctorProfile;
  allDoctors: DoctorProfile[];
  onSelectDoctor: (doctorId: string) => void;
  organizations: Organization[];
  patients: Patient[];
  careCases: CareCase[];
  followUpTasks: FollowUpTask[];
  dailyCheckIns: DailyCheckIn[];
  effectiveNowIso: string;
  onOpenPatient: (patientId: string) => void;
  onSaveDoctorProfile: (doctorId: string, updates: Partial<DoctorProfile>) => Promise<void>;
}

export const DoctorProfileView: React.FC<DoctorProfileViewProps> = ({
  doctor,
  allDoctors,
  onSelectDoctor,
  organizations,
  patients,
  careCases,
  followUpTasks,
  dailyCheckIns,
  effectiveNowIso,
  onOpenPatient,
  onSaveDoctorProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fullName, setFullName] = useState(doctor.fullName);
  const [specialty, setSpecialty] = useState(doctor.specialty);
  const [department, setDepartment] = useState(doctor.department);
  const [professionalTitle, setProfessionalTitle] = useState(doctor.professionalTitle);
  const [licenseIdentifier, setLicenseIdentifier] = useState(doctor.licenseIdentifier);
  const [yearsOfExperience, setYearsOfExperience] = useState(doctor.yearsOfExperience);
  const [biography, setBiography] = useState(doctor.biography);
  const [phone, setPhone] = useState(doctor.phone);
  const [workEmail, setWorkEmail] = useState(doctor.workEmail);
  const [workSchedule, setWorkSchedule] = useState(doctor.workSchedule);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  // Sync local form state when switching viewed doctor
  React.useEffect(() => {
    setFullName(doctor.fullName);
    setSpecialty(doctor.specialty);
    setDepartment(doctor.department);
    setProfessionalTitle(doctor.professionalTitle);
    setLicenseIdentifier(doctor.licenseIdentifier);
    setYearsOfExperience(doctor.yearsOfExperience);
    setBiography(doctor.biography);
    setPhone(doctor.phone);
    setWorkEmail(doctor.workEmail);
    setWorkSchedule(doctor.workSchedule);
  }, [doctor]);

  const org = organizations.find((o) => o.id === doctor.organizationId);

  const assignedPatients = patients.filter(
    (p) => p.treatingDoctorId === doctor.id || p.familyDoctorId === doctor.id
  );
  const filteredPatients = assignedPatients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.careCaseType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const doctorCases = careCases.filter(
    (c) => c.treatingDoctorId === doctor.id || c.familyDoctorId === doctor.id
  );
  const doctorTasks = followUpTasks.filter(
    (t) => t.assignedDoctorId === doctor.id || t.createdByDoctorId === doctor.id
  );

  const completedTasks = doctorTasks.filter((t) => t.status === 'Bajarildi').length;
  const pendingTasks = doctorTasks.filter(
    (t) => t.status === 'Yangi' || t.status === 'Qabul qilindi' || t.status === 'Jarayonda'
  ).length;
  const overdueTasks = doctorTasks.filter((t) => t.status === 'Muddati o‘tgan').length;

  const performanceChartData = [
    { name: 'Bajarilgan', value: completedTasks || 1, color: '#16A34A' },
    { name: 'Jarayonda', value: pendingTasks || 1, color: '#1769E0' },
    { name: 'Muddati o‘tgan', value: overdueTasks, color: '#DC2626' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await onSaveDoctorProfile(doctor.id, {
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
      });
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Doctor Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-[#1769E0]">
            SHIFOKOR SHAXSIY PROFILI VA SAMARADORLIK KO‘RSATKICHLARI
          </span>
          <h1 className="font-display text-xl font-bold text-[#152238]">
            {doctor.fullName} — Shaxsiy kabinet
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B]">Boshqa shifokor profilini ko‘rish:</span>
          <select
            value={doctor.id}
            onChange={(e) => onSelectDoctor(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#F7FAFC] border border-slate-200 rounded-lg"
          >
            {allDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.specialty})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION A — Personal Information */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#10243A] text-white font-display font-bold text-xl flex items-center justify-center shrink-0">
              {doctor.fullName
                .replace('Dr. ', '')
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span>{doctor.professionalTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">Litsenziya: {doctor.licenseIdentifier}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{doctor.yearsOfExperience} yil tajriba</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#152238] mt-1">
                {doctor.fullName}
              </h2>
              <div className="text-sm font-medium text-[#1769E0] mt-0.5">
                {doctor.specialty} · {doctor.department} bo‘limi
              </div>
              <p className="text-sm text-[#64748B] mt-2 max-w-3xl leading-relaxed">
                {doctor.biography}
              </p>
            </div>
          </div>

          <div className="bg-[#F7FAFC] border border-slate-200 rounded-xl p-4 text-xs space-y-2 min-w-[260px]">
            <div className="font-semibold text-[#152238]">
              {org?.name || doctor.organizationId}
            </div>
            <div className="text-[#64748B] flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#1769E0]" />
              <span className="font-mono">{doctor.phone}</span>
            </div>
            <div className="text-[#64748B] flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#1769E0]" />
              <span>{doctor.workEmail}</span>
            </div>
            <div className="text-[#64748B] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#1769E0]" />
              <span>{doctor.workSchedule}</span>
            </div>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-200">
          <div>
            <div className="text-xs text-[#64748B]">Biriktirilgan bemorlar</div>
            <div className="font-display text-2xl font-bold text-[#152238] tabular-nums mt-0.5">
              {assignedPatients.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Aktiv kuzatuv ishlari</div>
            <div className="font-display text-2xl font-bold text-[#1769E0] tabular-nums mt-0.5">
              {doctorCases.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Kutilayotgan topshiriqlar</div>
            <div className="font-display text-2xl font-bold text-[#F59E0B] tabular-nums mt-0.5">
              {pendingTasks}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#64748B]">Yakunlangan kuzatuvlar</div>
            <div className="font-display text-2xl font-bold text-[#16A34A] tabular-nums mt-0.5">
              {completedTasks}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B — My Patients & SECTION D — Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display font-bold text-base text-[#152238]">
              Mening bemorlarim ({filteredPatients.length})
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Bemor qidirish..."
                className="pl-9 pr-3 py-1.5 text-xs bg-[#F7FAFC] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Desktop Table (Unchanged on md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[#64748B]">
                  <th className="py-2.5 pr-3 font-semibold">Bemor</th>
                  <th className="py-2.5 px-3 font-semibold">Muolaja / Holat</th>
                  <th className="py-2.5 px-3 font-semibold">Tuman</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3 font-semibold text-[#152238]">
                      {p.fullName}
                      <div className="text-[11px] font-normal text-[#64748B] font-mono">
                        {p.contact}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#152238]">{p.careCaseType}</td>
                    <td className="py-3 px-3 text-[#64748B]">{p.district}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          p.caseStatus === 'Shifokor ko‘rishi kerak'
                            ? 'text-[#DC2626]'
                            : 'text-[#16A34A]'
                        }`}
                      >
                        {p.caseStatus}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenPatient(p.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#1769E0] hover:underline"
                      >
                        Profilni ochish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (< 768px only) */}
          <div className="md:hidden space-y-3">
            {filteredPatients.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-base text-[#152238]">
                      {p.fullName}
                    </div>
                    <div className="text-sm font-mono text-[#64748B]">{p.contact}</div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      p.caseStatus === 'Shifokor ko‘rishi kerak'
                        ? 'bg-red-50 text-[#DC2626]'
                        : 'bg-emerald-50 text-[#16A34A]'
                    }`}
                  >
                    {p.caseStatus}
                  </span>
                </div>
                <div className="text-sm text-[#152238]">{p.careCaseType}</div>
                <div className="text-xs text-[#64748B]">Tuman: {p.district}</div>
                <button
                  type="button"
                  onClick={() => onOpenPatient(p.id)}
                  className="w-full min-h-[44px] py-2 px-4 bg-[#1769E0] text-white text-base font-semibold rounded-xl"
                >
                  Bemorni ko‘rish
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION D — Follow-Up Performance Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#152238] mb-1">
              Kuzatuv samaradorligi
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Bajarilgan, jarayondagi va muddati o‘tgan topshiriqlar taqsimoti
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {performanceChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Bemor check-in javob ko‘rsatkichi:</span>
              <span className="font-mono font-semibold text-[#16A34A]">92%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">24 soatlik SLA bajarilishi:</span>
              <span className="font-mono font-semibold text-[#1769E0]">88%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C — Active Monitoring Cards & SECTION E — My Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-[#152238]">
            Aktiv kuzatuv ishlari ({doctorCases.length})
          </h3>
          {doctorCases.map((c) => {
            const pat = patients.find((p) => p.id === c.patientId);
            return (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC] flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-[#1769E0] font-semibold">{c.careType}</div>
                  <div className="font-semibold text-sm text-[#152238] mt-0.5">
                    {pat?.fullName || c.patientId}
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    {c.diagnosisOrProcedureSummary}
                  </div>
                </div>
                {pat && (
                  <button
                    type="button"
                    onClick={() => onOpenPatient(pat.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg shrink-0"
                  >
                    Ko‘rish
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-[#152238]">
            Mening jadvalim va 24 soatlik kuzatuv muddatlari
          </h3>
          {doctorTasks.map((t) => {
            const pat = patients.find((p) => p.id === t.patientId);
            const cd = getCountdownInfo(t.dueAt, effectiveNowIso, t.status);
            return (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 bg-[#F7FAFC] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-sm text-[#152238]">
                    {pat?.fullName || t.patientId} — {t.taskType}
                  </div>
                  <div className="text-xs text-[#64748B] font-mono mt-0.5">
                    Muddat: {formatUzDateTime(t.dueAt)}
                  </div>
                </div>
                <span
                  className={`text-xs font-mono font-semibold ${
                    cd.isOverdue
                      ? 'text-[#DC2626]'
                      : cd.isCompleted
                      ? 'text-[#16A34A]'
                      : 'text-[#1769E0]'
                  }`}
                >
                  {cd.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION F — Profile Settings (Acceptance Test 1: Edit & Save Persistently) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#152238]">
              Shifokor profilini tahrirlash (Doimiy saqlash)
            </h3>
            <p className="text-xs text-[#64748B]">
              Kiritilgan o‘zgarishlar server ma&apos;lumotlar bazasida saqlanadi va sahifa
              yangilanganda ham o‘zgarmay qoladi.
            </p>
          </div>
          {savedBanner && (
            <span className="text-xs font-semibold text-[#16A34A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profil muvaffaqiyatli saqlandi!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#152238] mb-1">F.I.Sh</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Mutaxassisligi
            </label>
            <input
              type="text"
              required
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">Bo‘lim</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Ilmiy / Kasbiy unvoni
            </label>
            <input
              type="text"
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Telefon raqami
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#152238] mb-1">
              Qabul va ish jadvali
            </label>
            <input
              type="text"
              value={workSchedule}
              onChange={(e) => setWorkSchedule(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-[#152238] mb-1">
              Kasbiy tarjimai hol (Biografiya)
            </label>
            <textarea
              rows={3}
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'Profil o‘zgarishlarini saqlash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
