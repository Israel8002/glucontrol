/**
 * Adaptadores de compatibilidad para los repositorios de salud.
 * Las páginas esperan APIs ligeramente diferentes a la implementación base.
 */

import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { NutritionLog, ExerciseLog, Reminder } from '@/entities';
import type { MealType, ExerciseType, ExerciseIntensity, ReminderType } from '@/types';
import { logger } from '@/core/logger';
import { format } from 'date-fns';

const log = logger.forModule('HealthAdapter');

// ─── NUTRITION (NutritionLog) ─────────────────────────────────────────────────

interface CreateNutritionInput {
  foodName: string;
  mealType: MealType;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  portionSize?: number;
  portionUnit?: string;
  glycemicIndex?: number;
  notes?: string;
}

export const nutritionRepository = {
  async create(input: CreateNutritionInput): Promise<NutritionLog> {
    const now = new Date();
    const record: NutritionLog = {
      ...createBaseRecord(),
      foodName: input.foodName,
      mealType: input.mealType,
      calories: input.calories,
      carbs: input.carbs,
      protein: input.protein,
      fat: input.fat,
      portionSize: input.portionSize ?? 100,
      portionUnit: input.portionUnit ?? 'g',
      glycemicIndex: input.glycemicIndex,
      notes: input.notes,
      logDate: format(now, 'yyyy-MM-dd'),
      logTime: format(now, 'HH:mm'),
    };
    await db.nutritionLogs.add(record);
    log.info(`Nutrición registrada: ${input.foodName}`);
    return record;
  },

  async getAll(): Promise<NutritionLog[]> {
    return db.nutritionLogs
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },

  async getByDate(date: string): Promise<NutritionLog[]> {
    return db.nutritionLogs
      .where('logDate').equals(date)
      .and(l => !l.isDeleted)
      .toArray();
  },

  async getByDateRange(startDate: string, endDate: string): Promise<NutritionLog[]> {
    return db.nutritionLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },

  async delete(id: string): Promise<void> {
    const existing = await db.nutritionLogs.get(id);
    if (!existing) return;
    await db.nutritionLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
};

// ─── EXERCISE ─────────────────────────────────────────────────────────────────

interface CreateExerciseInput {
  name: string;
  type: ExerciseType;
  duration: number;
  intensity: ExerciseIntensity;
  caloriesBurned?: number;
  notes?: string;
}

export const exerciseRepository = {
  async create(input: CreateExerciseInput): Promise<ExerciseLog> {
    const now = new Date();
    const record: ExerciseLog = {
      ...createBaseRecord(),
      name: input.name,
      type: input.type,
      duration: input.duration,
      intensity: input.intensity,
      caloriesBurned: input.caloriesBurned,
      notes: input.notes,
      logDate: format(now, 'yyyy-MM-dd'),
      logTime: format(now, 'HH:mm'),
    };
    await db.exerciseLogs.add(record);
    log.info(`Ejercicio registrado: ${input.name}`);
    return record;
  },

  async getAll(): Promise<ExerciseLog[]> {
    return db.exerciseLogs
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },

  async getByDate(date: string): Promise<ExerciseLog[]> {
    return db.exerciseLogs
      .where('logDate').equals(date)
      .and(l => !l.isDeleted)
      .toArray();
  },

  async getByDateRange(startDate: string, endDate: string): Promise<ExerciseLog[]> {
    return db.exerciseLogs
      .where('logDate').between(startDate, endDate, true, true)
      .and(l => !l.isDeleted)
      .toArray();
  },

  async delete(id: string): Promise<void> {
    const existing = await db.exerciseLogs.get(id);
    if (!existing) return;
    await db.exerciseLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
};

// ─── REMINDERS ────────────────────────────────────────────────────────────────

interface CreateReminderInput {
  title: string;
  type: ReminderType;
  time: string;
  repeatPattern: string;
  days: number[];
  isActive: boolean;
}

export const reminderRepository = {
  async create(input: CreateReminderInput): Promise<Reminder> {
    const record: Reminder = {
      ...createBaseRecord(),
      ...input,
    };
    await db.reminders.add(record);
    log.info(`Recordatorio creado: ${input.title}`);
    return record;
  },

  async getAll(): Promise<Reminder[]> {
    return db.reminders
      .where('isDeleted').equals(0)
      .toArray();
  },

  async update(id: string, changes: Partial<Reminder>): Promise<void> {
    const existing = await db.reminders.get(id);
    if (!existing) return;
    await db.reminders.put(updateBaseRecord({ ...existing, ...changes }));
  },

  async delete(id: string): Promise<void> {
    const existing = await db.reminders.get(id);
    if (!existing) return;
    await db.reminders.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
};
