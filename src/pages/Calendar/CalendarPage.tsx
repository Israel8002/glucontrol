import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Droplets, Pill, Syringe, Scale, Heart,
  Plus, Pencil, Trash2, X, ChevronRight as Chevron,
  Check, Clock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { medicationRepository } from '@/repositories/medicationRepository';
import { insulinRepository } from '@/repositories/insulinRepository';
import { weightRepository, bloodPressureRepository } from '@/repositories/healthRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { formatGlucose, getStatusColor, getGlucoseStatusColor } from '@/utils/glucose';
import { formatDisplayDate, today, nowTime } from '@/utils/date';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isToday, isSameDay, isFuture,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { GlucoseReading, WeightLog, BloodPressureLog, Medication, InsulinTypeRecord } from '@/entities';
import { GLUCOSE_STATUS_LABELS, BLOOD_PRESSURE_CATEGORIES, BMI_CATEGORIES, INSULIN_TYPE_LABELS } from '@/core/constants';
import styles from './CalendarPage.module.css';

const DAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ─── Tipos internos ─────────────────────────────────────────────────────────────

interface DayDots {
  hasGlucose: boolean;
  hasMedication: boolean;
  hasInsulin: boolean;
  hasWeight: boolean;
  hasBP: boolean;
  glucoseStatus?: string;
}

interface DayDetails {
  glucose: GlucoseReading[];
  medications: Array<{ id: string; medicationId: string; name: string; taken: boolean; time: string; dose?: string }>;
  insulin: Array<{ id: string; units: number; time: string; typeName?: string }>;
  weight: WeightLog[];
  bloodPressure: BloodPressureLog[];
}

// Módulos disponibles para registrar
const REGISTER_MODULES = [
  { key: 'glucosa', label: 'Glucosa', icon: Droplets, color: '#22c55e', path: '/glucosa/nueva' },
  { key: 'medicamentos', label: 'Medicamentos', icon: Pill, color: '#3b82f6', path: '/medicamentos' },
  { key: 'insulina', label: 'Insulina', icon: Syringe, color: '#8b5cf6', path: '/insulina' },
  { key: 'peso', label: 'Peso', icon: Scale, color: '#f59e0b', path: '/peso' },
  { key: 'presion', label: 'Presión arterial', icon: Heart, color: '#ef4444', path: '/presion' },
];

