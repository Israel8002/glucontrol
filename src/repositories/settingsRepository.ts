import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { AppSettings, Patient, BackupHistory } from '@/entities';
import { DEFAULT_SETTINGS } from '@/core/constants';
import { logger } from '@/core/logger';
import { DatabaseError } from '@/core/errors';

const log = logger.forModule('SettingsRepository');

export const settingsRepository = {
  /**
   * Obtener configuración actual (siempre hay un único registro)
   */
  async get(): Promise<AppSettings | null> {
    try {
      const all = await db.settings.toArray();
      return all[0] ?? null;
    } catch (error) {
      log.error('Error al obtener configuración', error);
      return null;
    }
  },
  
  /**
   * Crear configuración inicial con valores por defecto
   */
  async createDefault(): Promise<AppSettings> {
    try {
      const record: AppSettings = {
        ...createBaseRecord(),
        ...DEFAULT_SETTINGS,
      };
      await db.settings.add(record);
      log.info('Configuración inicial creada');
      return record;
    } catch (error) {
      log.error('Error al crear configuración', error);
      throw new DatabaseError('No se pudo crear la configuración', error);
    }
  },
  
  /**
   * Actualizar configuración
   */
  async update(changes: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'createdTime'>>): Promise<AppSettings> {
    try {
      let existing = await this.get();
      if (!existing) existing = await this.createDefault();
      
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.settings.put(updated);
      log.info('Configuración actualizada');
      return updated;
    } catch (error) {
      log.error('Error al actualizar configuración', error);
      throw new DatabaseError('No se pudo actualizar la configuración', error);
    }
  },
  
  /**
   * Obtener o crear configuración (garantiza existencia)
   */
  async getOrCreate(): Promise<AppSettings> {
    const existing = await this.get();
    if (existing) return existing;
    return this.createDefault();
  },
};

export const patientRepository = {
  async get(): Promise<Patient | null> {
    try {
      const all = await db.patients.toArray();
      return all[0] ?? null;
    } catch (error) {
      log.error('Error al obtener paciente', error);
      return null;
    }
  },
  
  async create(data: Omit<Patient, keyof import('@/entities').BaseRecord>): Promise<Patient> {
    try {
      const record: Patient = { ...createBaseRecord(), ...data };
      await db.patients.add(record);
      log.info(`Paciente creado: ${data.name} ${data.lastName}`);
      return record;
    } catch (error) {
      log.error('Error al crear paciente', error);
      throw new DatabaseError('No se pudo crear el perfil', error);
    }
  },
  
  async update(changes: Partial<Omit<Patient, keyof import('@/entities').BaseRecord>>): Promise<Patient> {
    try {
      let existing = await this.get();
      if (!existing) throw new DatabaseError('No existe perfil de paciente');
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.patients.put(updated);
      log.info('Perfil de paciente actualizado');
      return updated;
    } catch (error) {
      log.error('Error al actualizar paciente', error);
      throw new DatabaseError('No se pudo actualizar el perfil', error);
    }
  },
  
  async exists(): Promise<boolean> {
    const count = await db.patients.count();
    return count > 0;
  },
  
  async getAllForBackup(): Promise<Patient[]> {
    return db.patients.toArray();
  },
  
  async restoreFromBackup(records: Patient[]): Promise<void> {
    await db.patients.bulkPut(records);
  },
};

export const backupRepository = {
  async create(data: Omit<BackupHistory, keyof import('@/entities').BaseRecord>): Promise<BackupHistory> {
    const record: BackupHistory = { ...createBaseRecord(), ...data };
    await db.backupHistory.add(record);
    return record;
  },
  
  async getAll(): Promise<BackupHistory[]> {
    return await db.backupHistory
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.backupHistory.get(id);
    if (!existing) return;
    await db.backupHistory.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
};

export const reminderRepository = {
  async create(data: Omit<import('@/entities').Reminder, keyof import('@/entities').BaseRecord>): Promise<import('@/entities').Reminder> {
    const record: import('@/entities').Reminder = { ...createBaseRecord(), ...data };
    await db.reminders.add(record);
    log.info(`Recordatorio creado: ${data.title}`);
    return record;
  },
  
  async getAll(): Promise<import('@/entities').Reminder[]> {
    return await db.reminders
      .where('isDeleted').equals(0)
      .toArray();
  },
  
  async getEnabled(): Promise<import('@/entities').Reminder[]> {
    return await db.reminders
      .where('isDeleted').equals(0)
      .and(r => r.enabled)
      .toArray();
  },
  
  async update(id: string, changes: Partial<import('@/entities').Reminder>): Promise<import('@/entities').Reminder> {
    const existing = await db.reminders.get(id);
    if (!existing) throw new DatabaseError('Recordatorio no encontrado');
    const updated = updateBaseRecord({ ...existing, ...changes });
    await db.reminders.put(updated);
    return updated;
  },
  
  async delete(id: string): Promise<void> {
    const existing = await db.reminders.get(id);
    if (!existing) return;
    await db.reminders.put(updateBaseRecord({ ...existing, isDeleted: true, enabled: false }));
  },
  
  async getAllForBackup(): Promise<import('@/entities').Reminder[]> {
    return db.reminders.toArray();
  },
  
  async restoreFromBackup(records: import('@/entities').Reminder[]): Promise<void> {
    await db.reminders.bulkPut(records);
  },
};


