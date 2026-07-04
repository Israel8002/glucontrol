import { format, parseISO, isToday, isYesterday, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StatsPeriod } from '@/types';

/**
 * Formatea una fecha ISO para mostrar al usuario
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    const days = differenceInDays(new Date(), date);
    if (days < 7) return format(date, "EEEE", { locale: es });
    return format(date, "dd 'de' MMMM", { locale: es });
  } catch {
    return dateStr;
  }
}

/**
 * Formatea fecha completa
 */
export function formatFullDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

/**
 * Formatea solo la hora
 */
export function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5); // HH:mm
}

/**
 * Obtiene el rango de fechas para un período estadístico
 */
export function getDateRangeForPeriod(period: StatsPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  
  switch (period) {
    case 'day':
      return { startDate: fmt(now), endDate: fmt(now) };
    case 'week':
      return { startDate: fmt(startOfWeek(now, { weekStartsOn: 1 })), endDate: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case 'month':
      return { startDate: fmt(startOfMonth(now)), endDate: fmt(endOfMonth(now)) };
    case '3months':
      return { startDate: fmt(subMonths(now, 3)), endDate: fmt(now) };
    case '6months':
      return { startDate: fmt(subMonths(now, 6)), endDate: fmt(now) };
    case 'year':
      return { startDate: fmt(startOfYear(now)), endDate: fmt(endOfYear(now)) };
    case 'all':
      return { startDate: '2000-01-01', endDate: '2100-12-31' };
    default:
      return { startDate: fmt(now), endDate: fmt(now) };
  }
}

/**
 * Nombre del período estadístico
 */
export const PERIOD_LABELS: Record<StatsPeriod, string> = {
  day: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  '3months': 'Últimos 3 meses',
  '6months': 'Últimos 6 meses',
  year: 'Este año',
  all: 'Todo el historial',
};

/**
 * Obtiene la fecha actual en formato ISO
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Obtiene la hora actual en formato HH:mm
 */
export function nowTime(): string {
  return format(new Date(), 'HH:mm');
}

/**
 * Convierte "HH:mm" a minutos del día para comparaciones
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Formatea duración en minutos a texto legible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Nombre del día de la semana
 */
export function dayName(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE', { locale: es });
  } catch {
    return '';
  }
}

/**
 * Generar array de los últimos N días
 */
export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    format(subDays(new Date(), n - 1 - i), 'yyyy-MM-dd')
  );
}
