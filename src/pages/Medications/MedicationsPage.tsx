import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pill, Check, X, Clock, Trash2, Pencil } from 'lucide-react';
import { medicationRepository } from '@/repositories/medicationRepository';
import type { Medication, MedicationLog } from '@/entities';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Badge } from '@/components/ui/Badge/Badge';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Switch } from '@/components/ui/Switch/Switch';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { PageHeader } from '@/components/ui/PageHeader/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { today, formatTime, formatDisplayDate } from '@/utils/date';
import styles from './MedicationsPage.module.css';

const FORM_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const FREQUENCY_OPTIONS = [
  { value: 'every_24h', label: 'Cada 24 horas' },
  { value: 'every_12h', label: 'Cada 12 horas' },
  { value: 'every_8h', label: 'Cada 8 horas' },
  { value: 'every_6h', label: 'Cada 6 horas' },
  { value: 'custom', label: 'Personalizado' },
];

const FORM_OPTIONS = [
  { value: 'tableta', label: 'Tableta' },
  { value: 'cápsula', label: 'Cápsula' },
  { value: 'inyectable', label: 'Inyectable' },
  { value: 'jarabe', label: 'Jarabe' },
  { value: 'parche', label: 'Parche' },
  { value: 'otro', label: 'Otro' },
];

