import React, { useState, useEffect } from 'react';
import { Plus, Dumbbell, Trash2, Flame } from 'lucide-react';
import { exerciseRepository } from '@/repositories/healthAdapters';
import type { ExerciseLog } from '@/entities';
import type { ExerciseType, ExerciseIntensity } from '@/types';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Select } from '@/components/ui/Select/Select';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Badge } from '@/components/ui/Badge/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { EXERCISE_TYPE_LABELS, EXERCISE_INTENSITY_LABELS } from '@/core/constants';
import { formatDisplayDate } from '@/utils/date';
import styles from './ExercisePage.module.css';

const TYPE_OPTIONS = Object.entries(EXERCISE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const INTENSITY_OPTIONS = Object.entries(EXERCISE_INTENSITY_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const ExercisePage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('aerobic');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try { setLogs(await exerciseRepository.getAll()); }
    catch { toastError('Error al cargar registros'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const handleSave = async () => {
    if (!exerciseName.trim()) { toastError('El nombre del ejercicio es requerido'); return; }
    setIsSaving(true);
    try {
      await exerciseRepository.create({
        name: exerciseName.trim(), type: exerciseType,
        duration, intensity, caloriesBurned: caloriesBurned || undefined,
        notes: notes.trim() || undefined,
      });
      await load();
      setShowForm(false);
      setExerciseName(''); setDuration(30); setCaloriesBurned(0); setNotes('');
      success(`${exerciseName} registrado (${duration} min)`);
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await exerciseRepository.delete(deleteId); setLogs(prev => prev.filter(l => l.id !== deleteId)); success('Eliminado'); }
    catch { toastError('Error al eliminar'); }
    finally { setDeleteId(null); }
  };
  
  const grouped = logs.reduce<Record<string, ExerciseLog[]>>((acc, l) => {
    if (!acc[l.logDate]) acc[l.logDate] = [];
    acc[l.logDate].push(l);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  const getIntensityColor = (i: ExerciseIntensity): 'success' | 'warning' | 'danger' => {
    if (i === 'low') return 'success';
    if (i === 'moderate') return 'warning';
    return 'danger';
  };
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Dumbbell size={24} className={styles.headerIcon} /><h1>Ejercicio</h1></div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setShowForm(true)} id="btn-add-exercise">Registrar</Button>
      </div>
      
      {logs.length === 0 ? (
        <EmptyState icon={<Dumbbell size={56} />} title="Sin registros de ejercicio" description="Registra tu actividad física para llevar el control" actionLabel="Registrar ejercicio" onAction={() => setShowForm(true)} />
      ) : (
        <div className={styles.list}>
          {sortedDates.map(date => {
            const dayLogs = grouped[date];
            const totalMins = dayLogs.reduce((s, l) => s + l.duration, 0);
            const totalCals = dayLogs.reduce((s, l) => s + (l.caloriesBurned ?? 0), 0);
            return (
              <div key={date} className={styles.dateGroup}>
                <div className={styles.dateLabelRow}>
                  <span className={styles.dateLabel}>{formatDisplayDate(date)}</span>
                  <div className={styles.dateTotals}>
                    <Badge variant="muted">{totalMins} min</Badge>
                    {totalCals > 0 && <Badge variant="warning"><Flame size={10} style={{ marginRight: 2 }} />{totalCals} kcal</Badge>}
                  </div>
                </div>
                {dayLogs.map(log => (
                  <Card key={log.id} className={styles.logCard} padding="sm">
                    <div className={styles.logLeft}>
                      <div className={styles.logDuration}>
                        <span className={styles.durationNum}>{log.duration}</span>
                        <span className={styles.durationUnit}>min</span>
                      </div>
                      <div className={styles.logInfo}>
                        <span className={styles.exerciseName}>{log.name}</span>
                        <span className={styles.exerciseType}>{EXERCISE_TYPE_LABELS[log.type]}</span>
                        <div className={styles.badges}>
                          <Badge variant={getIntensityColor(log.intensity)}>{EXERCISE_INTENSITY_LABELS[log.intensity]}</Badge>
                          {log.caloriesBurned != null && <span className={styles.calories}><Flame size={12} />{log.caloriesBurned} kcal</span>}
                        </div>
                      </div>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => setDeleteId(log.id)} aria-label="Eliminar"><Trash2 size={15} /></button>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
      
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar ejercicio" id="exercise-modal">
        <div className={styles.form}>
          <Input label="Ejercicio *" placeholder="Ej: Caminata, Natación, Ciclismo" value={exerciseName} onChange={e => setExerciseName(e.target.value)} id="exercise-name" required />
          <Select label="Tipo" options={TYPE_OPTIONS} value={exerciseType} onChange={e => setExerciseType(e.target.value as ExerciseType)} id="exercise-type" />
          <Select label="Intensidad" options={INTENSITY_OPTIONS} value={intensity} onChange={e => setIntensity(e.target.value as ExerciseIntensity)} id="exercise-intensity" />
          <NumberInput label="Duración (min)" value={duration} onChange={setDuration} min={1} max={600} step={5} unit="min" large />
          <NumberInput label="Calorías quemadas (opcional)" value={caloriesBurned} onChange={setCaloriesBurned} min={0} max={9999} step={10} unit="kcal" />
          <Input label="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones" id="exercise-notes" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar registro" message="¿Eliminar este registro de ejercicio?" confirmLabel="Eliminar" />
    </div>
  );
};
