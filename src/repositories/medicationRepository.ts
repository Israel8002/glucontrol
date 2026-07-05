import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { Medication, MedicationLog } from '@/entities';
import { logger } from '@/core/logger';
import { DatabaseError } from '@/core/errors';
import { format } from 'date-fns';

const log = logger.forModule('MedicationRepository');

export interface CreateMedicationInput {
  name: string;
  genericName?: string;
  dosage: string;
  form: string;
  frequency: string;
  scheduledTimes: string[];
  notes?: string;
  color?: string;
  reminderEnabled: boolean;
}

export interface CreateMedicationLogInput {
  medicationId: string;
  taken: boolean;
  scheduledTime: string;
  takenTime?: string;
  logDate?: string;
  notes?: string;
  skippedReason?: string;
}

async function syncMedicationReminders(med: Medication): Promise<void> {
  try {
    const allReminders = await db.reminders.toArray();
    const existingReminders = allReminders.filter((r: any) => r.medicationId === med.id);
    const alarmEnabled = !!(med as any).alarmEnabled;

    if (!alarmEnabled || !med.isActive || med.isDeleted) {
      for (const r of existingReminders) {
        if (!r.isDeleted) {
          await db.reminders.put(updateBaseRecord({ ...r, isDeleted: true }));
        }
      }
      return;
    }

    const times = med.scheduledTimes || [];

    for (const r of existingReminders) {
      if (!times.includes(r.time)) {
        if (!r.isDeleted) {
          await db.reminders.put(updateBaseRecord({ ...r, isDeleted: true }));
        }
      }
    }

    for (const time of times) {
      const existing = existingReminders.find(r => r.time === time);
      const title = `Alarma: ${med.name} (${med.dosage})`;
      if (existing) {
        if (existing.isDeleted || existing.title !== title) {
          await db.reminders.put(updateBaseRecord({
            ...existing,
            title,
            isDeleted: false,
          }));
        }
      } else {
        const record = {
          ...createBaseRecord(),
          title,
          type: 'medication' as any,
          time,
          repeatPattern: 'daily',
          days: [1, 2, 3, 4, 5, 6, 0],
          isActive: true,
          medicationId: med.id,
        };
        await db.reminders.add(record);
      }
    }
  } catch (error) {
    log.error('Error syncing medication reminders', error);
  }
}

export const medicationRepository = {
  // ─── MEDICAMENTOS ──────────────────────────────────────────────────────────
  
  async createMedication(input: CreateMedicationInput): Promise<Medication> {
    try {
      const record: Medication = { ...createBaseRecord(), ...input };
      await db.medications.add(record);
      await syncMedicationReminders(record);
      log.info(`Medicamento creado: ${input.name}`);
      return record;
    } catch (error) {
      log.error('Error al crear medicamento', error);
      throw new DatabaseError('No se pudo crear el medicamento', error);
    }
  },
  
  async getAllMedications(): Promise<Medication[]> {
    try {
      return await db.medications
        .where('isDeleted').equals(0)
        .and(m => m.isActive)
        .toArray();
    } catch (error) {
      log.error('Error al obtener medicamentos', error);
      throw new DatabaseError('No se pudieron cargar los medicamentos', error);
    }
  },
  
  async getMedicationById(id: string): Promise<Medication | undefined> {
    return db.medications.get(id);
  },
  
  async updateMedication(id: string, changes: Partial<Medication>): Promise<Medication> {
    try {
      const existing = await db.medications.get(id);
      if (!existing) throw new DatabaseError('Medicamento no encontrado');
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.medications.put(updated);
      await syncMedicationReminders(updated);
      return updated;
    } catch (error) {
      log.error('Error al actualizar medicamento', error);
      throw new DatabaseError('No se pudo actualizar el medicamento', error);
    }
  },
  
  async deleteMedication(id: string): Promise<void> {
    try {
      const existing = await db.medications.get(id);
      if (!existing) return;
      const updated = updateBaseRecord({ ...existing, isDeleted: true, isActive: false });
      await db.medications.put(updated);
      await syncMedicationReminders(updated);
    } catch (error) {
      log.error('Error al eliminar medicamento', error);
      throw new DatabaseError('No se pudo eliminar el medicamento', error);
    }
  },
  
  // ─── REGISTROS DE TOMAS ──────────────────────────────────────────────────
  
  async createLog(input: CreateMedicationLogInput): Promise<MedicationLog> {
    try {
      const record: MedicationLog = {
        ...createBaseRecord(),
        ...input,
        logDate: input.logDate ?? format(new Date(), 'yyyy-MM-dd'),
      };
      await db.medicationLogs.add(record);
      return record;
    } catch (error) {
      log.error('Error al registrar toma', error);
      throw new DatabaseError('No se pudo registrar la toma', error);
    }
  },
  
  async getLogsByDate(date: string): Promise<MedicationLog[]> {
    try {
      return await db.medicationLogs
        .where('logDate').equals(date)
        .and(l => !l.isDeleted)
        .toArray();
    } catch (error) {
      log.error('Error al obtener registros de tomas', error);
      throw new DatabaseError('No se pudieron cargar los registros', error);
    }
  },
  
  async getAllLogs(): Promise<MedicationLog[]> {
    try {
      return await db.medicationLogs
        .where('isDeleted').equals(0)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      log.error('Error al obtener todos los registros de tomas', error);
      throw new DatabaseError('No se pudieron cargar los registros', error);
    }
  },
  
  async getLogsByDateRange(startDate: string, endDate: string): Promise<MedicationLog[]> {
    try {
      return await db.medicationLogs
        .where('logDate').between(startDate, endDate, true, true)
        .and(l => !l.isDeleted)
        .toArray();
    } catch (error) {
      log.error('Error al filtrar registros de tomas', error);
      throw new DatabaseError('No se pudieron filtrar los registros', error);
    }
  },
  
  async updateLog(id: string, changes: Partial<MedicationLog>): Promise<MedicationLog> {
    try {
      const existing = await db.medicationLogs.get(id);
      if (!existing) throw new DatabaseError('Registro no encontrado');
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.medicationLogs.put(updated);
      return updated;
    } catch (error) {
      log.error('Error al actualizar registro de toma', error);
      throw new DatabaseError('No se pudo actualizar el registro', error);
    }
  },

  async deleteLog(id: string): Promise<void> {
    try {
      const existing = await db.medicationLogs.get(id);
      if (!existing) return;
      await db.medicationLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
    } catch (error) {
      log.error('Error al eliminar registro de toma', error);
      throw new DatabaseError('No se pudo eliminar el registro', error);
    }
  },
  
  // Respaldo
  async getAllForBackup(): Promise<{ medications: Medication[]; logs: MedicationLog[] }> {
    return {
      medications: await db.medications.toArray(),
      logs: await db.medicationLogs.toArray(),
    };
  },
  
  async restoreFromBackup(medications: Medication[], logs: MedicationLog[]): Promise<void> {
    await db.medications.bulkPut(medications);
    await db.medicationLogs.bulkPut(logs);
  },
};
