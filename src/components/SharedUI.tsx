import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Search,
  User,
  X,
} from 'lucide-react';
import { FollowUpTask, Patient } from '../shared/types';
import { formatUzDateTime, getCountdownInfo } from '../utils/formatters';

// 1. PageTitle
export const PageTitle: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
    <div>
      <h1 className="font-display text-2xl sm:text-[28px] font-bold text-[#152238] leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-[#64748B] mt-1">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// 2. StatCard (4 Primary KPI Cards for Doctor / Clinic Dashboard)
export const StatCard: React.FC<{
  label: string;
  value: number | string;
  helperText: string;
  icon: React.FC<{ className?: string }>;
  tone?: 'blue' | 'teal' | 'amber' | 'red' | 'green';
  onClick?: () => void;
}> = ({ label, value, helperText, icon: Icon, tone = 'blue', onClick }) => {
  const toneColors = {
    blue: 'text-[#1769E0] bg-blue-50 border-blue-200',
    teal: 'text-[#12B8A6] bg-teal-50 border-teal-200',
    amber: 'text-[#D97706] bg-amber-50 border-amber-200',
    red: 'text-[#DC2626] bg-red-50 border-red-200',
    green: 'text-[#16A34A] bg-emerald-50 border-emerald-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white border border-slate-200 hover:border-[#1769E0] rounded-xl p-5 text-left transition-colors flex items-start justify-between gap-4 min-h-[116px]"
    >
      <div>
        <div className="text-base font-semibold text-[#64748B]">{label}</div>
        <div className="font-display text-3xl sm:text-4xl font-bold text-[#152238] tabular-nums mt-1.5">
          {value}
        </div>
        <div className="text-sm text-[#64748B] mt-1.5">{helperText}</div>
      </div>
      <div
        className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${toneColors[tone]}`}
      >
        <Icon className="w-6 h-6" />
      </div>
    </button>
  );
};

// 3. StatusBadge (Combines high-contrast text + icon, never color alone)
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isUrgent =
    status === 'Shifokor ko‘rishi kerak' ||
    status === 'Muddati o‘tgan' ||
    status === 'O‘tkazib yubordim' ||
    status === 'Biriktirilmagan';
  const isSuccess =
    status === 'Bajarildi' ||
    status === 'Ichdim' ||
    status === 'Javob berildi' ||
    status === 'Shifokor tomonidan tasdiqlangan';
  const isWarning =
    status === 'Yangi' ||
    status === 'Tasdiqlanmagan' ||
    status === 'Keyinroq' ||
    status === 'Kutilmoqda';

  if (isUrgent) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#DC2626]">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (isSuccess) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16A34A]">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D97706]">
        <Clock className="w-4 h-4 shrink-0" />
        <span>{status === 'Yangi' ? 'Yangi vazifa' : status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1769E0]">
      <span>{status}</span>
    </span>
  );
};

// 4. SearchInput
export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({
  value,
  onChange,
  placeholder = 'Bemor ismi yoki ID bo‘yicha qidirish',
}) => (
  <div className="relative flex-1 min-w-[240px]">
    <Search className="w-5 h-5 text-[#64748B] absolute left-3.5 top-3.5 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full min-h-[46px] pl-11 pr-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl text-[#152238] placeholder:text-[#64748B]"
    />
  </div>
);

// 5. FilterTabs
export const FilterTabs: React.FC<{
  options: { id: string; label: string; count?: number }[];
  activeId: string;
  onSelect: (id: string) => void;
}> = ({ options, activeId, onSelect }) => (
  <div className="flex flex-wrap items-center gap-2" role="tablist">
    {options.map((opt) => {
      const active = opt.id === activeId;
      return (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(opt.id)}
          className={`min-h-[44px] px-4 py-2 text-sm sm:text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
            active
              ? 'bg-[#1769E0] text-white'
              : 'bg-white border border-slate-200 text-[#152238] hover:bg-slate-100'
          }`}
        >
          {opt.label}
          {opt.count !== undefined ? ` (${opt.count})` : ''}
        </button>
      );
    })}
  </div>
);

// 6. EmptyState
export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto my-4">
    <AlertCircle className="w-8 h-8 text-[#64748B] mx-auto mb-3" />
    <h3 className="font-display text-lg font-bold text-[#152238]">{title}</h3>
    <p className="text-base text-[#64748B] mt-1">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 min-h-[44px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-semibold rounded-xl"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// 7. ConfirmationDialog
export const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-bold text-[#152238]">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-base text-[#64748B] leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#152238] bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-5 py-2 text-base font-semibold text-white rounded-xl ${
              destructive
                ? 'bg-[#DC2626] hover:bg-red-700'
                : 'bg-[#1769E0] hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// 8. FollowUpTaskCard (Section 7 — Step-by-Step 24-Hour Post-Discharge Follow-Up Card)
export const FollowUpTaskCard: React.FC<{
  task: FollowUpTask;
  patient?: Patient;
  assignedDoctorName?: string;
  effectiveNowIso: string;
  onOpenPatient: (patientId: string) => void;
  onAcceptTask: (taskId: string) => Promise<void>;
  onCompleteTask: (
    taskId: string,
    contactMethod: string,
    notes: string
  ) => Promise<void>;
}> = ({
  task,
  patient,
  assignedDoctorName,
  effectiveNowIso,
  onOpenPatient,
  onAcceptTask,
  onCompleteTask,
}) => {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [contactMethod, setContactMethod] = useState('Telefon muloqoti');
  const [resultNote, setResultNote] = useState(
    'Bemor bilan bog‘lanildi, umumiy ahvoli barqaror, dori rejasini qabul qilmoqda.'
  );
  const [busy, setBusy] = useState(false);

  const cd = getCountdownInfo(task.dueAt, effectiveNowIso, task.status);
  const isAccepted =
    task.status === 'Qabul qilindi' || task.status === 'Jarayonda';
  const isCompleted = task.status === 'Bajarildi';

  // Determine current step in the 4-step workflow
  const currentStep = isCompleted ? 4 : showNoteForm ? 3 : isAccepted ? 2 : 1;

  return (
    <div
      className={`bg-white rounded-xl border p-5 space-y-4 ${
        cd.isOverdue && !isCompleted
          ? 'border-red-300 bg-red-50/20'
          : isCompleted
          ? 'border-emerald-200'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#1769E0]">
            Shifoxonadan keyingi birinchi kuzatuv (24 soatlik vazifa)
          </div>
          <h3 className="font-display text-xl font-bold text-[#152238] mt-0.5">
            {patient?.fullName || task.patientId}{' '}
            {patient ? `(${patient.age} yosh, ${patient.district})` : ''}
          </h3>
          <div className="text-sm text-[#64748B] mt-1">
            Mas’ul shifokor:{' '}
            <strong className="text-[#152238]">
              {assignedDoctorName || 'Biriktirilmagan (Poliklinika navbatida)'}
            </strong>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <StatusBadge
            status={task.status === 'Yangi' ? 'Yangi vazifa' : task.status}
          />
          <div className="text-sm font-mono font-semibold text-[#152238] mt-1">
            Muddat: {formatUzDateTime(task.dueAt)} ({cd.label})
          </div>
        </div>
      </div>

      {/* Simple 4-Step Visual Guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs sm:text-sm">
        {[
          { step: 1, label: "1. Bemor ma'lumotini ko‘rish" },
          { step: 2, label: '2. Bemor bilan bog‘lanish' },
          { step: 3, label: '3. Natijani qayd etish' },
          { step: 4, label: '4. Kuzatuvni yakunlash' },
        ].map((s) => (
          <div
            key={s.step}
            className={`px-3 py-2 rounded-lg border font-medium ${
              currentStep >= s.step
                ? 'bg-blue-50/70 border-blue-200 text-[#1769E0] font-semibold'
                : 'bg-[#F7FAFC] border-slate-200 text-[#64748B]'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      <p className="text-base text-[#152238] leading-relaxed">{task.notes}</p>

      {/* Step 3 Expandable Result Form */}
      {showNoteForm && !isCompleted && (
        <div className="p-4 rounded-xl bg-[#F7FAFC] border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#152238] mb-1">
                Muloqot usuli
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-base bg-white border border-slate-300 rounded-xl"
              >
                <option value="Telefon muloqoti">Telefon muloqoti</option>
                <option value="Uyga tashrif">Uyga tashrif (Patronaj)</option>
                <option value="Klinikada qabul">Poliklinikada qabul</option>
                <option value="Video konsultatsiya">Video konsultatsiya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#152238] mb-1">
                Bemor telefoni
              </label>
              <div className="min-h-[44px] px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 font-mono text-base text-[#152238]">
                <Phone className="w-4 h-4 text-[#1769E0]" />
                <span>{patient?.contact || '+998 90 000 10 01'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#152238] mb-1">
              Kuzatuv natijasi va shifokor xulosasi
            </label>
            <textarea
              rows={2}
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              className="w-full px-3 py-2 text-base bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNoteForm(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-[#64748B] hover:text-[#152238]"
            >
              Yopish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onCompleteTask(task.id, contactMethod, resultNote);
                  setShowNoteForm(false);
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-[44px] px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white text-base font-semibold rounded-xl"
            >
              {busy ? 'Saqlanmoqda...' : 'Kuzatuvni yakunlash'}
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {patient ? (
          <button
            type="button"
            onClick={() => onOpenPatient(patient.id)}
            className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#152238] bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Bemorni ko‘rish
          </button>
        ) : (
          <span />
        )}

        {!isCompleted && (
          <div className="flex flex-wrap items-center gap-2.5">
            {!isAccepted ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onAcceptTask(task.id);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="min-h-[44px] px-5 py-2.5 bg-[#1769E0] hover:bg-blue-700 text-white text-base font-semibold rounded-xl"
              >
                Vazifani qabul qilish
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(true)}
                  className="min-h-[44px] px-4 py-2 text-base font-semibold text-[#1769E0] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl"
                >
                  Kuzatuv natijasini yozish
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(true)}
                  className="min-h-[44px] px-5 py-2.5 bg-[#16A34A] hover:bg-emerald-700 text-white text-base font-semibold rounded-xl"
                >
                  Kuzatuvni yakunlash
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
