import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Droplets } from 'lucide-react';
import { glucoseRepository } from '@/repositories/glucoseRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/Button/Button';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { PageHeader } from '@/components/ui/PageHeader/PageHeader';
import { GlucoseValueDisplay } from '@/components/ui/GlucoseValueDisplay/GlucoseValueDisplay';
import { useToast } from '@/components/ui/Toast/Toast';
import type { GlucoseContext } from '@/types';
import { GLUCOSE_CONTEXT_LABELS, GLUCOSE_RANGES } from '@/core/constants';
import { determineGlucoseStatus, mgdlToMmol, mmolToMgdl } from '@/utils/glucose';
import { today, nowTime } from '@/utils/date';
import styles from './GlucoseForm.module.css';

const CONTEXT_OPTIONS = Object.entries(GLUCOSE_CONTEXT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Formulario de registro de glucosa.
 * Diseñado para el mínimo de pulsaciones posible.
 * El valor de glucosa es el único campo realmente obligatorio.
 */
export const GlucoseForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettingsStore();
  const { success, error: toastError } = useToast();
  
  // Si viene del calendario, usar la fecha del query param
  const dateFromCalendar = searchParams.get('date'); // 'YYYY-MM-DD' o null
  const fromCalendar = !!dateFromCalendar;
  
  const unit = settings?.glucoseUnit ?? 'mg/dL';
  
  // Contexto inteligente según la hora del día
  const getDefaultContext = (): GlucoseContext => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return 'fasting';
    if (hour >= 9 && hour < 10) return 'after_breakfast';
    if (hour >= 12 && hour < 13) return 'before_lunch';
    if (hour >= 14 && hour < 15) return 'after_lunch';
    if (hour >= 19 && hour < 20) return 'before_dinner';
    if (hour >= 21 && hour < 22) return 'after_dinner';
    if (hour >= 22 || hour < 6) return 'before_sleep';
    return 'random';
  };
  
  const defaultValue = unit === 'mmol/L' ? 5.0 : 100;
  
  const [value, setValue] = useState(defaultValue);
  const [context, setContext] = useState<GlucoseContext>(getDefaultContext());
  const [readingTime, setReadingTime] = useState(nowTime());
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Valor en mg/dL para calcular estado en tiempo real
  const valueMgdl = unit === 'mmol/L' ? Math.round(value * 18.018) : value;
  
  const thresholds = {
    targetMin: settings?.glucoseTargetMin ?? GLUCOSE_RANGES.DEFAULT_TARGET_MIN,
    targetMax: settings?.glucoseTargetMax ?? GLUCOSE_RANGES.DEFAULT_TARGET_MAX,
    hypoThreshold: settings?.glucoseHypoThreshold ?? GLUCOSE_RANGES.HYPO_MAX,
    hyperThreshold: settings?.glucoseHyperThreshold ?? GLUCOSE_RANGES.DEFAULT_TARGET_MAX,
    severeHypoThreshold: settings?.glucoseSevereHypoThreshold ?? GLUCOSE_RANGES.SEVERE_HYPO_MAX,
    severeHyperThreshold: settings?.glucoseSevereHyperThreshold ?? GLUCOSE_RANGES.SEVERE_HYPER_MIN,
  };
  
  const currentStatus = determineGlucoseStatus(valueMgdl, thresholds);
  
  const handleSubmit = async () => {
    if (value <= 0) {
      toastError('Ingresa un valor válido');
      return;
    }
    
    setIsLoading(true);
    try {
      await glucoseRepository.create({
        value,
        unit,
        context,
        notes: notes.trim() || undefined,
        readingDate: dateFromCalendar ?? undefined,
        readingTime,
        ...thresholds,
      });
      
      success(`Glucosa registrada: ${value} ${unit}`);
      navigate(fromCalendar ? `/calendario` : '/glucosa', { replace: true });
    } catch {
      toastError('Error al guardar la lectura');
    } finally {
      setIsLoading(false);
    }
  };
  
  const step = unit === 'mmol/L' ? 0.1 : 1;
  const min = unit === 'mmol/L' ? 1.0 : 20;
  const max = unit === 'mmol/L' ? 40.0 : 720;
  
  return (
    <div className={styles.container}>
      <PageHeader title={fromCalendar ? `Glucosa · ${dateFromCalendar}` : 'Registrar glucosa'} />
      
      <div className={styles.content}>
        {/* Vista previa del estado actual */}
        <div className={styles.preview}>
          <GlucoseValueDisplay
            value={valueMgdl}
            status={currentStatus}
            unit={unit}
            size="xl"
            showStatus
          />
        </div>
        
        {/* Input de valor — el principal, con botones grandes */}
        <div className={styles.mainInput}>
          <NumberInput
            value={value}
            onChange={setValue}
            min={min}
            max={max}
            step={step}
            unit={unit}
            decimals={unit === 'mmol/L' ? 1 : 0}
            large
          />
        </div>
        
        {/* También mostrar en la otra unidad */}
        <div className={styles.conversion}>
          {unit === 'mg/dL'
            ? `≈ ${mgdlToMmol(valueMgdl).toFixed(1)} mmol/L`
            : `≈ ${mmolToMgdl(value)} mg/dL`}
        </div>
        
        {/* Contexto */}
        <Select
          label="Momento de la medición"
          options={CONTEXT_OPTIONS}
          value={context}
          onChange={e => setContext(e.target.value as GlucoseContext)}
          id="glucose-context"
        />

        {/* Hora de medición manual */}
        <Input
          label="Hora de la medición"
          type="time"
          value={readingTime}
          onChange={e => setReadingTime(e.target.value)}
          id="glucose-time"
        />
        
        {/* Notas opcionales */}
        <Input
          label="Notas (opcional)"
          placeholder="¿Algo relevante a recordar?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={200}
          id="glucose-notes"
        />
        
        {/* Guardar */}
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleSubmit}
          loading={isLoading}
          leftIcon={<Check size={22} />}
          id="btn-save-glucose"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
};