// ─── Componente principal ────────────────────────────────────────────────────────

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const { settings } = useSettingsStore();
  const { success, error: toastError } = useToast();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  });
  const [dotData, setDotData] = useState<Record<string, DayDots>>({});
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [activeMedications, setActiveMedications] = useState<Medication[]>([]);
  const [activeInsulinTypes, setActiveInsulinTypes] = useState<InsulinTypeRecord[]>([]);
  const [insulinUnits, setInsulinUnits] = useState<Record<string, number>>({});
  const [insulinDoseTypes, setInsulinDoseTypes] = useState<Record<string, 'daily' | 'correction'>>({});
  const [insulinTimes, setInsulinTimes] = useState<Record<string, string>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        setCurrentMonth(parsed);
      }
    }
  }, [dateParam]);

  const unit = settings?.glucoseUnit ?? 'mg/dL';

  // ─── Carga de datos del mes (puntos indicadores) ───────────────────────────

  const loadMonthData = useCallback(async (month: Date) => {
    setIsLoadingMonth(true);
    try {
      const start = format(startOfMonth(month), 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');

      const [glucoseData, medLogs, insulinLogs, weightLogs, bpLogs] = await Promise.all([
        glucoseRepository.getByDateRange(start, end),
        medicationRepository.getLogsByDateRange(start, end),
        insulinRepository.getByDateRange(start, end),
        weightRepository.getByDateRange(start, end),
        bloodPressureRepository.getByDateRange(start, end),
      ]);

      const dots: Record<string, DayDots> = {};
      const init = (d: string) => {
        if (!dots[d]) dots[d] = { hasGlucose: false, hasMedication: false, hasInsulin: false, hasWeight: false, hasBP: false };
      };

      glucoseData.forEach(r => { init(r.readingDate); dots[r.readingDate].hasGlucose = true; dots[r.readingDate].glucoseStatus = r.status; });
      medLogs.forEach(l => { if (l.taken) { init(l.logDate); dots[l.logDate].hasMedication = true; } });
      insulinLogs.forEach(l => { init(l.logDate); dots[l.logDate].hasInsulin = true; });
      weightLogs.forEach(l => { init(l.logDate); dots[l.logDate].hasWeight = true; });
      bpLogs.forEach(l => { init(l.logDate); dots[l.logDate].hasBP = true; });

      setDotData(dots);
    } catch { } finally { setIsLoadingMonth(false); }
  }, []);

  // ─── Carga de detalles del día seleccionado ───────────────────────────────

  const loadDayDetails = useCallback(async (date: Date) => {
    setIsLoadingDay(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const [glucoseData, medLogs, insulinLogs, weightLogs, bpLogs, activeMeds, activeInsulins] = await Promise.all([
        glucoseRepository.getByDate(dateStr),
        medicationRepository.getLogsByDate(dateStr),
        insulinRepository.getByDate(dateStr),
        weightRepository.getByDateRange(dateStr, dateStr),
        bloodPressureRepository.getByDateRange(dateStr, dateStr),
        medicationRepository.getAllMedications(),
        insulinRepository.getAllTypes(),
      ]);

      setActiveMedications(activeMeds);
      setActiveInsulinTypes(activeInsulins);
      setInsulinUnits(prev => {
        const next = { ...prev };
        activeInsulins.forEach(t => {
          if (next[t.id] === undefined) {
            next[t.id] = t.units;
          }
        });
        return next;
      });
      const initialDoseTypes: Record<string, 'daily' | 'correction'> = {};
      const initialTimes: Record<string, string> = {};
      activeInsulins.forEach(t => {
        initialDoseTypes[t.id] = 'daily';
        initialTimes[t.id] = t.defaultTime || '08:00';
      });
      setInsulinDoseTypes(initialDoseTypes);
      setInsulinTimes(initialTimes);

      setDayDetails({
        glucose: glucoseData,
        medications: medLogs.map(l => {
          const med = activeMeds.find(m => m.id === l.medicationId);
          return {
            id: l.id,
            medicationId: l.medicationId,
            name: med?.name ?? l.medicationName ?? '—',
            taken: l.taken,
            time: l.scheduledTime,
            dose: med?.dosage ?? (l.dose != null ? String(l.dose) : undefined),
          };
        }),
        insulin: insulinLogs.map(l => {
          const insulin = activeInsulins.find(i => i.id === l.insulinId);
          return {
            id: l.id,
            units: l.units,
            time: l.logTime,
            typeName: insulin?.name ?? l.insulinTypeName,
          };
        }),
        weight: weightLogs,
        bloodPressure: bpLogs,
      });
    } catch { } finally { setIsLoadingDay(false); }
  }, []);

  useEffect(() => { loadMonthData(currentMonth); }, [currentMonth, loadMonthData]);
  useEffect(() => { if (selectedDate) loadDayDetails(selectedDate); }, [selectedDate, loadDayDetails]);

  // ─── Toggles e inserciones rápidas ───────────────────────────────────────

  const handleTakeMedication = async (med: Medication, scheduledTime: string, taken: boolean) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      const existingLog = dayDetails?.medications.find(
        l => l.medicationId === med.id && l.time === scheduledTime
      );

      if (existingLog) {
        await medicationRepository.updateLog(existingLog.id, {
          taken,
          takenTime: taken ? new Date().toTimeString().slice(0, 5) : undefined,
        });
      } else {
        await medicationRepository.createLog({
          medicationId: med.id,
          taken,
          scheduledTime,
          takenTime: taken ? new Date().toTimeString().slice(0, 5) : undefined,
          logDate: dateStr,
        });
      }
      success(`${med.name} marcado como ${taken ? 'tomado' : 'no tomado'}`);
      await loadDayDetails(selectedDate);
      await loadMonthData(currentMonth);
    } catch {
      toastError('Error al registrar toma de medicamento');
    }
  };

  const handleLogInsulin = async (insulinType: InsulinTypeRecord, units: number, isCorrection: boolean, logTime: string) => {
    if (!selectedDate) return;
    try {
      const logDate = format(selectedDate, 'yyyy-MM-dd');
      await insulinRepository.createLog({
        insulinId: insulinType.id,
        units,
        site: 'abdomen',
        type: insulinType.type,
        logDate,
        logTime,
        correctionDose: isCorrection
      });
      success(`Registrada dosis ${isCorrection ? 'correctiva ' : ''}de ${units} U de ${insulinType.name}`);
      await loadDayDetails(selectedDate);
      await loadMonthData(currentMonth);
    } catch {
      toastError('Error al registrar dosis de insulina');
    }
  };

  const adjustUnits = (typeId: string, delta: number) => {
    setInsulinUnits(prev => {
      const current = prev[typeId] ?? 10;
      const next = Math.max(0.5, current + delta);
      return { ...prev, [typeId]: next };
    });
  };

  // ─── Eliminar registros ──────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget || !selectedDate) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'glucose') await glucoseRepository.delete(deleteTarget.id);
      else if (deleteTarget.type === 'insulin') await insulinRepository.deleteLog(deleteTarget.id);
      else if (deleteTarget.type === 'weight') await weightRepository.delete(deleteTarget.id);
      else if (deleteTarget.type === 'bp') await bloodPressureRepository.delete(deleteTarget.id);
      else if (deleteTarget.type === 'medication') await medicationRepository.deleteLog(deleteTarget.id);

      success('Registro eliminado');
      setDeleteTarget(null);
      await loadDayDetails(selectedDate);
      await loadMonthData(currentMonth);
    } catch {
      toastError('Error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Navegar a formulario con fecha pre-seleccionada ─────────────────────

  const handleRegisterModule = (path: string) => {
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setShowModuleSelector(false);
    navigate(`${path}?date=${dateStr}`);
  };

  // ─── Render calendario ───────────────────────────────────────────────────

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = getDay(startOfMonth(currentMonth));
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <CalendarDays size={24} className={styles.headerIcon} />
          <h1>Calendario</h1>
        </div>
      </div>

      {!selectedDate ? (
        <>
          {/* Navegación de mes */}
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={() => setCurrentMonth(m => subMonths(m, 1))} aria-label="Mes anterior">
              <ChevronLeft size={22} />
            </button>
            <span className={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
            <button className={styles.navBtn} onClick={() => setCurrentMonth(m => addMonths(m, 1))} aria-label="Mes siguiente">
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Cabecera días de semana */}
          <div className={styles.weekHeader}>
            {DAYS_ES.map(d => <span key={d} className={styles.weekDay}>{d}</span>)}
          </div>

          {/* Grid del calendario */}
          {isLoadingMonth ? (
            <div className={styles.calLoading}><Spinner size="md" /></div>
          ) : (
            <div className={styles.calGrid}>
              {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} className={styles.dayEmpty} />)}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const data = dotData[dateStr];
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentDay = isToday(day);
                const isFutureDay = isFuture(day) && !isToday(day);

                return (
                  <button
                    key={dateStr}
                    className={`${styles.dayCell} ${isSelected ? styles.daySelected : ''} ${isCurrentDay ? styles.dayToday : ''} ${isFutureDay ? styles.dayFuture : ''}`}
                    onClick={() => !isFutureDay && setSelectedDate(day)}
                    disabled={isFutureDay}
                    aria-label={`${format(day, 'd MMMM', { locale: es })}`}
                  >
                    <span className={styles.dayNum}>{format(day, 'd')}</span>
                    {data && (
                      <div className={styles.dayDots}>
                        {data.hasGlucose && <span className={styles.dot} style={{ background: data.glucoseStatus ? getStatusColor(data.glucoseStatus) : '#22c55e' }} />}
                        {data.hasMedication && <span className={styles.dot} style={{ background: '#3b82f6' }} />}
                        {data.hasInsulin && <span className={styles.dot} style={{ background: '#8b5cf6' }} />}
                        {data.hasWeight && <span className={styles.dot} style={{ background: '#f59e0b' }} />}
                        {data.hasBP && <span className={styles.dot} style={{ background: '#ef4444' }} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: '#22c55e' }} />Glucosa</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: '#3b82f6' }} />Medicamentos</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: '#8b5cf6' }} />Insulina</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: '#f59e0b' }} />Peso</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{ background: '#ef4444' }} />Presión</span>
          </div>
        </>
      ) : (
        /* ── Panel de día seleccionado ───────────────────────────────────────── */
        <div className={styles.dayPanel}>
          {/* Encabezado del panel */}
          <div className={styles.dayPanelHeader}>
            <div>
              <p className={styles.dayPanelDate}>{format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
              {isToday(selectedDate) && <span className={styles.todayBadge}>Hoy</span>}
            </div>
            <div className={styles.dayPanelActions}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={15} />}
                onClick={() => setShowModuleSelector(true)}
                id="btn-register-day"
              >
                Registrar
              </Button>
              <button className={styles.closePanelBtn} onClick={() => setSelectedDate(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Contenido del panel */}
          {isLoadingDay ? (
            <div className={styles.dayLoading}><Spinner size="sm" /></div>
          ) : dayDetails && hasAnyRecord(dayDetails, activeMedications, activeInsulinTypes) ? (
            <div className={styles.dayRecords}>

              {/* ── Glucosa ── */}
              {dayDetails.glucose.length > 0 && (
                <div className={styles.recordSection}>
                  <div className={styles.recordSectionHeader}>
                    <Droplets size={15} style={{ color: '#22c55e' }} />
                    <span>Glucosa</span>
                    <span className={styles.recordCount}>{dayDetails.glucose.length}</span>
                  </div>
                  {dayDetails.glucose.map(r => (
                    <div key={r.id} className={styles.recordItem}>
                      <div className={styles.recordLeft}>
                        <span className={styles.recordTime}>{r.readingTime}</span>
                        <span className={styles.recordValue} style={{ color: getGlucoseStatusColor(r.status) }}>
                          {formatGlucose(r.value, unit)} {unit}
                        </span>
                        <span className={styles.recordSub}>{GLUCOSE_STATUS_LABELS[r.status as keyof typeof GLUCOSE_STATUS_LABELS] ?? r.status}</span>
                      </div>
                      <div className={styles.recordBtns}>
                        <button className={styles.editBtn} onClick={() => navigate(`/glucosa/editar/${r.id}`)} aria-label="Editar">
                          <Pencil size={14} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ type: 'glucose', id: r.id })} aria-label="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Insulina ── */}
              {(activeInsulinTypes.length > 0 || dayDetails.insulin.length > 0) && (
                <div className={styles.recordSection}>
                  <div className={styles.recordSectionHeader}>
                    <Syringe size={15} style={{ color: '#8b5cf6' }} />
                    <span>Insulina</span>
                  </div>

                  {/* Lista de insulina registrada */}
                  {dayDetails.insulin.length > 0 && (
                    <div className={styles.loggedInsulinList}>
                      {dayDetails.insulin.map(l => (
                        <div key={l.id} className={styles.recordItem}>
                          <div className={styles.recordLeft}>
                            <span className={styles.recordTime}>{l.time}</span>
                            <span className={styles.recordValue} style={{ color: '#8b5cf6' }}>{l.units} U</span>
                            {l.typeName && <span className={styles.recordSub}>{l.typeName}</span>}
                          </div>
                          <div className={styles.recordBtns}>
                            <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ type: 'insulin', id: l.id })} aria-label="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Panel de registro rápido para insulinas activas */}
                  {activeInsulinTypes.length > 0 && (
                    <div className={styles.insulinQuickLogSection}>
                      <p className={styles.quickLogTitle}>Registrar dosis rápida:</p>
                      <div className={styles.insulinQuickLogGrid}>
                        {activeInsulinTypes.map(t => {
                          const units = insulinUnits[t.id] ?? t.units;
                          const isCorr = (insulinDoseTypes[t.id] ?? 'daily') === 'correction';
                          const time = insulinTimes[t.id] ?? t.defaultTime ?? '08:00';
                          return (
                            <div key={t.id} className={styles.insulinQuickCard}>
                              <div className={styles.insulinQuickCardHeader}>
                                <div className={styles.insulinQuickInfo}>
                                  <span className={styles.insulinQuickName}>{t.name}</span>
                                  <span className={styles.insulinQuickType}>({INSULIN_TYPE_LABELS[t.type as keyof typeof INSULIN_TYPE_LABELS] ?? t.type})</span>
                                </div>
                                <div className={styles.insulinAdjuster}>
                                  <button
                                    type="button"
                                    className={styles.adjustBtn}
                                    onClick={() => adjustUnits(t.id, -0.5)}
                                    disabled={units <= 0.5}
                                  >
                                    -
                                  </button>
                                  <span className={styles.unitsValue}>{units} U</span>
                                  <button
                                    type="button"
                                    className={styles.adjustBtn}
                                    onClick={() => adjustUnits(t.id, 0.5)}
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className={styles.quickLogBtn}
                                  onClick={() => handleLogInsulin(t, units, isCorr, time)}
                                >
                                  Registrar
                                </button>
                              </div>

                              <div className={styles.insulinQuickCardBody}>
                                <div className={styles.doseTypeSelector}>
                                  <label className={styles.doseTypeOption}>
                                    <input
                                      type="radio"
                                      name={`dose-type-${t.id}`}
                                      value="daily"
                                      checked={!isCorr}
                                      onChange={() => {
                                        setInsulinDoseTypes(prev => ({ ...prev, [t.id]: 'daily' }));
                                        setInsulinTimes(prev => ({ ...prev, [t.id]: t.defaultTime || '08:00' }));
                                      }}
                                    />
                                    <span>Dosis del día</span>
                                  </label>
                                  <label className={styles.doseTypeOption}>
                                    <input
                                      type="radio"
                                      name={`dose-type-${t.id}`}
                                      value="correction"
                                      checked={isCorr}
                                      onChange={() => {
                                        setInsulinDoseTypes(prev => ({ ...prev, [t.id]: 'correction' }));
                                        setInsulinTimes(prev => ({ ...prev, [t.id]: nowTime() }));
                                      }}
                                    />
                                    <span>Dosis correctiva</span>
                                  </label>
                                </div>
                                <div className={styles.insulinTimeInputWrapper}>
                                  <span className={styles.timeInputLabel}>Hora:</span>
                                  <input
                                    type="time"
                                    className={styles.timeInput}
                                    value={time}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setInsulinTimes(prev => ({ ...prev, [t.id]: val }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Medicamentos ── */}
              {(activeMedications.length > 0 || dayDetails.medications.length > 0) && (
                <div className={styles.recordSection}>
                  <div className={styles.recordSectionHeader}>
                    <Pill size={15} style={{ color: '#3b82f6' }} />
                    <span>Medicamentos</span>
                  </div>

                  {activeMedications.length > 0 ? (
                    <div className={styles.medList}>
                      {activeMedications.map(med => {
                        const medLogs = dayDetails.medications.filter(
                          l => l.medicationId === med.id
                        );

                        return (
                          <div key={med.id} className={styles.medCardCompact}>
                            <div className={styles.medHeaderCompact}>
                              <div className={styles.medInfoCompact}>
                                <div
                                  className={styles.medColorDotCompact}
                                  style={{ background: med.color ?? '#3b82f6' }}
                                />
                                <div>
                                  <h4 className={styles.medNameCompact}>{med.name}</h4>
                                  <span className={styles.medDetailsTextCompact}>
                                    {med.dosage} · {med.form}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className={styles.doseListCompact}>
                              {med.scheduledTimes.map(time => {
                                const log = medLogs.find(l => l.time === time);
                                const taken = log?.taken ?? false;

                                return (
                                  <button
                                    key={time}
                                    className={`${styles.doseBtnCompact} ${taken ? styles.doseTakenCompact : ''}`}
                                    onClick={() => handleTakeMedication(med, time, !taken)}
                                    aria-label={`${taken ? 'Desmarcar' : 'Marcar'} dosis de ${time}`}
                                  >
                                    {taken ? <Check size={14} /> : <Clock size={14} />}
                                    <span>{time}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Tomas de medicamentos inactivos/históricos */}
                  {(() => {
                    const inactiveLogs = dayDetails.medications.filter(
                      l => !activeMedications.some(med => med.id === l.medicationId)
                    );
                    if (inactiveLogs.length === 0) return null;

                    return (
                      <div className={styles.inactiveLogsSection}>
                        <p className={styles.inactiveLogsTitle}>Otros registros de tomas:</p>
                        {inactiveLogs.map(m => (
                          <div key={m.id} className={styles.recordItem}>
                            <div className={styles.recordLeft}>
                              <span className={styles.recordTime}>{m.time}</span>
                              <span className={styles.recordValue} style={{ color: m.taken ? '#22c55e' : '#ef4444' }}>
                                {m.taken ? '✓ Tomado' : '✗ No tomado'}
                              </span>
                              <span className={styles.recordSub}>{m.name}{m.dose ? ` · ${m.dose}` : ''} (Inactivo)</span>
                            </div>
                            <div className={styles.recordBtns}>
                              <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ type: 'medication', id: m.id })} aria-label="Eliminar">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Peso ── */}
              <div className={styles.recordSection}>
                <div className={styles.recordSectionHeader}>
                  <Scale size={15} style={{ color: '#f59e0b' }} />
                  <span>Peso</span>
                </div>
                {dayDetails.weight.length > 0 ? (
                  dayDetails.weight.map(w => (
                    <div key={w.id} className={styles.recordItem}>
                      <div className={styles.recordLeft}>
                        <span className={styles.recordValue} style={{ color: '#f59e0b' }}>
                          {w.weight.toFixed(1)} kg
                        </span>
                        <span className={styles.recordSub}>IMC: {w.bmi.toFixed(1)} · {BMI_CATEGORIES[w.bmiCategory as keyof typeof BMI_CATEGORIES]?.label ?? w.bmiCategory}</span>
                      </div>
                      <div className={styles.recordBtns}>
                        <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ type: 'weight', id: w.id })} aria-label="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <button
                    className={styles.quickAddBtn}
                    onClick={() => navigate(`/peso?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                  >
                    + Registrar peso
                  </button>
                )}
              </div>

              {/* ── Presión arterial ── */}
              <div className={styles.recordSection}>
                <div className={styles.recordSectionHeader}>
                  <Heart size={15} style={{ color: '#ef4444' }} />
                  <span>Presión arterial</span>
                  {dayDetails.bloodPressure.length > 0 && (
                    <span className={styles.recordCount}>{dayDetails.bloodPressure.length}</span>
                  )}
                </div>
                {dayDetails.bloodPressure.length > 0 ? (
                  dayDetails.bloodPressure.map(b => (
                    <div key={b.id} className={styles.recordItem}>
                      <div className={styles.recordLeft}>
                        <span className={styles.recordTime}>{b.logTime}</span>
                        <span className={styles.recordValue} style={{ color: '#ef4444' }}>
                          {b.systolic}/{b.diastolic} mmHg{b.pulse ? ` · ${b.pulse} bpm` : ''}
                        </span>
                        <span className={styles.recordSub}>{BLOOD_PRESSURE_CATEGORIES[b.category as keyof typeof BLOOD_PRESSURE_CATEGORIES]?.label ?? b.category}</span>
                      </div>
                      <div className={styles.recordBtns}>
                        <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ type: 'bp', id: b.id })} aria-label="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <button
                    className={styles.quickAddBtn}
                    onClick={() => navigate(`/presion?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                  >
                    + Registrar presión arterial
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Sin registros ese día */
            <div className={styles.noRecords}>
              <CalendarDays size={36} className={styles.noRecordsIcon} />
              <p>Sin registros para este día</p>
              <button className={styles.noRecordsAction} onClick={() => setShowModuleSelector(true)}>
                <Plus size={14} /> Registrar ahora
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Selector de módulo ──────────────────────────────────────────── */}
      {showModuleSelector && (
        <div className={styles.modalOverlay} onClick={() => setShowModuleSelector(false)}>
          <div className={styles.moduleModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>¿Qué deseas registrar?</h3>
                {selectedDate && (
                  <p className={styles.modalDate}>{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</p>
                )}
              </div>
              <button className={styles.modalClose} onClick={() => setShowModuleSelector(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className={styles.moduleList}>
              {REGISTER_MODULES.map(mod => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.key}
                    className={styles.moduleItem}
                    onClick={() => handleRegisterModule(mod.path)}
                  >
                    <span className={styles.moduleIcon} style={{ background: `${mod.color}20`, color: mod.color }}>
                      <Icon size={20} />
                    </span>
                    <span className={styles.moduleLabel}>{mod.label}</span>
                    <Chevron size={16} className={styles.moduleChevron} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de eliminación ──────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar registro"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

// ─── Helper ──────────────────────────────────────────────────────────────────────

function hasAnyRecord(d: DayDetails, activeMeds: Medication[], activeInsulins: InsulinTypeRecord[]): boolean {
  return d.glucose.length > 0 || d.insulin.length > 0 || d.medications.length > 0 || d.weight.length > 0 || d.bloodPressure.length > 0 || activeMeds.length > 0 || activeInsulins.length > 0;
}
