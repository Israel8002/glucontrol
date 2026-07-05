import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { weightRepository } from '@/repositories/healthRepository';
import { patientRepository } from '@/repositories/settingsRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import type { WeightLog } from '@/entities';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { Badge } from '@/components/ui/Badge/Badge';
import { BMI_CATEGORIES } from '@/core/constants';
import { formatDisplayDate } from '@/utils/date';
import { kgToLb } from '@/utils/health';
import { format, parseISO } from 'date-fns';
import styles from './WeightPage.module.css';

export const WeightPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState(170);
  
  const unit = settings?.weightUnit ?? 'kg';
  const [weight, setWeight] = useState(unit === 'kg' ? 70 : 154);
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try {
      const [ls, patient] = await Promise.all([
        weightRepository.getAll(),
        patientRepository.get(),
      ]);
      setLogs(ls);
      if (patient?.height) setHeightCm(patient.height);
    } catch { toastError('Error al cargar registros'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await weightRepository.create({
        weight,
        unit,
        heightCm,
        logDate: dateParam || undefined,
      });
      await load();
      setShowForm(false);
      success('Peso registrado');
      if (dateParam) {
        navigate(`/calendario?date=${dateParam}`);
      }
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await weightRepository.delete(deleteId);
      setLogs(prev => prev.filter(l => l.id !== deleteId));
      success('Registro eliminado');
    } catch { toastError('Error al eliminar'); }
    finally { setDeleteId(null); }
  };
  
  const latest = logs[0];
  const chartData = logs.slice().reverse().map(l => ({
    date: l.logDate,
    peso: unit === 'kg' ? parseFloat(l.weight.toFixed(1)) : parseFloat(kgToLb(l.weight).toFixed(1)),
    bmi: l.bmi,
  }));
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Scale size={24} className={styles.headerIcon} /><h1>Peso e IMC</h1></div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setShowForm(true)} id="btn-add-weight">Registrar</Button>
      </div>
      
      {latest && (
        <Card className={styles.latestCard} glow="green">
          <div className={styles.latestMain}>
            <span className={styles.latestValue}>
              {unit === 'kg' ? latest.weight.toFixed(1) : kgToLb(latest.weight).toFixed(1)}
            </span>
            <span className={styles.latestUnit}>{unit}</span>
          </div>
          <div className={styles.latestMeta}>
            <div className={styles.bmiInfo}>
              <span className={styles.bmiValue}>IMC: {latest.bmi.toFixed(1)}</span>
              <Badge variant={latest.bmiCategory === 'normal' ? 'success' : latest.bmiCategory === 'underweight' ? 'warning' : 'danger'}>
                {BMI_CATEGORIES[latest.bmiCategory]?.label}
              </Badge>
            </div>
            <span className={styles.latestDate}>{formatDisplayDate(latest.logDate)}</span>
          </div>
        </Card>
      )}
      
      {logs.length > 1 && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Evolución del peso</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => [`${v} ${unit}`, 'Peso']} contentStyle={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13 }} />
              <Area type="monotone" dataKey="peso" stroke="#22c55e" strokeWidth={2} fill="url(#weightGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
      
      {logs.length === 0 ? (
        <EmptyState icon={<Scale size={56} />} title="Sin registros de peso" description="Registra tu peso para ver la evolución y el IMC" actionLabel="Registrar peso" onAction={() => setShowForm(true)} />
      ) : (
        <div className={styles.logList}>
          {logs.map(log => (
            <Card key={log.id} className={styles.logCard} padding="sm">
              <div className={styles.logInfo}>
                <span className={styles.logWeight}>{unit === 'kg' ? log.weight.toFixed(1) : kgToLb(log.weight).toFixed(1)} {unit}</span>
                <div>
                  <span className={styles.logBmi}>IMC: {log.bmi.toFixed(1)} · {BMI_CATEGORIES[log.bmiCategory]?.label}</span>
                  <span className={styles.logDate}>{formatDisplayDate(log.logDate)} {log.logTime}</span>
                </div>
              </div>
              <button className={styles.deleteBtn} onClick={() => setDeleteId(log.id)} aria-label="Eliminar">
                <Trash2 size={15} />
              </button>
            </Card>
          ))}
        </div>
      )}
      
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar peso" id="weight-form-modal">
        <div className={styles.form}>
          <NumberInput label={`Peso (${unit})`} value={weight} onChange={setWeight} min={20} max={500} step={unit === 'kg' ? 0.1 : 0.2} decimals={1} unit={unit} large />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar registro" message="¿Eliminar este registro de peso?" confirmLabel="Eliminar" />
    </div>
  );
};
