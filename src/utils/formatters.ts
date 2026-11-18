import { UserRole } from '../shared/types';

export function formatUzDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const formatter = new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${formatter.format(d)} (Toshkent)`;
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function formatShortTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function getCountdownInfo(
  dueAtIso: string,
  effectiveNowIso: string,
  status: string
): {
  label: string;
  isOverdue: boolean;
  isCompleted: boolean;
  hoursRemaining: number;
} {
  if (status === 'Bajarildi') {
    return {
      label: 'Vaqtida bajarildi',
      isOverdue: false,
      isCompleted: true,
      hoursRemaining: 24,
    };
  }
  const dueMs = new Date(dueAtIso).getTime();
  const nowMs = new Date(effectiveNowIso).getTime();
  if (isNaN(dueMs) || isNaN(nowMs)) {
    return {
      label: '24 soatlik muddat',
      isOverdue: false,
      isCompleted: false,
      hoursRemaining: 12,
    };
  }

  const diffMs = dueMs - nowMs;
  if (diffMs <= 0 || status === 'Muddati o‘tgan') {
    const overHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    const overMins = Math.abs(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
    return {
      label: `Muddati o‘tgan (-${overHours}s ${overMins}d)`,
      isOverdue: true,
      isCompleted: false,
      hoursRemaining: 0,
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    label: `${hours} soat ${mins} daqiqa qoldi`,
    isOverdue: false,
    isCompleted: false,
    hoursRemaining: hours,
  };
}

export function getRoleLabelUz(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Platforma Super Admini';
    case 'CLINIC_ADMIN':
      return 'Shifoxona / Klinika Admini';
    case 'TREATING_DOCTOR':
      return 'Davolovchi shifokor';
    case 'FAMILY_DOCTOR':
      return 'Hududiy oilaviy shifokor';
    case 'NURSE':
      return 'Hamshira / Kuzatuv koordinatori';
    case 'PATIENT':
      return 'Bemor';
    case 'CAREGIVER':
      return 'Vakolatli qarindosh (Caregiver)';
    default:
      return role;
  }
}