export const MedicationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [allLogs, setAllLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  
  // Formulario
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('tableta');
  const [frequency, setFrequency] = useState('every_24h');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00']);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [selectedColor, setSelectedColor] = useState(FORM_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meds, todayL, logs] = await Promise.all([
        medicationRepository.getAllMedications(),
        medicationRepository.getLogsByDate(today()),
        medicationRepository.getAllLogs(),
      ]);
      setMedications(meds);
      setTodayLogs(todayL);
      setAllLogs(logs);
    } catch {
      toastError('Error al cargar medicamentos');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => { loadData(); }, []);
  
  const resetForm = () => {
    setName(''); setGenericName(''); setDosage('');
    setForm('tableta'); setFrequency('every_24h');
    setScheduledTimes(['08:00']);
    setReminderEnabled(true); setAlarmEnabled(false);
    setSelectedColor(FORM_COLORS[0]);
    setEditingMedicationId(null);
  };
  
  const handleFrequencyChange = (val: string) => {
    setFrequency(val);
    if (val === 'every_6h') {
      setScheduledTimes(['06:00', '12:00', '18:00', '00:00']);
    } else if (val === 'every_8h') {
      setScheduledTimes(['08:00', '16:00', '00:00']);
    } else if (val === 'every_12h') {
      setScheduledTimes(['08:00', '20:00']);
    } else if (val === 'every_24h') {
      setScheduledTimes(['08:00']);
    }
  };

  const handleEditClick = (med: Medication) => {
    setEditingMedicationId(med.id);
    setName(med.name);
    setGenericName(med.genericName || '');
    setDosage(med.dosage);
    setForm(med.form);
    setFrequency(med.frequency);
    setScheduledTimes(med.scheduledTimes || ['08:00']);
    setReminderEnabled(med.reminderEnabled);
    setAlarmEnabled(!!(med as any).alarmEnabled);
    setSelectedColor(med.color ?? FORM_COLORS[0]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      toastError('Nombre y dosis son requeridos');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        name: name.trim(),
        genericName: genericName.trim() || undefined,
        dosage: dosage.trim(),
        form,
        frequency,
        scheduledTimes,
        reminderEnabled,
        alarmEnabled,
        color: selectedColor,
      };

      if (editingMedicationId) {
        await medicationRepository.updateMedication(editingMedicationId, data);
        success('Medicamento actualizado');
      } else {
        await medicationRepository.createMedication(data);
        success('Medicamento agregado');
      }
      await loadData();
      setShowForm(false);
      resetForm();
    } catch {
      toastError(editingMedicationId ? 'Error al actualizar medicamento' : 'Error al guardar medicamento');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTake = async (med: Medication, scheduledTime: string, taken: boolean) => {
    try {
      const existingLog = todayLogs.find(
        l => l.medicationId === med.id && l.scheduledTime === scheduledTime
      );
      
      if (existingLog) {
        await medicationRepository.updateLog(existingLog.id, {
          taken,
          takenTime: taken ? formatTime(new Date().toISOString()) : undefined,
        });
      } else {
        await medicationRepository.createLog({
          medicationId: med.id,
          taken,
          scheduledTime,
          takenTime: taken ? new Date().toTimeString().slice(0, 5) : undefined,
        });
      }
      await loadData();
      if (taken) success(`${med.name} marcado como tomado`);
    } catch {
      toastError('Error al registrar toma');
    }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await medicationRepository.deleteMedication(deleteId);
      await loadData();
      success('Medicamento eliminado');
    } catch {
      toastError('Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDeleteLog = async () => {
    if (!deleteLogId) return;
    setIsDeletingLog(true);
    try {
      await medicationRepository.deleteLog(deleteLogId);
      await loadData();
      success('Registro de toma eliminado');
    } catch {
      toastError('Error al eliminar el registro de toma');
    } finally {
      setIsDeletingLog(false);
      setDeleteLogId(null);
    }
  };
  
  if (isLoading) {
    return <div className={styles.loading}><Spinner size="lg" /></div>;
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Pill size={24} className={styles.headerIcon} />
          <h1>Medicamentos</h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowForm(true)}
          id="btn-add-medication"
        >
          Agregar
        </Button>
      </div>
      
      {medications.length === 0 ? (
        <EmptyState
          icon={<Pill size={56} />}
          title="Sin medicamentos"
          description="Agrega tus medicamentos para llevar el control de tus tomas diarias"
          actionLabel="Agregar medicamento"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className={styles.list}>
          {medications.map(med => {
            const medLogs = todayLogs.filter(l => l.medicationId === med.id);
            const takenCount = medLogs.filter(l => l.taken).length;
            const totalDoses = med.scheduledTimes.length;
            const allTaken = takenCount >= totalDoses && totalDoses > 0;
            
            return (
              <Card key={med.id} className={`${styles.medCard} ${allTaken ? styles.allTaken : ''}`}>
                <div className={styles.medHeader}>
                  <div className={styles.medInfo}>
                    <div
                      className={styles.medColorDot}
                      style={{ background: med.color ?? '#22c55e' }}
                    />
                    <div>
                      <h3 className={styles.medName}>{med.name}</h3>
                      {med.genericName && (
                        <span className={styles.medGeneric}>{med.genericName}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.medMeta}>
                    <Badge variant={allTaken ? 'success' : 'muted'}>
                      {takenCount}/{totalDoses} dosis
                    </Badge>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEditClick(med)}
                      aria-label={`Editar ${med.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeleteId(med.id)}
                      aria-label={`Eliminar ${med.name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                
                <div className={styles.medDetails}>
                  <span>{med.dosage} · {med.form}</span>
                </div>
                
                {/* Dosis del día */}
                <div className={styles.doseList}>
                  {med.scheduledTimes.map(time => {
                    const log = medLogs.find(l => l.scheduledTime === time);
                    const taken = log?.taken ?? false;
                    
                    return (
                      <button
                        key={time}
                        className={`${styles.doseBtn} ${taken ? styles.doseTaken : ''}`}
                        onClick={() => handleTake(med, time, !taken)}
                        aria-label={`${taken ? 'Desmarcar' : 'Marcar'} dosis de ${time}`}
                      >
                        {taken ? <Check size={16} /> : <Clock size={16} />}
                        <span>{time}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Historial de tomas */}
      {allLogs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Historial de tomas</h2>
          {(() => {
            const groupedLogs = allLogs.reduce((acc, log) => {
              const d = log.logDate;
              if (!acc[d]) acc[d] = [];
              acc[d].push(log);
              return acc;
            }, {} as Record<string, MedicationLog[]>);

            const sortedLogDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

            return sortedLogDates.map(date => (
              <div key={date} className={styles.dateGroup}>
                <div className={styles.dateLabel}>
                  <span>{formatDisplayDate(date)}</span>
                  <Badge variant="muted">{groupedLogs[date].length}</Badge>
                </div>
                <div className={styles.list}>
                  {groupedLogs[date].map(l => {
                    const med = medications.find(m => m.id === l.medicationId);
                    return (
                      <Card key={l.id} className={styles.logCard} padding="sm">
                        <div className={styles.logInfo}>
                          <span className={styles.logName}>{med?.name ?? l.medicationName ?? 'Medicamento'}</span>
                          <span className={styles.logMeta}>
                            Dosis programada: {l.scheduledTime} · {l.taken ? `Tomado a las ${l.takenTime ?? l.scheduledTime}` : 'No tomado'}
                          </span>
                        </div>
                        <button
                          className={styles.logDeleteBtn}
                          onClick={() => setDeleteLogId(l.id)}
                          aria-label="Eliminar registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
      
      {/* Modal para agregar/editar medicamento */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editingMedicationId ? 'Editar medicamento' : 'Agregar medicamento'}
        id="medication-form-modal"
      >
        <div className={styles.form}>
          <Input
            label="Nombre del medicamento *"
            placeholder="Ej: Metformina"
            value={name}
            onChange={e => setName(e.target.value)}
            id="med-name"
            required
          />
          <Input
            label="Nombre genérico"
            placeholder="Ej: Metformin hydrochloride"
            value={genericName}
            onChange={e => setGenericName(e.target.value)}
            id="med-generic"
          />
          <Input
            label="Dosis *"
            placeholder="Ej: 500mg, 5mg/mL"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            id="med-dosage"
            required
          />
          <Select
            label="Forma farmacéutica"
            options={FORM_OPTIONS}
            value={form}
            onChange={e => setForm(e.target.value)}
            id="med-form"
          />
          <Select
            label="Frecuencia"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={e => handleFrequencyChange(e.target.value)}
            id="med-frequency"
          />

          {/* Horarios programados */}
          <div className={styles.timeSection}>
            <label className={styles.timeLabel}>Horarios programados</label>
            <div className={styles.timeInputsList}>
              {scheduledTimes.map((time, idx) => (
                <div key={idx} className={styles.timeInputRow}>
                  <Input
                    type="time"
                    value={time}
                    onChange={e => {
                      const newTimes = [...scheduledTimes];
                      newTimes[idx] = e.target.value;
                      setScheduledTimes(newTimes);
                    }}
                    id={`med-time-${idx}`}
                  />
                  {frequency === 'custom' && (
                    <button
                      type="button"
                      className={styles.timeRemoveBtn}
                      onClick={() => {
                        if (scheduledTimes.length > 1) {
                          setScheduledTimes(scheduledTimes.filter((_, i) => i !== idx));
                        }
                      }}
                      aria-label="Eliminar horario"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {frequency === 'custom' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setScheduledTimes([...scheduledTimes, '12:00'])}
                className={styles.addTimeBtn}
              >
                + Agregar horario
              </Button>
            )}
          </div>
          
          {/* Selector de color */}
          <div className={styles.colorPicker}>
            <label className={styles.colorLabel}>Color identificador</label>
            <div className={styles.colorOptions}>
              {FORM_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorBtn} ${selectedColor === color ? styles.colorSelected : ''}`}
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>
          
          <Switch
            checked={reminderEnabled}
            onChange={setReminderEnabled}
            label="Recordatorio"
            description="Recibir notificación en los horarios programados"
            id="med-reminder"
          />

          <Switch
            checked={alarmEnabled}
            onChange={setAlarmEnabled}
            label="Alarma de celular"
            description="Hacer sonar alarma en el dispositivo en los horarios programados"
            id="med-alarm"
          />
          
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>
              {editingMedicationId ? 'Guardar cambios' : 'Guardar medicamento'}
            </Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar medicamento"
        message="¿Eliminar este medicamento? Se perderá también el historial de tomas."
        confirmLabel="Eliminar"
        loading={isDeleting}
      />

      <ConfirmDialog
        isOpen={!!deleteLogId}
        onClose={() => setDeleteLogId(null)}
        onConfirm={handleDeleteLog}
        title="Eliminar registro de toma"
        message="¿Eliminar esta toma de medicamento de tu historial?"
        confirmLabel="Eliminar"
        loading={isDeletingLog}
      />
    </div>
  );
};

function getScheduledTimes(frequency: string): string[] {
  switch (frequency) {
    case 'once': return ['08:00'];
    case 'twice': return ['08:00', '20:00'];
    case 'three': return ['08:00', '14:00', '20:00'];
    case 'four': return ['08:00', '12:00', '16:00', '20:00'];
    default: return ['08:00'];
  }
}
