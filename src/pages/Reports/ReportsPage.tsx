import React, { useState, useEffect } from 'react';
import { FileText, Printer, CheckSquare, Square, Calendar } from 'lucide-react';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { medicationRepository } from '@/repositories/medicationRepository';
import { insulinRepository } from '@/repositories/insulinRepository';
import { weightRepository, bloodPressureRepository } from '@/repositories/healthRepository';
import { patientRepository } from '@/repositories/settingsRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { formatDisplayDate } from '@/utils/date';
import { formatGlucose } from '@/utils/glucose';
import { calculateAge } from '@/utils/health';
import type { Patient, GlucoseReading, WeightLog, BloodPressureLog, MedicationLog, InsulinLog } from '@/entities';
import { GLUCOSE_STATUS_LABELS, BLOOD_PRESSURE_CATEGORIES, INSULIN_SITE_LABELS, BMI_CATEGORIES } from '@/core/constants';
import { subDays, parseISO, startOfDay } from 'date-fns';
import styles from './ReportsPage.module.css';

interface ModuleSelection {
  glucose: boolean;
  pressure: boolean;
  medication: boolean;
  insulin: boolean;
  weight: boolean;
}

const MEDICATION_FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez al día',
  twice: 'Dos veces al día',
  three: 'Tres veces al día',
  four: 'Cuatro veces al día',
  custom: 'Personalizado',
  every_6h: 'Cada 6 horas',
  every_8h: 'Cada 8 horas',
  every_12h: 'Cada 12 horas',
  every_24h: 'Cada 24 horas',
};

