import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Droplets,
  Pill,
  Syringe,
  Scale,
  Heart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Bell,
  FileText,
  Smartphone,
} from 'lucide-react';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { weightRepository, bloodPressureRepository } from '@/repositories/healthRepository';
import { patientRepository } from '@/repositories/settingsRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { GlucoseValueDisplay } from '@/components/ui/GlucoseValueDisplay/GlucoseValueDisplay';
import { Badge } from '@/components/ui/Badge/Badge';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import type { GlucoseReading, WeightLog, BloodPressureLog, Patient } from '@/entities';
import { calculateGlucoseStatus } from '@/services/glucoseService';
import { formatDisplayDate, formatTime, today } from '@/utils/date';
import { formatGlucose } from '@/utils/glucose';
import { GLUCOSE_STATUS_LABELS, BLOOD_PRESSURE_CATEGORIES, BMI_CATEGORIES } from '@/core/constants';
import { GlucoseMiniChart } from '@/components/charts/GlucoseMiniChart';
import styles from './Dashboard.module.css';

/**
 * Dashboard principal – pantalla de inicio de GluControl.
 * Muestra resumen del día, última glucosa, tendencia y accesos rápidos.
 */
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { isInstallable, installApp } = usePWAInstall();
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  
  const [latestGlucose, setLatestGlucose] = useState<GlucoseReading | null>(null);
  const [todayReadings, setTodayReadings] = useState<GlucoseReading[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [latestBP, setLatestBP] = useState<BloodPressureLog | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [glucose, dayReadings, weight, bp, pt] = await Promise.all([
        glucoseRepository.getLatest(),
        glucoseRepository.getToday(),
        weightRepository.getLatest(),
        bloodPressureRepository.getLatest(),
        patientRepository.get(),
      ]);
      setLatestGlucose(glucose ?? null);
      setTodayReadings(dayReadings);
      setLatestWeight(weight ?? null);
      setLatestBP(bp ?? null);
      setPatient(pt);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
    // Recargar cada 30 segundos si la app está activa
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const greetingText = () => {
    const hour = new Date().getHours();
    const name = patient?.name ?? '';
    if (hour < 12) return `Buenos días${name ? `, ${name}` : ''}`;
    if (hour < 18) return `Buenas tardes${name ? `, ${name}` : ''}`;
    return `Buenas noches${name ? `, ${name}` : ''}`;
  };
  
  const unit = settings?.glucoseUnit ?? 'mg/dL';
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* Header de saludo */}
      <div className={styles.header}>
        <div>
          <p className={styles.date}>{formatDisplayDate(today())}</p>
          <h1 className={styles.greeting}>{greetingText()}</h1>
        </div>
        <button
          className={styles.notifBtn}
          onClick={() => navigate('/recordatorios')}
          aria-label="Recordatorios"
        >
          <Bell size={22} />
        </button>
      </div>
      
      {/* Banner de instalación de PWA */}
      {isInstallable && showPwaBanner && (
        <Card className={styles.pwaBanner} padding="sm">
          <div className={styles.pwaBannerContent}>
            <Smartphone size={24} className={styles.pwaIcon} />
            <div className={styles.pwaTextWrapper}>
              <strong className={styles.pwaTitle}>Instalar GluControl como App</strong>
              <p className={styles.pwaDesc}>Úsala sin internet, a pantalla completa y con acceso desde tu pantalla de inicio.</p>
            </div>
          </div>
          <div className={styles.pwaActions}>
            <button onClick={() => setShowPwaBanner(false)} className={styles.pwaDismissBtn}>
              Cerrar
            </button>
            <button onClick={installApp} className={styles.pwaInstallBtn}>
              Instalar
            </button>
          </div>
        </Card>
      )}
      
      {/* Tarjeta principal de glucosa */}
      <Card
        className={styles.glucoseCard}
        glow={latestGlucose ? getGlowFromStatus(latestGlucose.status) : 'none'}
        onClick={() => navigate('/glucosa')}
      >
        {latestGlucose ? (
          <>
            <div className={styles.glucoseHeader}>
              <div className={styles.glucoseLabel}>
                <Droplets size={16} className={styles.glucoseIcon} />
                <span>Última glucosa</span>
              </div>
              <span className={styles.glucoseTime}>
                {formatDisplayDate(latestGlucose.readingDate)} · {formatTime(latestGlucose.readingTime)}
              </span>
            </div>
            <div className={styles.glucoseMain}>
              <GlucoseValueDisplay
                value={latestGlucose.value}
                status={latestGlucose.status}
                unit={unit}
                size="xl"
                showStatus
              />
            </div>
            
            {/* Mini gráfica del día */}
            {todayReadings.length > 1 && (
              <div className={styles.miniChart}>
                <GlucoseMiniChart
                  readings={todayReadings}
                  targetMin={settings?.glucoseTargetMin ?? 80}
                  targetMax={settings?.glucoseTargetMax ?? 180}
                />
              </div>
            )}
            
            <div className={styles.glucoseFooter}>
              <span className={styles.readingsCount}>
                {todayReadings.length} medición{todayReadings.length !== 1 ? 'es' : ''} hoy
              </span>
              {latestGlucose.status === 'hypo' || latestGlucose.status === 'severe_hypo' ? (
                <Badge variant="danger">
                  <AlertTriangle size={10} style={{ marginRight: 4 }} />
                  Hipoglucemia
                </Badge>
              ) : latestGlucose.status === 'normal' ? (
                <Badge variant="success">
                  <CheckCircle2 size={10} style={{ marginRight: 4 }} />
                  En rango
                </Badge>
              ) : latestGlucose.status === 'hyper' || latestGlucose.status === 'severe_hyper' ? (
                <Badge variant="danger">
                  <AlertTriangle size={10} style={{ marginRight: 4 }} />
                  Hiperglucemia
                </Badge>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.noGlucose}>
            <Droplets size={40} className={styles.noGlucoseIcon} />
            <p>Sin registros de glucosa</p>
            <p className={styles.noGlucoseHint}>Toca para registrar tu primera lectura</p>
          </div>
        )}
      </Card>
      
      {/* Botón de registro rápido */}
      <Button
        variant="primary"
        size="xl"
        fullWidth
        leftIcon={<Plus size={22} />}
        onClick={() => navigate('/glucosa/nueva')}
        id="btn-quick-glucose"
      >
        Registrar Glucosa
      </Button>
      
      {/* Accesos rápidos a otros módulos */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Acceso rápido</h2>
        <div className={styles.quickAccessContainer}>
          <div className={styles.quickAccessRow}>
            <QuickActionCard
              icon={<Pill size={22} />}
              label="Medicamentos"
              onClick={() => navigate('/medicamentos')}
              id="quick-medications"
            />
            <QuickActionCard
              icon={<Syringe size={22} />}
              label="Insulina"
              onClick={() => navigate('/insulina')}
              id="quick-insulin"
            />
            <QuickActionCard
              icon={<Scale size={22} />}
              label="Peso"
              onClick={() => navigate('/peso')}
              id="quick-weight"
            />
            <QuickActionCard
              icon={<Heart size={22} />}
              label="Presión"
              onClick={() => navigate('/presion')}
              id="quick-bp"
            />
          </div>
          <div className={`${styles.quickAccessRow} ${styles.quickAccessRowCentered}`}>
            <QuickActionCard
              icon={<TrendingUp size={22} />}
              label="Estadísticas"
              onClick={() => navigate('/estadisticas')}
              id="quick-stats"
            />
            <QuickActionCard
              icon={<CalendarDays size={22} />}
              label="Calendario"
              onClick={() => navigate('/calendario')}
              id="quick-calendar"
            />
            <QuickActionCard
              icon={<FileText size={22} />}
              label="Reportes"
              onClick={() => navigate('/reportes')}
              id="quick-reports"
            />
          </div>
        </div>
      </div>
      
      {/* Resumen de otros indicadores */}
      {(latestWeight || latestBP) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Últimas mediciones</h2>
          <div className={styles.summaryCards}>
            {latestWeight && (
              <Card className={styles.summaryCard} onClick={() => navigate('/peso')}>
                <div className={styles.summaryIcon}><Scale size={18} /></div>
                <div className={styles.summaryData}>
                  <span className={styles.summaryValue}>
                    {unit === 'mg/dL'
                      ? `${latestWeight.weight.toFixed(1)} kg`
                      : `${(latestWeight.weight * 2.20462).toFixed(1)} lb`}
                  </span>
                  <span className={styles.summaryLabel}>
                    IMC: {latestWeight.bmi.toFixed(1)} · {BMI_CATEGORIES[latestWeight.bmiCategory]?.label}
                  </span>
                  <span className={styles.summaryDate}>{formatDisplayDate(latestWeight.logDate)}</span>
                </div>
              </Card>
            )}
            {latestBP && (
              <Card className={styles.summaryCard} onClick={() => navigate('/presion')}>
                <div className={styles.summaryIcon}><Heart size={18} /></div>
                <div className={styles.summaryData}>
                  <span className={styles.summaryValue}>
                    {latestBP.systolic}/{latestBP.diastolic}
                    {latestBP.pulse ? ` · ${latestBP.pulse}bpm` : ''}
                  </span>
                  <span className={styles.summaryLabel}>
                    {BLOOD_PRESSURE_CATEGORIES[latestBP.category]?.label}
                  </span>
                  <span className={styles.summaryDate}>{formatDisplayDate(latestBP.logDate)}</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Componente auxiliar ───────────────────────────────────────────────────────

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  id: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, label, onClick, id }) => (
  <button id={id} className={styles.quickCard} onClick={onClick}>
    <span className={styles.quickIcon}>{icon}</span>
    <span className={styles.quickLabel}>{label}</span>
  </button>
);

function getGlowFromStatus(status: string): 'green' | 'red' | 'yellow' | 'none' {
  if (status === 'normal') return 'green';
  if (status === 'hypo' || status === 'severe_hypo' || status === 'hyper' || status === 'severe_hyper') return 'red';
  if (status === 'low' || status === 'high') return 'yellow';
  return 'none';
}

