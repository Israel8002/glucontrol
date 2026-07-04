import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { WeightLog, BloodPressureLog, MealLog, ExerciseLog } from '@/entities';
import type { WeightUnit, MealType, ExerciseType, ExerciseIntensity } from '@/types';
import { calculateBMI, classifyBMI } from '@/utils/health';
import { classifyBloodPressure } from '@/utils/health';
import { logger } from '@/core/logger';
import { DatabaseError } from '@/core/errors';
import { format } from 'date-fns';

const log = logger.forModule('HealthRepository');

// ─── PESO ─────────────────────────────────────────────────────────────────────

export interface CreateWeightInput {
  weight: number;
  unit: WeightUnit;
  heightCm: number; // Del perfil del paciente
  logDate?: string;
  logTime?: string;
  notes?: string;
}

export const weightRepository = {
  async create(input: CreateWeightInput): Promise<WeightLog> {
    try {
      const now = new Date();
      // Siempre almacenar en kg
      const weightKg = input.unit === 'lb' ? input.weight * 0.453592 : input.weight;
      const bmi = calculateBMI(weightKg, input.heightCm);
      const bmiCategory = classifyBMI(bmi);
      
      const record: WeightLog = {
        ...createBaseRecord(),
        weight: weightKg,
        unit: input.unit,
        bmi,
        bmiCategory,
        logDate: input.logDate ?? format(now, 'yyyy-MM-dd'),
        logTime: input.logTime ?? format(now, 'HH:mm'),
        notes: input.notes,
      };
      
      await db.weightLogs.add(record);
      log.info(`Peso registrado: ${weightKg.toFixed(1)} kg, IMC: ${bmi.toFixed(1)}`);
      return record;
    } catch (error) {
      log.error('Error al registrar peso', error);
      throw new DatabaseError('No se pudo guardar el registro de peso', error);
    }
  },
  
  async getAll(): Promise<WeightLog[]> {
    return await db.weightLogs
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<WeightLog[]> {
    return await db.weightLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },
  
  async getLatest(): Promise<WeightLog | undefined> {
    const all = await this.getAll();
    return all[0];
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.weightLogs.get(id);
    if (!existing) return;
    await db.weightLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
  
  async getAllForBackup(): Promise<WeightLog[]> {
    return db.weightLogs.toArray();
  },
  
  async restoreFromBackup(records: WeightLog[]): Promise<void> {
    await db.weightLogs.bulkPut(records);
  },
};

// ─── PRESIÓN ARTERIAL ─────────────────────────────────────────────────────────

export interface CreateBloodPressureInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  arm: 'left' | 'right';
  position: 'sitting' | 'standing' | 'lying';
  logDate?: string;
  logTime?: string;
  notes?: string;
}

export const bloodPressureRepository = {
  async create(input: CreateBloodPressureInput): Promise<BloodPressureLog> {
    try {
      const now = new Date();
      const category = classifyBloodPressure(input.systolic, input.diastolic);
      
      const record: BloodPressureLog = {
        ...createBaseRecord(),
        ...input,
        category,
        logDate: input.logDate ?? format(now, 'yyyy-MM-dd'),
        logTime: input.logTime ?? format(now, 'HH:mm'),
      };
      
      await db.bloodPressureLogs.add(record);
      log.info(`PA registrada: ${input.systolic}/${input.diastolic} [${category}]`);
      return record;
    } catch (error) {
      log.error('Error al registrar presión arterial', error);
      throw new DatabaseError('No se pudo guardar la presión arterial', error);
    }
  },
  
  async getAll(): Promise<BloodPressureLog[]> {
    return await db.bloodPressureLogs
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<BloodPressureLog[]> {
    return await db.bloodPressureLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },
  
  async getLatest(): Promise<BloodPressureLog | undefined> {
    const all = await this.getAll();
    return all[0];
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.bloodPressureLogs.get(id);
    if (!existing) return;
    await db.bloodPressureLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
  
  async getAllForBackup(): Promise<BloodPressureLog[]> {
    return db.bloodPressureLogs.toArray();
  },
  
  async restoreFromBackup(records: BloodPressureLog[]): Promise<void> {
    await db.bloodPressureLogs.bulkPut(records);
  },
};

// ─── ALIMENTACIÓN ─────────────────────────────────────────────────────────────

export interface CreateMealInput {
  mealType: MealType;
  description: string;
  carbohydrates?: number;
  calories?: number;
  glycemicIndex?: number;
  logDate?: string;
  logTime?: string;
  preGlucoseId?: string;
  postGlucoseId?: string;
  notes?: string;
}

export const mealRepository = {
  async create(input: CreateMealInput): Promise<MealLog> {
    try {
      const now = new Date();
      const record: MealLog = {
        ...createBaseRecord(),
        ...input,
        logDate: input.logDate ?? format(now, 'yyyy-MM-dd'),
        logTime: input.logTime ?? format(now, 'HH:mm'),
      };
      await db.mealLogs.add(record);
      log.info(`Comida registrada: ${input.mealType}`);
      return record;
    } catch (error) {
      log.error('Error al registrar comida', error);
      throw new DatabaseError('No se pudo guardar el registro de comida', error);
    }
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<MealLog[]> {
    return await db.mealLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },
  
  async getToday(): Promise<MealLog[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getByDateRange(today, today);
  },
  
  async getAll(): Promise<MealLog[]> {
    return await db.mealLogs.where('isDeleted').equals(0).reverse().sortBy('timestamp');
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.mealLogs.get(id);
    if (!existing) return;
    await db.mealLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
  
  async getAllForBackup(): Promise<MealLog[]> {
    return db.mealLogs.toArray();
  },
  
  async restoreFromBackup(records: MealLog[]): Promise<void> {
    await db.mealLogs.bulkPut(records);
  },
};

// ─── EJERCICIO ────────────────────────────────────────────────────────────────

export interface CreateExerciseInput {
  type: ExerciseType;
  customType?: string;
  intensity: ExerciseIntensity;
  durationMinutes: number;
  heartRateAvg?: number;
  logDate?: string;
  logTime?: string;
  preGlucoseId?: string;
  postGlucoseId?: string;
  notes?: string;
}

export const exerciseRepository = {
  async create(input: CreateExerciseInput, weightKg = 70): Promise<ExerciseLog> {
    try {
      const now = new Date();
      // Calorías estimadas: MET × peso(kg) × tiempo(h)
      const { EXERCISE_MET } = await import('@/core/constants');
      const met = EXERCISE_MET[input.type]?.[input.intensity] ?? 4;
      const caloriesBurned = Math.round(met * weightKg * (input.durationMinutes / 60));
      
      const record: ExerciseLog = {
        ...createBaseRecord(),
        ...input,
        caloriesBurned,
        logDate: input.logDate ?? format(now, 'yyyy-MM-dd'),
        logTime: input.logTime ?? format(now, 'HH:mm'),
      };
      await db.exerciseLogs.add(record);
      log.info(`Ejercicio registrado: ${input.type} ${input.durationMinutes}min`);
      return record;
    } catch (error) {
      log.error('Error al registrar ejercicio', error);
      throw new DatabaseError('No se pudo guardar el ejercicio', error);
    }
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<ExerciseLog[]> {
    return await db.exerciseLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },
  
  async getAll(): Promise<ExerciseLog[]> {
    return await db.exerciseLogs.where('isDeleted').equals(0).reverse().sortBy('timestamp');
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.exerciseLogs.get(id);
    if (!existing) return;
    await db.exerciseLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
  
  async getAllForBackup(): Promise<ExerciseLog[]> {
    return db.exerciseLogs.toArray();
  },
  
  async restoreFromBackup(records: ExerciseLog[]): Promise<void> {
    await db.exerciseLogs.bulkPut(records);
  },
};
