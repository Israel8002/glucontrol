import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Droplets, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import type { GlucoseReading } from '@/entities';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { GlucoseValueDisplay } from '@/components/ui/GlucoseValueDisplay/GlucoseValueDisplay';
import { Badge } from '@/components/ui/Badge/Badge';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { GLUCOSE_CONTEXT_LABELS } from '@/core/constants';
import { formatDisplayDate, formatTime } from '@/utils/date';
import { formatGlucose, getGlucoseStatusColor } from '@/utils/glucose';
import styles from './GlucosePage.module.css';

/**
 * Página principal de glucosa: historial y acceso al registro rápido.
 */
export const GlucosePage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { success, error: toastError } = useToast();
  
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const unit = settings?.glucoseUnit ?? 'mg/dL';
  
  const loadReadings = async () => {
    setIsLoading(true);
    try {
      const data = await glucoseRepository.getAll();
      setReadings(data);
    } catch {
      toastError('Error al cargar registros');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => { loadReadings(); }, []);
  
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await glucoseRepository.delete(deleteId);
      setReadings(prev => prev.filter(r => r.id !== deleteId));
      success('Registro eliminado');
    } catch {
      toastError('Error al eliminar registro');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };
  
  // Agrupar por fecha
  const grouped = readings.reduce<Record<string, GlucoseReading[]>>((acc, r) => {
    if (!acc[r.readingDate]) acc[r.readingDate] = [];
    acc[r.readingDate].push(r);
    return acc;
  }, {});
  
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Droplets size={24} className={styles.headerIcon} />
          <h1>Glucosa</h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={() => navigate('/glucosa/nueva')}
          id="btn-add-glucose"
        >
          Registrar
        </Button>
      </div>
      
      {/* Lista de lecturas agrupadas por fecha */}
      {readings.length === 0 ? (
        <EmptyState
          icon={<Droplets size={56} />}
          title="Sin registros de glucosa"
          description="Registra tu primera lectura de glucosa para comenzar el seguimiento"
          actionLabel="Registrar ahora"
          onAction={() => navigate('/glucosa/nueva')}
        />
      ) : (
        <div className={styles.list}>
          {sortedDates.map(date => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateLabel}>
                <span>{formatDisplayDate(date)}</span>
                <Badge variant="muted">{grouped[date].length}</Badge>
              </div>
              <div className={styles.dateItems}>
                {grouped[date].map(reading => (
                  <GlucoseReadingCard
                    key={reading.id}
                    reading={reading}
                    unit={unit}
                    onDelete={() => setDeleteId(reading.id)}
                    onEdit={() => navigate(`/glucosa/editar/${reading.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Confirmación de eliminación */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
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

// ─── Tarjeta de lectura ────────────────────────────────────────────────────────

interface GlucoseReadingCardProps {
  reading: GlucoseReading;
  unit: 'mg/dL' | 'mmol/L';
  onDelete: () => void;
  onEdit: () => void;
}

const GlucoseReadingCard: React.FC<GlucoseReadingCardProps> = ({
  reading,
  unit,
  onDelete,
  onEdit,
}) => {
  const statusColor = getGlucoseStatusColor(reading.status);
  const displayValue = formatGlucose(reading.value, unit);
  
  return (
    <Card className={styles.readingCard} padding="sm">
      <div className={styles.readingLeft}>
        <div
          className={styles.statusDot}
          style={{ background: statusColor }}
        />
        <div className={styles.readingInfo}>
          <div className={styles.readingValueRow}>
            <span
              className={styles.readingValue}
              style={{ color: statusColor }}
            >
              {displayValue}
            </span>
            <span className={styles.readingUnit}>{unit}</span>
          </div>
          <span className={styles.readingContext}>
            {GLUCOSE_CONTEXT_LABELS[reading.context] ?? reading.context}
          </span>
          {reading.notes && (
            <span className={styles.readingNotes}>{reading.notes}</span>
          )}
        </div>
      </div>
      <div className={styles.readingRight}>
        <span className={styles.readingTime}>{formatTime(reading.readingTime)}</span>
        <div className={styles.readingActions}>
          <button
            className={styles.actionBtn}
            onClick={onEdit}
            aria-label="Editar lectura"
          >
            <Pencil size={15} />
          </button>
          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={onDelete}
            aria-label="Eliminar lectura"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
};
