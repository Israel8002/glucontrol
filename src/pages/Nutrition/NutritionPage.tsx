import React, { useState, useEffect } from 'react';
import { Plus, Utensils, Trash2 } from 'lucide-react';
import { nutritionRepository } from '@/repositories/healthAdapters';
import type { NutritionLog } from '@/entities';
import type { MealType } from '@/types';
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
import { MEAL_TYPE_LABELS } from '@/core/constants';
import { formatDisplayDate, today } from '@/utils/date';
import styles from './NutritionPage.module.css';

const MEAL_OPTIONS = Object.entries(MEAL_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const NutritionPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Formulario
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [calories, setCalories] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [portionSize, setPortionSize] = useState(100);
  const [portionUnit, setPortionUnit] = useState('g');
  const [glycemicIndex, setGlycemicIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try { setLogs(await nutritionRepository.getAll()); }
    catch { toastError('Error al cargar registros'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const resetForm = () => {
    setFoodName(''); setMealType('breakfast'); setCalories(0);
    setCarbs(0); setProtein(0); setFat(0);
    setPortionSize(100); setPortionUnit('g'); setGlycemicIndex(0); setNotes('');
  };
  
  const handleSave = async () => {
    if (!foodName.trim()) { toastError('El nombre del alimento es requerido'); return; }
    setIsSaving(true);
    try {
      await nutritionRepository.create({
        foodName: foodName.trim(), mealType, calories, carbs, protein, fat,
        portionSize, portionUnit, glycemicIndex: glycemicIndex || undefined,
        notes: notes.trim() || undefined,
      });
      await load();
      setShowForm(false);
      resetForm();
      success('Alimento registrado');
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await nutritionRepository.delete(deleteId); setLogs(prev => prev.filter(l => l.id !== deleteId)); success('Eliminado'); }
    catch { toastError('Error al eliminar'); }
    finally { setDeleteId(null); }
  };
  
  // Agrupar por fecha
  const grouped = logs.reduce<Record<string, NutritionLog[]>>((acc, l) => {
    if (!acc[l.logDate]) acc[l.logDate] = [];
    acc[l.logDate].push(l);
    return acc;
  }, {});
  
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Utensils size={24} className={styles.headerIcon} /><h1>Alimentación</h1></div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setShowForm(true)} id="btn-add-nutrition">Registrar</Button>
      </div>
      
      {logs.length === 0 ? (
        <EmptyState icon={<Utensils size={56} />} title="Sin registros de alimentación" description="Registra tus comidas para llevar el control de carbohidratos y calorías" actionLabel="Registrar ahora" onAction={() => setShowForm(true)} />
      ) : (
        <div className={styles.list}>
          {sortedDates.map(date => {
            const dayLogs = grouped[date];
            const totalCals = dayLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
            const totalCarbs = dayLogs.reduce((s, l) => s + (l.carbs ?? 0), 0);
            return (
              <div key={date} className={styles.dateGroup}>
                <div className={styles.dateLabelRow}>
                  <span className={styles.dateLabel}>{formatDisplayDate(date)}</span>
                  <div className={styles.dateTotals}>
                    {totalCals > 0 && <Badge variant="muted">{totalCals} kcal</Badge>}
                    {totalCarbs > 0 && <Badge variant="warning">{totalCarbs}g CH</Badge>}
                  </div>
                </div>
                {dayLogs.map(log => (
                  <Card key={log.id} className={styles.logCard} padding="sm">
                    <div className={styles.logLeft}>
                      <div className={styles.mealTypeTag}>{MEAL_TYPE_LABELS[log.mealType]}</div>
                      <div className={styles.logInfo}>
                        <span className={styles.foodName}>{log.foodName}</span>
                        <span className={styles.portionInfo}>{log.portionSize}{log.portionUnit}</span>
                        <div className={styles.macros}>
                          {log.calories != null && <span className={styles.macro}>{log.calories} kcal</span>}
                          {log.carbs != null && <span className={styles.macro}>{log.carbs}g CH</span>}
                          {log.protein != null && <span className={styles.macro}>{log.protein}g P</span>}
                          {log.fat != null && <span className={styles.macro}>{log.fat}g G</span>}
                          {log.glycemicIndex != null && <span className={styles.gi}>IG: {log.glycemicIndex}</span>}
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
      
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title="Registrar alimento" id="nutrition-modal">
        <div className={styles.form}>
          <Input label="Alimento *" placeholder="Ej: Arroz blanco, Manzana" value={foodName} onChange={e => setFoodName(e.target.value)} id="food-name" required />
          <Select label="Tipo de comida" options={MEAL_OPTIONS} value={mealType} onChange={e => setMealType(e.target.value as MealType)} id="meal-type" />
          <div className={styles.portionRow}>
            <NumberInput label="Porción" value={portionSize} onChange={setPortionSize} min={0} max={9999} step={1} />
            <Select label="Unidad" options={[{ value: 'g', label: 'g' }, { value: 'ml', label: 'ml' }, { value: 'porciones', label: 'porciones' }, { value: 'tazas', label: 'tazas' }]} value={portionUnit} onChange={e => setPortionUnit(e.target.value)} id="portion-unit" />
          </div>
          <div className={styles.macroGrid}>
            <NumberInput label="Calorías (kcal)" value={calories} onChange={setCalories} min={0} max={9999} step={1} />
            <NumberInput label="Carbohidratos (g)" value={carbs} onChange={setCarbs} min={0} max={999} step={0.1} />
            <NumberInput label="Proteínas (g)" value={protein} onChange={setProtein} min={0} max={999} step={0.1} />
            <NumberInput label="Grasas (g)" value={fat} onChange={setFat} min={0} max={999} step={0.1} />
          </div>
          <NumberInput label="Índice glucémico (opcional)" value={glycemicIndex} onChange={setGlycemicIndex} min={0} max={100} step={1} />
          <Input label="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones" id="nutrition-notes" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Eliminar registro" message="¿Eliminar este registro de alimentación?" confirmLabel="Eliminar" />
    </div>
  );
};
