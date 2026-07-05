import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Heart, Trash2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { bloodPressureRepository } from '@/repositories/healthRepository';
import type { BloodPressureLog } from '@/entities';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Select } from '@/components/ui/Select/Select';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Badge } from '@/components/ui/Badge/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { Input } from '@/components/ui/Input/Input';
import { BLOOD_PRESSURE_CATEGORIES } from '@/core/constants';
import { formatDisplayDate } from '@/utils/date';
import { format, parseISO } from 'date-fns';
import styles from './BloodPressurePage.module.css';

const ARM_OPTIONS = [{ value: 'right', label: 'Brazo derecho' }, { value: 'left', label: 'Brazo izquierdo' }];
const POSITION_OPTIONS = [{ value: 'sitting', label: 'Sentado' }, { value: 'standing', label: 'De pie' }, { value: 'lying', label: 'Acostado' }];

export const BloodPressurePage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [logs, setLogs] = useState<BloodPressureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [pulse, setPulse] = useState(70);
  const [arm, setArm] = useState<'left' | 'right'>('right');
  const [position, setPosition] = useState<'sitting' | 'standing' | 'lying'>('sitting');
  const [logTime, setLogTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try { setLogs(await bloodPressureRepository.getAll()); }
    catch { toastError('Error al cargar registros'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await bloodPressureRepository.create({
        systolic,
        diastolic,
        pulse,
        arm,
        position,
        logTime,
        logDate: dateParam || undefined,
      });
      await load();
      setShowForm(false);
      success(`Presión registrada: ${systolic}/${diastolic}`);
      if (dateParam) {
        navigate(`/calendario?date=${dateParam}`);
      }
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await bloodPressureRepository.delete(deleteId); setLogs(prev => prev.filter(l => l.id !== deleteId)); success('Eliminado'); }
    catch { toastError('Error al eliminar'); }
    finally { setDeleteId(null); }
  };
  
  const latest = logs[0];
  const chartData = logs.slice().reverse().map(l => ({
    date: l.logDate, sistolica: l.systolic, diastolica: l.diastolic,
  }));
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Heart size={24} className={styles.headerIcon} /><h1>Presión arterial</h1></div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => { setShowForm(true); setLogTime(format(new Date(), 'HH:mm')); }} id="btn-add-bp">Registrar</Button>
      </div>
      
      {latest && (
        <Card className={styles.latestCard} glow={latest.category === 'normal' ? 'green' : latest.category === 'elevated' || latest.category === 'stage1' ? 'yellow' : 'red'}>
          <div className={styles.bpDisplay}>
            <div className={styles.bpValues}>
              <span className={styles.systolic}>{latest.systolic}</span>
              <span className={styles.bpSlash}>/</span>
              <span className={styles.diastolic}>{latest.diastolic}</span>
            </div>
            <span className={styles.bpUnit}>mmHg</span>
          </div>
          <div className={styles.bpMeta}>
            <Badge variant={latest.category === 'normal' ? 'success' : latest.category === 'crisis' ? 'danger' : 'warning'}>
              {BLOOD_PRESSURE_CATEGORIES[latest.category]?.label}
            </Badge>
            {latest.pulse && <span className={styles.pulse}>{latest.pulse} bpm</span>}
            <span className={styles.bpDate}>{formatDisplayDate(latest.logDate)} {latest.logTime}</span>
          </div>
        </Card>
      )}
      
      {logs.length > 1 && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Evolución</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={['auto', 'auto']} />
              <ReferenceLine y={120} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
              <ReferenceLine y={80} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ background: 'var(--color-bg-overlay)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13 }} />
              <Line type="monotone" dataKey="sistolica" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Sistólica" />
              <Line type="monotone" dataKey="diastolica" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Diastólica" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      
      {logs.length === 0 ? (
        <EmptyState icon={<Heart size={56} />} title="Sin registros" description="Registra tu presión arterial para ver la evolución" actionLabel="Registrar ahora" onAction={() => setShowForm(true)} />
      ) : (
        <div className={styles.logList}>
          {logs.map(log => (
            <Card key={log.id} className={styles.logCard} padding="sm">
              <div className={styles.logInfo}>
                <span className={styles.logBP}>{log.systolic}/{log.diastolic}</span>
                <div>
                  <span className={styles.logCategory}>{BLOOD_PRESSURE_CATEGORIES[log.category]?.label}</span>
                  <span className={styles.logMeta}>{log.pulse ? `${log.pulse} bpm · ` : ''}{formatDisplayDate(log.logDate)} {log.logTime}</span>
                </div>
              </div>
              <div className={styles.logRight}>
                <div className={styles.logDot} style={{ background: BLOOD_PRESSURE_CATEGORIES[log.category]?.color }} />
                <button className={styles.deleteBtn} onClick={() => setDeleteId(log.id)} aria-label="Eliminar"><Trash2 size={15} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar presión arterial" id="bp-form-modal">
        <div className={styles.form}>
          <NumberInput label="Sistólica (mmHg)" value={systolic} onChange={setSystolic} min={60} max={250} step={1} unit="mmHg" large />
          <NumberInput label="Diastólica (mmHg)" value={diastolic} onChange={setDiastolic} min={40} max={150} step={1} unit="mmHg" large />
          
          <Input label="Hora de la medición" type="time" value={logTime} onChange={e => setLogTime(e.target.value)} id="bp-time" />
          
          <NumberInput label="Pulso (opcional)" value={pulse} onChange={setPulse} min={30} max={250} step={1} unit="bpm" />
          <Select label="Brazo" options={ARM_OPTIONS} value={arm} onChange={e => setArm(e.target.value as 'left' | 'right')} id="bp-arm" />
          <Select label="Posición" options={POSITION_OPTIONS} value={position} onChange={e => setPosition(e.target.value as 'sitting' | 'standing' | 'lying')} id="bp-position" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>Registrar</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar registro" message="¿Eliminar este registro?" confirmLabel="Eliminar" />
    </div>
  );
};
