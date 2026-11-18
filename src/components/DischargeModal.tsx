import React, { useState } from 'react';
import { AlertCircle, Building2, Calendar, Clock, Stethoscope, UserPlus, X } from 'lucide-react';
import { DoctorProfile, Organization, Patient } from '../shared/types';

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  organizations: Organization[];
  doctors: DoctorProfile[];
  defaultPatientId?: string;
  onConfirmDischarge: (payload: {
    patientId: string;
    hospitalId: string;
    treatingDoctorId: string;
    dischargeInstructions: string;
    diagnosisOrProcedureSummary: string;
    district: string;
    familyDoctorId?: string;
    priority: 'Yuqori' | 'O‘rta' | 'Rejali';
    careType: 'Shifoxonadan chiqarish (Challenge #11)' | 'Muolajadan keyingi kuzatuv';
  }) => Promise<void>;
}

export const DischargeModal: React.FC<DischargeModalProps> = ({
  isOpen,
  onClose,
  patients,
  organizations,
  doctors,
  defaultPatientId,
  onConfirmDischarge,
}) => {
  const [patientId, setPatientId] = useState(defaultPatientId || patients[0]?.id || 'pat-01');
  const selectedPatient = patients.find((p) => p.id === patientId) || patients[0];

  const [hospitalId, setHospitalId] = useState(
    selectedPatient?.organizationId || organizations[0]?.id || 'org-hosp-1'
  );
  const [treatingDoctorId, setTreatingDoctorId] = useState(
    selectedPatient?.treatingDoctorId || 'doc-1'
  );
  const [district, setDistrict] = useState(
    selectedPatient?.district || 'Yunusobod tumani'
  );
  const [familyDoctorId, setFamilyDoctorId] = useState<string>('doc-2');
  const [priority, setPriority] = useState<'Yuqori' | 'O‘rta' | 'Rejali'>('Yuqori');
  const [careType, setCareType] = useState<
    'Shifoxonadan chiqarish (Challenge #11)' | 'Muolajadan keyingi kuzatuv'
  >('Shifoxonadan chiqarish (Challenge #11)');
  const [diagnosisSummary, setDiagnosisSummary] = useState(
    'Statsionar davolanish yakunlandi. Ambulator dori rejimi va 24 soatlik hududiy oilaviy shifokor kuzatuviga yo‘naltirildi.'
  );
  const [dischargeInstructions, setDischargeInstructions] = useState(
    'Kuniga 2 mahal arterial qon bosimini o‘lchash, belgilangan dorilarni soat 09:00, 14:00 va 21:00 da qabul qilish hamda 24 soat ichida oilaviy shifokor muloqotidan o‘tish.'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmDischarge({
        patientId,
        hospitalId,
        treatingDoctorId,
        dischargeInstructions,
        diagnosisOrProcedureSummary: diagnosisSummary,
        district,
        familyDoctorId: familyDoctorId === 'UNASSIGNED' ? 'NONE' : familyDoctorId,
        priority,
        careType,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-semibold text-[#1769E0]">
              OFFICIAL CHALLENGE #11 — CONTINUITY OF CARE
            </span>
            <h2 className="font-display text-xl font-bold text-[#152238] mt-0.5">
              Bemorni uyga chiqarish va 24 soatlik kuzatuvni boshlash
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Chiqarish tasdiqlanganda hududiy oilaviy shifokorga avtomatik 24 soatlik
              muddatli topshiriq va xabarnoma yuboriladi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Bemor
              </label>
              <select
                value={patientId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setPatientId(nextId);
                  const found = patients.find((p) => p.id === nextId);
                  if (found) {
                    setDistrict(found.district);
                    setHospitalId(found.organizationId);
                    setTreatingDoctorId(found.treatingDoctorId);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Kuzatuv yo‘nalishi turi
              </label>
              <select
                value={careType}
                onChange={(e) => setCareType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                <option value="Shifoxonadan chiqarish (Challenge #11)">
                  Shifoxonadan chiqarish → Oilaviy shifokor (24s)
                </option>
                <option value="Muolajadan keyingi kuzatuv">
                  Xususiy klinika: Muolajadan keyingi kuzatuv
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Chiqarayotgan tibbiyot muassasasi
              </label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Davolovchi shifokor
              </label>
              <select
                value={treatingDoctorId}
                onChange={(e) => setTreatingDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Bemor yashash tumani (Hududiy biriktirish)
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Mas’ul hududiy oilaviy shifokor
              </label>
              <select
                value={familyDoctorId}
                onChange={(e) => setFamilyDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.specialty})
                  </option>
                ))}
                <option value="UNASSIGNED">
                  Aniqlanmadi — &quot;Biriktirilmagan&quot; navbatiga qo‘yish
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Kuzatuv ustuvorligi (Shifokor belgilaydi)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                <option value="Yuqori">Yuqori (24 soat ichida majburiy muloqot)</option>
                <option value="O‘rta">O‘rta (Rejali nazorat)</option>
                <option value="Rejali">Rejali (Profilaktik)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Birinchi kuzatuv muddati (Avtomatik)
              </label>
              <div className="px-3 py-2 text-sm bg-blue-50/70 border border-blue-200 rounded-lg text-[#1769E0] font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Chiqarilgan vaqt + 24 soat (Toshkent vaqti)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#152238] mb-1">
              Klinik xulosa / Muolaja qisqacha bayoni
            </label>
            <input
              type="text"
              required
              value={diagnosisSummary}
              onChange={(e) => setDiagnosisSummary(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#152238] mb-1">
              Uyga chiqarish bo‘yicha shifokor ko‘rsatmalari
            </label>
            <textarea
              rows={3}
              required
              value={dischargeInstructions}
              onChange={(e) => setDischargeInstructions(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#64748B] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#1769E0] shrink-0 mt-0.5" />
            <span>
              Tasdiqlanganda: 1) Chiqarish hodisasi saqlanadi, 2) Kuzatuv ishi ochiladi,
              3) Oilaviy shifokorga 24 soatlik topshiriq biriktiriladi, 4) SMS/Ilova
              xabarnomasi yuboriladi va 5) Audit tarixiga yoziladi.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1769E0] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Rasmiylashtirilmoqda...'
                : 'Bemorni uyga chiqarishni tasdiqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  doctors: DoctorProfile[];
  defaultOrgId: string;
  onAddPatient: (payload: any) => Promise<void>;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  organizations,
  doctors,
  defaultOrgId,
  onAddPatient,
}) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState(48);
  const [sex, setSex] = useState<'Erkak' | 'Ayol'>('Erkak');
  const [contact, setContact] = useState('+998 90 000 45 67');
  const [district, setDistrict] = useState('Yunusobod tumani');
  const [organizationId, setOrganizationId] = useState(defaultOrgId || 'org-hosp-1');
  const [treatingDoctorId, setTreatingDoctorId] = useState('doc-1');
  const [familyDoctorId, setFamilyDoctorId] = useState('doc-2');
  const [specialtyCategory, setSpecialtyCategory] = useState<
    'Umumiy tibbiyot' | 'Jarrohlik' | 'Kardiologiya' | 'Stomatologiya'
  >('Kardiologiya');
  const [careCaseType, setCareCaseType] = useState(
    'Arterial gipertoniya va statsionardan keyingi dori nazorati'
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await onAddPatient({
        fullName,
        age,
        sex,
        contact,
        region: 'Toshkent shahri',
        district,
        organizationId,
        treatingDoctorId,
        familyDoctorId,
        specialtyCategory,
        careCaseType,
      });
      setFullName('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#1769E0]" />
            <h3 className="font-display font-bold text-lg text-[#152238]">
              Yangi bemor profilini qo‘shish (Sun&apos;iy Demo)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Bemor F.I.Sh (Sun&apos;iy ism)
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: Anvarbek Toshmatov"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Yoshi
              </label>
              <input
                type="number"
                min={1}
                max={110}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Jinsi
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                <option value="Erkak">Erkak</option>
                <option value="Ayol">Ayol</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Telefon raqami (Demo)
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Yashash tumani
              </label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Tibbiyot muassasasi
              </label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Ixtisoslik yo‘nalishi
              </label>
              <select
                value={specialtyCategory}
                onChange={(e) => setSpecialtyCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                <option value="Kardiologiya">Kardiologiya</option>
                <option value="Jarrohlik">Jarrohlik</option>
                <option value="Stomatologiya">Stomatologiya</option>
                <option value="Umumiy tibbiyot">Umumiy tibbiyot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Davolovchi shifokor
              </label>
              <select
                value={treatingDoctorId}
                onChange={(e) => setTreatingDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Hududiy oilaviy shifokor
              </label>
              <select
                value={familyDoctorId}
                onChange={(e) => setFamilyDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#152238] mb-1">
                Kuzatuv sababi / Muolaja turi
              </label>
              <input
                type="text"
                required
                value={careCaseType}
                onChange={(e) => setCareCaseType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7FAFC] border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-blue-700 rounded-lg"
            >
              {saving ? 'Saqlanmoqda...' : 'Bemorni ro‘yxatga olish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