export const ReportsPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const { error: toastError } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtros
  const [selectedModules, setSelectedModules] = useState<ModuleSelection>({
    glucose: true,
    pressure: true,
    medication: true,
    insulin: true,
    weight: true,
  });
  const [dateRange, setDateRange] = useState<string>('30'); // '7', '30', '90', 'all'

  // Datos recuperados
  const [glucoseData, setGlucoseData] = useState<GlucoseReading[]>([]);
  const [medicationData, setMedicationData] = useState<MedicationLog[]>([]);
  const [insulinData, setInsulinData] = useState<InsulinLog[]>([]);
  const [weightData, setWeightData] = useState<WeightLog[]>([]);
  const [bpData, setBpData] = useState<BloodPressureLog[]>([]);
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [insulinTypesList, setInsulinTypesList] = useState<any[]>([]);

  const loadPatient = async () => {
    try {
      const p = await patientRepository.get();
      setPatient(p);
    } catch {
      toastError('Error al obtener datos del paciente');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [g, mLogs, iLogs, wLogs, bpLogs, meds, insTypes] = await Promise.all([
        glucoseRepository.getAll(),
        medicationRepository.getAllLogs(),
        insulinRepository.getAllLogs(),
        weightRepository.getAll(),
        bloodPressureRepository.getAll(),
        medicationRepository.getAllMedications(),
        insulinRepository.getAllTypes(),
      ]);

      setGlucoseData(g);
      setMedicationData(mLogs);
      setInsulinData(iLogs);
      setWeightData(wLogs);
      setBpData(bpLogs);
      setMedicationsList(meds);
      setInsulinTypesList(insTypes);
    } catch {
      toastError('Error al cargar historial clínico');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
    loadData();
  }, []);

  // Filtrar registros según rango
  const filterByDate = (dateStr: string) => {
    if (dateRange === 'all') return true;
    const logDate = parseISO(dateStr);
    const rangeLimit = subDays(new Date(), parseInt(dateRange));
    return logDate >= startOfDay(rangeLimit);
  };

  const filteredGlucose = glucoseData.filter(r => filterByDate(r.readingDate));
  const filteredBP = bpData.filter(r => filterByDate(r.logDate));
  const filteredInsulin = insulinData.filter(r => filterByDate(r.logDate));
  const filteredWeight = weightData.filter(r => filterByDate(r.logDate));
  const filteredMeds = medicationData.filter(r => filterByDate(r.logDate));

  const toggleModule = (module: keyof ModuleSelection) => {
    setSelectedModules(prev => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const handlePrint = () => {
    setIsGenerating(true);
    const originalTitle = document.title;
    
    // Formatear fecha actual como DDMMYYYY (ej: 04072026)
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}${month}${year}`;
    
    document.title = `Glucontrol_${formattedDate}`;

    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setIsGenerating(false);
    }, 500);
  };

  const printDateTime = new Date().toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const latestWeightRecord = weightData[0];
  const latestWeightStr = latestWeightRecord 
    ? `${latestWeightRecord.weight.toFixed(1)} ${settings?.weightUnit ?? 'kg'}` 
    : 'Sin registrar';

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  const hasSelectedData = 
    (selectedModules.glucose && filteredGlucose.length > 0) ||
    (selectedModules.pressure && filteredBP.length > 0) ||
    (selectedModules.medication && filteredMeds.length > 0) ||
    (selectedModules.insulin && filteredInsulin.length > 0) ||
    (selectedModules.weight && filteredWeight.length > 0);

  // Helper para dividir arreglos en trozos de tamaño específico
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  return (
    <div className={styles.container}>
      {/* Cabecera */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FileText size={24} className={styles.headerIcon} />
          <h1>Reportes médicos</h1>
        </div>
      </div>

      {/* Controles de Configuración de Reporte */}
      <Card className={styles.configCard}>
        <h2 className={styles.cardTitle}>Opciones del reporte</h2>
        
        {/* Checkboxes de módulos */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Contenido del reporte:</label>
          <div className={styles.checkboxGrid}>
            <button 
              type="button" 
              className={`${styles.checkItem} ${selectedModules.glucose ? styles.checked : ''}`} 
              onClick={() => toggleModule('glucose')}
            >
              {selectedModules.glucose ? <CheckSquare size={20} /> : <Square size={20} />}
              <span>Glucosa</span>
            </button>
            <button 
              type="button" 
              className={`${styles.checkItem} ${selectedModules.pressure ? styles.checked : ''}`} 
              onClick={() => toggleModule('pressure')}
            >
              {selectedModules.pressure ? <CheckSquare size={20} /> : <Square size={20} />}
              <span>Presión Arterial</span>
            </button>
            <button 
              type="button" 
              className={`${styles.checkItem} ${selectedModules.medication ? styles.checked : ''}`} 
              onClick={() => toggleModule('medication')}
            >
              {selectedModules.medication ? <CheckSquare size={20} /> : <Square size={20} />}
              <span>Medicamentos</span>
            </button>
            <button 
              type="button" 
              className={`${styles.checkItem} ${selectedModules.insulin ? styles.checked : ''}`} 
              onClick={() => toggleModule('insulin')}
            >
              {selectedModules.insulin ? <CheckSquare size={20} /> : <Square size={20} />}
              <span>Insulina</span>
            </button>
            <button 
              type="button" 
              className={`${styles.checkItem} ${selectedModules.weight ? styles.checked : ''}`} 
              onClick={() => toggleModule('weight')}
            >
              {selectedModules.weight ? <CheckSquare size={20} /> : <Square size={20} />}
              <span>Peso</span>
            </button>
          </div>
        </div>

        {/* Filtro de Fechas */}
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="report-range-select">Rango de fechas:</label>
          <div className={styles.selectWrapper}>
            <Calendar size={18} className={styles.selectIcon} />
            <select 
              id="report-range-select"
              className={styles.select} 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="all">Historial completo</option>
            </select>
          </div>
        </div>

        {/* Botón Imprimir */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Printer size={20} />}
          onClick={handlePrint}
          loading={isGenerating}
          disabled={!hasSelectedData}
          id="btn-print-report"
        >
          Generar e imprimir reporte
        </Button>
      </Card>

      {/* ─── VISTA PREVIA IMPRIMIBLE ─────────────────────────────────────── */}
      <div className={styles.printArea}>
        {/* Cabecera del Reporte para Impresión */}
        <div className={styles.printHeader}>
          <div className={styles.brandTitle}>
            <h2>Reporte Clínico — GluControl</h2>
            <p>Monitoreo Clínico Personal</p>
          </div>
          <div className={styles.printMeta}>
            <p><strong>Fecha/Hora impresión:</strong> {printDateTime}</p>
          </div>
        </div>

        {/* Datos del Paciente */}
        <div className={styles.patientInfoBlock}>
          <h3>Datos del Paciente</h3>
          <div className={styles.patientGrid}>
            <div><strong>Paciente:</strong> {patient ? `${patient.name} ${patient.lastName}` : 'No especificado'}</div>
            <div><strong>Edad:</strong> {patient?.birthDate ? `${calculateAge(patient.birthDate)} años` : '—'}</div>
            <div><strong>Tipo de Diabetes:</strong> {patient?.diabetesType ? (patient.diabetesType === 'type1' ? 'Tipo 1' : patient.diabetesType === 'type2' ? 'Tipo 2' : patient.diabetesType === 'gestational' ? 'Gestacional' : 'LADA/Otro') : '—'}</div>
            <div><strong>Altura:</strong> {patient?.height ? `${patient.height} cm` : '—'}</div>
            <div><strong>Grupo Sanguíneo:</strong> {patient?.bloodType ?? '—'}</div>
            <div><strong>Médico Tratante:</strong> {patient?.doctorName ?? '—'}</div>
            <div><strong>Último Peso Registrado:</strong> {latestWeightStr}</div>
          </div>
        </div>

        {/* Catálogo de Medicamentos e Insulinas (Tratamiento Actual) */}
        {(medicationsList.length > 0 || insulinTypesList.length > 0) && (
          <div className={styles.patientInfoBlock}>
            <h3>Tratamiento Actual</h3>
            
            {medicationsList.length > 0 && (
              <div className={styles.medicationSubList} style={{ marginBottom: insulinTypesList.length > 0 ? '12px' : '0' }}>
                <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#000000', display: 'block', marginBottom: '6px' }}>
                  Medicamentos Recetados:
                </strong>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.5' }}>
                  {medicationsList.map(m => (
                    <li key={m.id}>
                      <strong>{m.name}</strong> {m.genericName ? `(${m.genericName})` : ''} — {m.dosage} ({m.form ? m.form.toLowerCase() : ''}) · Frecuencia: {MEDICATION_FREQUENCY_LABELS[m.frequency] || m.frequency} {m.scheduledTimes && m.scheduledTimes.length > 0 ? `[Horarios: ${m.scheduledTimes.join(', ')}]` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insulinTypesList.length > 0 && (
              <div className={styles.insulinSubList}>
                <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#000000', display: 'block', marginBottom: '6px' }}>
                  Esquemas de Insulina Activos:
                </strong>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.5' }}>
                  {insulinTypesList.map(i => (
                    <li key={i.id}>
                      <strong>{i.name}</strong> ({i.type === 'fast' ? 'Acción Rápida' : i.type === 'slow' ? 'Acción Lenta' : i.type === 'premix' ? 'Premezclada' : 'Otro'}) — Dosis habitual: {i.units} U {i.notes ? `· Notas: ${i.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!hasSelectedData && (
          <div className={styles.noPrintData}>
            No hay registros disponibles para el rango y módulos seleccionados.
          </div>
        )}

        {/* ── Tabla de Glucosa ── */}
        {selectedModules.glucose && filteredGlucose.length > 0 && (
          <div className={styles.tableSection}>
            {chunkArray(filteredGlucose, 50).map((chunk, index, all) => (
              <div key={index} className={styles.printPageBreak}>
                <h3 className={styles.tableTitle}>
                  Registros de Glucosa {all.length > 1 ? `(Parte ${index + 1} de ${all.length})` : ''}
                </h3>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Valor</th>
                      <th>Momento de la Medición</th>
                      <th>Clasificación</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(r => (
                      <tr key={r.id}>
                        <td className={styles.nowrap}>{formatDisplayDate(r.readingDate)} {r.readingTime}</td>
                        <td className={styles.bold}>{formatGlucose(r.value, settings?.glucoseUnit ?? 'mg/dL')} {settings?.glucoseUnit}</td>
                        <td>{r.context === 'fasting' ? 'Ayunas' : r.context === 'before_breakfast' ? 'Antes del desayuno' : r.context === 'after_breakfast' ? 'Después del desayuno' : r.context === 'before_lunch' ? 'Antes del almuerzo' : r.context === 'after_lunch' ? 'Después del almuerzo' : r.context === 'before_dinner' ? 'Antes de la cena' : r.context === 'after_dinner' ? 'Después de la cena' : r.context === 'before_sleep' ? 'Antes de dormir' : 'Casual / Aleatorio'}</td>
                        <td>
                          <span className={styles.statusBadge} style={{ color: getStatusColorHex(r.status) }}>
                            {GLUCOSE_STATUS_LABELS[r.status as keyof typeof GLUCOSE_STATUS_LABELS] ?? r.status}
                          </span>
                        </td>
                        <td>{r.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabla de Presión Arterial ── */}
        {selectedModules.pressure && filteredBP.length > 0 && (
          <div className={styles.tableSection}>
            {chunkArray(filteredBP, 50).map((chunk, index, all) => (
              <div key={index} className={styles.printPageBreak}>
                <h3 className={styles.tableTitle}>
                  Registros de Presión Arterial {all.length > 1 ? `(Parte ${index + 1} de ${all.length})` : ''}
                </h3>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Presión (mmHg)</th>
                      <th>Pulso</th>
                      <th>Posición / Brazo</th>
                      <th>Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(b => (
                      <tr key={b.id}>
                        <td className={styles.nowrap}>{formatDisplayDate(b.logDate)} {b.logTime}</td>
                        <td className={styles.bold}>{b.systolic}/{b.diastolic} mmHg</td>
                        <td>{b.pulse ? `${b.pulse} bpm` : '—'}</td>
                        <td>{b.position === 'sitting' ? 'Sentado' : b.position === 'standing' ? 'De pie' : 'Acostado'} · {b.arm === 'left' ? 'Izq' : 'Der'}</td>
                        <td>
                          <span className={styles.statusBadge} style={{ color: BLOOD_PRESSURE_CATEGORIES[b.category as keyof typeof BLOOD_PRESSURE_CATEGORIES]?.color }}>
                            {BLOOD_PRESSURE_CATEGORIES[b.category as keyof typeof BLOOD_PRESSURE_CATEGORIES]?.label ?? b.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabla de Insulina ── */}
        {selectedModules.insulin && filteredInsulin.length > 0 && (
          <div className={styles.tableSection}>
            {chunkArray(filteredInsulin, 50).map((chunk, index, all) => (
              <div key={index} className={styles.printPageBreak}>
                <h3 className={styles.tableTitle}>
                  Registros de Insulina {all.length > 1 ? `(Parte ${index + 1} de ${all.length})` : ''}
                </h3>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Dosis</th>
                      <th>Tipo de Insulina</th>
                      <th>Zona de Aplicación</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(i => (
                      <tr key={i.id}>
                        <td className={styles.nowrap}>{formatDisplayDate(i.logDate)} {i.logTime}</td>
                        <td className={styles.bold}>{i.units} U</td>
                        <td>{i.insulinTypeName ?? '—'}</td>
                        <td>{INSULIN_SITE_LABELS[i.site as keyof typeof INSULIN_SITE_LABELS] ?? i.site}</td>
                        <td>{i.correctionDose ? 'Dosis de corrección' : 'Dosis regular'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabla de Medicamentos ── */}
        {selectedModules.medication && filteredMeds.length > 0 && (
          <div className={styles.tableSection}>
            {chunkArray(filteredMeds, 50).map((chunk, index, all) => (
              <div key={index} className={styles.printPageBreak}>
                <h3 className={styles.tableTitle}>
                  Tomas de Medicamentos {all.length > 1 ? `(Parte ${index + 1} de ${all.length})` : ''}
                </h3>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Medicamento</th>
                      <th>Horario Programado</th>
                      <th>Estado</th>
                      <th>Hora de Toma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(m => {
                      const med = medicationsList.find(x => x.id === m.medicationId);
                      return (
                        <tr key={m.id}>
                          <td className={styles.nowrap}>{formatDisplayDate(m.logDate)}</td>
                          <td className={styles.bold}>{med?.name ?? m.medicationName ?? '—'} {med?.dosage && `(${med.dosage})`}</td>
                          <td>{m.scheduledTime}</td>
                          <td>{m.taken ? '✓ Tomado' : '✗ No tomado'}</td>
                          <td>{m.takenTime ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabla de Peso ── */}
        {selectedModules.weight && filteredWeight.length > 0 && (
          <div className={styles.tableSection}>
            {chunkArray(filteredWeight, 50).map((chunk, index, all) => (
              <div key={index} className={styles.printPageBreak}>
                <h3 className={styles.tableTitle}>
                  Registros de Peso e IMC {all.length > 1 ? `(Parte ${index + 1} de ${all.length})` : ''}
                </h3>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Peso</th>
                      <th>IMC</th>
                      <th>Clasificación IMC</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map(w => (
                      <tr key={w.id}>
                        <td className={styles.nowrap}>{formatDisplayDate(w.logDate)} {w.logTime}</td>
                        <td className={styles.bold}>{w.weight.toFixed(1)} kg</td>
                        <td>{w.bmi.toFixed(1)}</td>
                        <td>{BMI_CATEGORIES[w.bmiCategory as keyof typeof BMI_CATEGORIES]?.label ?? w.bmiCategory}</td>
                        <td>{w.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper para colores de Glucosa
function getStatusColorHex(status: string): string {
  switch (status) {
    case 'normal': return '#22c55e';
    case 'elevated': return '#f59e0b';
    case 'hypo': return '#f97316';
    case 'hyper': return '#ef4444';
    case 'severe_hypo': return '#b91c1c';
    case 'severe_hyper': return '#b91c1c';
    default: return '#9ca3af';
  }
}
