import React, { useState, useEffect } from 'react';
import { Plus, Bell, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { reminderRepository } from '@/repositories/healthAdapters';
import type { Reminder } from '@/entities';
import type { ReminderType } from '@/types';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Switch } from '@/components/ui/Switch/Switch';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Badge } from '@/components/ui/Badge/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { REMINDER_TYPE_LABELS } from '@/core/constants';
import styles from './RemindersPage.module.css';

const TYPE_OPTIONS = Object.entries(REMINDER_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const DAY_OPTIONS = [
  { value: '0', label: 'Domingo' }, { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' }, { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' }, { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];
const REPEAT_OPTIONS = [
  { value: 'daily', label: 'Todos los días' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'once', label: 'Una sola vez' },
];

export const RemindersPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('glucose');
  const [time, setTime] = useState('08:00');
  const [repeatPattern, setRepeatPattern] = useState('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try {
      const allReminders = await reminderRepository.getAll();
      const sorted = [...allReminders].sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        
        return a.time.localeCompare(b.time);
      });
      setReminders(sorted);
    }
    catch { toastError('Error al cargar recordatorios'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const handleToggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };
  
  const handleSave = async () => {
    if (!title.trim()) { toastError('El título es requerido'); return; }
    if (selectedDays.length === 0) { toastError('Selecciona al menos un día'); return; }
    setIsSaving(true);
    try {
      await reminderRepository.create({
        title: title.trim(), type: reminderType, time,
        repeatPattern, days: selectedDays.sort(), isActive: true,
      });
      await load();
      setShowForm(false);
      setTitle(''); setTime('08:00'); setRepeatPattern('daily');
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      success('Recordatorio creado');
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleToggleActive = async (reminder: Reminder) => {
    try {
      await reminderRepository.update(reminder.id, { isActive: !reminder.isActive });
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, isActive: !r.isActive } : r));
    } catch { toastError('Error al actualizar'); }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await reminderRepository.delete(deleteId); setReminders(prev => prev.filter(r => r.id !== deleteId)); success('Eliminado'); }
    catch { toastError('Error al eliminar'); }
    finally { setDeleteId(null); }
  };
  
  const getDaysLabel = (days: number[]): string => {
    if (days.length === 7) return 'Todos los días';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Lun–Vie';
    return days.map(d => DAY_OPTIONS[d].label.slice(0, 3)).join(', ');
  };
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Bell size={24} className={styles.headerIcon} /><h1>Recordatorios</h1></div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setShowForm(true)} id="btn-add-reminder">Nuevo</Button>
      </div>
      
      {reminders.length === 0 ? (
        <EmptyState icon={<Bell size={56} />} title="Sin recordatorios" description="Crea recordatorios para no olvidar medirte la glucosa, tomar medicamentos o inyectarte insulina" actionLabel="Crear recordatorio" onAction={() => setShowForm(true)} />
      ) : (
        <div className={styles.list}>
          {reminders.map(reminder => (
            <Card key={reminder.id} className={`${styles.reminderCard} ${!reminder.isActive ? styles.inactive : ''}`}>
              <div className={styles.reminderLeft}>
                <div className={styles.reminderIcon}>
                  {reminder.isActive ? <Bell size={20} className={styles.bellActive} /> : <Bell size={20} className={styles.bellInactive} />}
                </div>
                <div className={styles.reminderInfo}>
                  <span className={styles.reminderTitle}>{reminder.title}</span>
                  <div className={styles.reminderMeta}>
                    <Badge variant="muted">{REMINDER_TYPE_LABELS[reminder.type]}</Badge>
                    <span className={styles.reminderTime}>
                      <Clock size={12} />{reminder.time}
                    </span>
                    <span className={styles.reminderDays}>{getDaysLabel(reminder.days)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.reminderActions}>
                <Switch checked={reminder.isActive} onChange={() => handleToggleActive(reminder)} id={`reminder-${reminder.id}`} />
                <button className={styles.deleteBtn} onClick={() => setDeleteId(reminder.id)} aria-label="Eliminar"><Trash2 size={15} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo recordatorio" id="reminder-modal">
        <div className={styles.form}>
          <Input label="Título *" placeholder="Ej: Medir glucosa en ayunas" value={title} onChange={e => setTitle(e.target.value)} id="reminder-title" required />
          <Select label="Tipo" options={TYPE_OPTIONS} value={reminderType} onChange={e => setReminderType(e.target.value as ReminderType)} id="reminder-type" />
          <Input label="Hora *" type="time" value={time} onChange={e => setTime(e.target.value)} id="reminder-time" required />
          <Select label="Repetición" options={REPEAT_OPTIONS} value={repeatPattern} onChange={e => setRepeatPattern(e.target.value)} id="reminder-repeat" />
          
          {repeatPattern === 'weekly' || repeatPattern === 'daily' ? (
            <div className={styles.daysSelector}>
              <label className={styles.daysLabel}>Días de la semana</label>
              <div className={styles.daysGrid}>
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    className={`${styles.dayBtn} ${selectedDays.includes(Number(day.value)) ? styles.daySelected : ''}`}
                    onClick={() => handleToggleDay(Number(day.value))}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>Crear recordatorio</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar recordatorio" message="¿Eliminar este recordatorio?" confirmLabel="Eliminar" />
    </div>
  );
};
