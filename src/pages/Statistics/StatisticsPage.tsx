import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Target, AlertTriangle, Activity } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { weightRepository, bloodPressureRepository } from '@/repositories/healthRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import type { GlucoseReading, WeightLog, BloodPressureLog } from '@/entities';
import type { StatsPeriod } from '@/types';
import { kgToLb } from '@/utils/health';
import { Card } from '@/components/ui/Card/Card';
import { Badge } from '@/components/ui/Badge/Badge';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { calculateGlucoseStats, readingsToChartPoints, formatGlucose } from '@/utils/glucose';
import { getDateRangeForPeriod, PERIOD_LABELS, formatDisplayDate } from '@/utils/date';
import { GLUCOSE_RANGES } from '@/core/constants';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './StatisticsPage.module.css';

const PERIODS: StatsPeriod[] = ['day', 'week', 'month', '3months', '6months', 'year', 'all'];

const TIR_COLORS = {
  severeHypo: '#dc2626',
  hypo: '#ef4444',
  inRange: '#22c55e',
  hyper: '#f59e0b',
  severeHyper: '#dc2626',
};

/**
 * Página de estadísticas completa con gráficas interactivas.
 */
export const StatisticsPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [bpLogs, setBpLogs] = useState<BloodPressureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>('all');
  
  const unit = settings?.glucoseUnit ?? 'mg/dL';
  const wUnit = settings?.weightUnit ?? 'kg';
  
  const thresholds = {
    targetMin: settings?.glucoseTargetMin ?? GLUCOSE_RANGES.DEFAULT_TARGET_MIN,
    targetMax: settings?.glucoseTargetMax ?? GLUCOSE_RANGES.DEFAULT_TARGET_MAX,
    hypoThreshold: settings?.glucoseHypoThreshold ?? GLUCOSE_RANGES.HYPO_MAX,
    hyperThreshold: settings?.glucoseHyperThreshold ?? GLUCOSE_RANGES.DEFAULT_TARGET_MAX,
    severeHypoThreshold: settings?.glucoseSevereHypoThreshold ?? GLUCOSE_RANGES.SEVERE_HYPO_MAX,
    severeHyperThreshold: settings?.glucoseSevereHyperThreshold ?? GLUCOSE_RANGES.SEVERE_HYPER_MIN,
  };
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForPeriod(period);
      const [glucoseData, weightData, bpData] = await Promise.all([
        glucoseRepository.getByDateRange(startDate, endDate),
        weightRepository.getByDateRange(startDate, endDate),
        bloodPressureRepository.getByDateRange(startDate, endDate),
      ]);
      setReadings(glucoseData);
      setWeightLogs(weightData);
      setBpLogs(bpData);
    } catch { } finally { setIsLoading(false); }
  };
  
  useEffect(() => { loadData(); }, [period]);
  
  const stats = useMemo(() =>
    calculateGlucoseStats(readings, thresholds, period),
    [readings, period]
  );
  
  const chartPoints = useMemo(() => readingsToChartPoints(readings), [readings]);

  const weightChartData = useMemo(() => {
    const sorted = [...weightLogs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    return sorted.map(l => ({
      date: l.logDate,
      peso: wUnit === 'kg' ? parseFloat(l.weight.toFixed(1)) : parseFloat(kgToLb(l.weight).toFixed(1)),
      bmi: l.bmi,
    }));
  }, [weightLogs, wUnit]);

  const bpChartData = useMemo(() => {
    const sorted = [...bpLogs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    return sorted.map(l => ({
      date: l.logDate,
      sistolica: l.systolic,
      diastolica: l.diastolic,
      pulso: l.pulse,
    }));
  }, [bpLogs]);
  
  // Datos para el gráfico de TIR (tiempo en rango)
  const tirData = [
    { name: 'Hipoglucemia severa', value: stats.timeInSevereHypo, color: TIR_COLORS.severeHypo },
    { name: 'Hipoglucemia', value: stats.timeInHypo, color: TIR_COLORS.hypo },
    { name: 'En rango', value: stats.timeInRange, color: TIR_COLORS.inRange },
    { name: 'Alta', value: stats.timeInHyper, color: TIR_COLORS.hyper },
    { name: 'Hiperglucemia severa', value: stats.timeInSevereHyper, color: TIR_COLORS.severeHyper },
  ].filter(d => d.value > 0);
  
  // Promedio por día de la semana
  const byDayData = (() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayMap: Record<number, number[]> = {};
    readings.forEach(r => {
      const day = new Date(r.readingDate + 'T12:00:00').getDay();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(r.value);
    });
    return days.map((name, i) => ({
      name,
      promedio: dayMap[i] ? Math.round(dayMap[i].reduce((a, b) => a + b, 0) / dayMap[i].length) : 0,
    })).filter(d => d.promedio > 0);
  })();
  
  const getStatusColor = (status: string) => {
    if (stats.estimatedHbA1c < 7) return 'success';
    if (stats.estimatedHbA1c < 8) return 'warning';
    return 'danger';
  };
  
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { value: number; time: string; date: string } }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipValue}>{formatGlucose(d.value, unit)} {unit}</div>
        <div className={styles.tooltipTime}>{d.date} {d.time}</div>
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <TrendingUp size={24} className={styles.headerIcon} />
          <h1>Estadísticas</h1>
        </div>
      </div>
      
      {/* Selector de período */}
      <div className={styles.periodSelector}>
        {PERIODS.map(p => (
          <button
            key={p}
            className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      
      {isLoading ? (
        <div className={styles.loading}><Spinner size="lg" /></div>
      ) : (readings.length === 0 && weightLogs.length === 0 && bpLogs.length === 0) ? (
        <div className={styles.empty}>
          <Activity size={48} className={styles.emptyIcon} />
          <p>Sin datos para el período seleccionado</p>
        </div>
      ) : (
        <>
          {/* Estadísticas de Glucosa */}
          {readings.length > 0 && (
            <>
              {/* KPIs principales */}
              <div className={styles.kpiGrid}>
                <Card className={styles.kpiCard} glow="green">
                  <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>
                    {formatGlucose(stats.average, unit)}
                  </div>
                  <div className={styles.kpiLabel}>Promedio {unit}</div>
                </Card>
                
                <Card className={styles.kpiCard} glow={stats.estimatedHbA1c < 7 ? 'green' : stats.estimatedHbA1c < 8 ? 'yellow' : 'red'}>
                  <div className={styles.kpiValue} style={{ color: stats.estimatedHbA1c < 7 ? 'var(--color-success)' : stats.estimatedHbA1c < 8 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {stats.estimatedHbA1c}%
                  </div>
                  <div className={styles.kpiLabel}>HbA1c estimada</div>
                </Card>
                
                <Card className={styles.kpiCard} glow={stats.timeInRange >= 70 ? 'green' : stats.timeInRange >= 50 ? 'yellow' : 'red'}>
                  <div className={styles.kpiValue} style={{ color: stats.timeInRange >= 70 ? 'var(--color-success)' : stats.timeInRange >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {stats.timeInRange}%
                  </div>
                  <div className={styles.kpiLabel}>Tiempo en rango</div>
                </Card>
                
                <Card className={styles.kpiCard}>
                  <div className={styles.kpiValue}>{stats.totalReadings}</div>
                  <div className={styles.kpiLabel}>Mediciones</div>
                </Card>
              </div>
              
              {/* Stats secundarias */}
              <Card className={styles.statsGrid}>
                <StatItem label="Mínimo" value={`${formatGlucose(stats.min, unit)} ${unit}`} color={stats.min < thresholds.hypoThreshold ? 'var(--color-danger)' : 'var(--color-success)'} />
                <StatItem label="Máximo" value={`${formatGlucose(stats.max, unit)} ${unit}`} color={stats.max > thresholds.hyperThreshold ? 'var(--color-danger)' : 'var(--color-text-primary)'} />
                <StatItem label="Desv. estándar" value={`${formatGlucose(stats.standardDeviation, unit)}`} />
                <StatItem label="Coef. variación" value={`${stats.coefficientOfVariation}%`} color={stats.coefficientOfVariation > 36 ? 'var(--color-danger)' : 'var(--color-success)'} />
                <StatItem label="Hipoglucemias" value={String(stats.hypoCount)} color={stats.hypoCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
                <StatItem label="Hiperglucemias" value={String(stats.hyperCount)} color={stats.hyperCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
              </Card>
              
              {/* Gráfica de línea principal */}
              <Card className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Evolución de glucosa</h3>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartPoints} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        tickFormatter={(val) => {
                          try { return format(parseISO(val), 'dd/MM', { locale: es }); }
                          catch { return val; }
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        domain={['auto', 'auto']}
                      />
                      <ReferenceLine y={thresholds.targetMin} stroke="rgba(34,197,94,0.4)" strokeDasharray="5 5" label={{ value: `${thresholds.targetMin}`, fill: 'rgba(34,197,94,0.6)', fontSize: 10 }} />
                      <ReferenceLine y={thresholds.targetMax} stroke="rgba(34,197,94,0.4)" strokeDasharray="5 5" label={{ value: `${thresholds.targetMax}`, fill: 'rgba(34,197,94,0.6)', fontSize: 10 }} />
                      <ReferenceLine y={thresholds.hypoThreshold} stroke="rgba(239,68,68,0.4)" strokeDasharray="3 3" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#glucoseGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#22c55e', stroke: 'var(--color-bg-base)', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              {/* Tiempo en rango (TIR) */}
              <Card className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Tiempo en rango (TIR)</h3>
                <div className={styles.tirContainer}>
                  <div className={styles.tirChart}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={tirData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {tirData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--color-success)" fontSize="22" fontWeight="700">
                          {stats.timeInRange}%
                        </text>
                        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fill="var(--color-text-muted)" fontSize="11">
                          en rango
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.tirLegend}>
                    {tirData.map((d, i) => (
                      <div key={i} className={styles.tirItem}>
                        <div className={styles.tirDot} style={{ background: d.color }} />
                        <div>
                          <div className={styles.tirName}>{d.name}</div>
                          <div className={styles.tirValue}>{d.value.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              
              {/* Promedio por día de la semana */}
              {byDayData.length > 0 && (
                <Card className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Promedio por día de la semana</h3>
                  <div className={styles.chartWrapper}>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={byDayData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                        <ReferenceLine y={thresholds.targetMin} stroke="rgba(34,197,94,0.4)" strokeDasharray="4 4" />
                        <ReferenceLine y={thresholds.targetMax} stroke="rgba(34,197,94,0.4)" strokeDasharray="4 4" />
                        <Tooltip
                          formatter={(v: number) => [`${v} ${unit}`, 'Promedio']}
                          contentStyle={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13 }}
                        />
                        <Bar dataKey="promedio" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Gráfica de evolución del Peso */}
          {weightChartData.length > 0 && (
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Evolución de peso ({wUnit})</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={weightChartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="weightGradStats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(v: number) => [`${v} ${wUnit}`, 'Peso']}
                      contentStyle={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13 }}
                    />
                    <Area type="monotone" dataKey="peso" stroke="#06b6d4" strokeWidth={2} fill="url(#weightGradStats)" dot={false} activeDot={{ r: 4, fill: '#06b6d4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Gráfica de evolución de la Presión arterial */}
          {bpChartData.length > 0 && (
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Evolución de presión arterial (mmHg)</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={bpChartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={['auto', 'auto']} />
                    <ReferenceLine y={120} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" />
                    <ReferenceLine y={80} stroke="rgba(59,130,246,0.3)" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13 }} />
                    <Line type="monotone" dataKey="sistolica" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Sistólica" />
                    <Line type="monotone" dataKey="diastolica" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Diastólica" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className={styles.statItem}>
    <span className={styles.statValue} style={color ? { color } : undefined}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
);
