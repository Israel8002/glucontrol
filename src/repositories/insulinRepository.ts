import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { InsulinTypeRecord, InsulinLog } from '@/entities';
import type { InsulinType, InsulinSite } from '@/types';
import { logger } from '@/core/logger';
import { DatabaseError } from '@/core/errors';
import { format } from 'date-fns';

const log = logger.forModule('InsulinRepository');

export interface CreateInsulinTypeInput {
  name: string;
  type: InsulinType;
  units: number;
  color?: string;
  notes?: string;
}

export interface CreateInsulinLogInput {
  insulinId: string;
  units: number;
  site: InsulinSite;
  type: InsulinType;
  logDate?: string;
  logTime?: string;
  glucoseReadingId?: string;
  correctionDose: boolean;
  notes?: string;
}

export const insulinRepository = {
  // ─── TIPOS DE INSULINA ──────────────────────────────────────────────────────
  
  async createType(input: CreateInsulinTypeInput): Promise<InsulinTypeRecord> {
    try {
      const record: InsulinTypeRecord = { ...createBaseRecord(), ...input };
      await db.insulinTypes.add(record);
      log.info(`Tipo de insulina creado: ${input.name}`);
      return record;
    } catch (error) {
      log.error('Error al crear tipo de insulina', error);
      throw new DatabaseError('No se pudo crear el tipo de insulina', error);
    }
  },
  
  async getAllTypes(): Promise<InsulinTypeRecord[]> {
    try {
      return await db.insulinTypes
        .where('isDeleted').equals(0)
        .and(t => t.isActive)
        .toArray();
    } catch (error) {
      log.error('Error al obtener tipos de insulina', error);
      throw new DatabaseError('No se pudieron cargar los tipos de insulina', error);
    }
  },
  
  async updateType(id: string, changes: Partial<InsulinTypeRecord>): Promise<InsulinTypeRecord> {
    try {
      const existing = await db.insulinTypes.get(id);
      if (!existing) throw new DatabaseError('Tipo de insulina no encontrado');
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.insulinTypes.put(updated);
      return updated;
    } catch (error) {
      log.error('Error al actualizar tipo de insulina', error);
      throw new DatabaseError('No se pudo actualizar el tipo de insulina', error);
    }
  },
  
  async deleteType(id: string): Promise<void> {
    const existing = await db.insulinTypes.get(id);
    if (!existing) return;
    await db.insulinTypes.put(updateBaseRecord({ ...existing, isDeleted: true, isActive: false }));
  },
  
  // ─── REGISTROS DE INSULINA ─────────────────────────────────────────────────
  
  async createLog(input: CreateInsulinLogInput): Promise<InsulinLog> {
    try {
      const now = new Date();
      const record: InsulinLog = {
        ...createBaseRecord(),
        ...input,
        logDate: input.logDate ?? format(now, 'yyyy-MM-dd'),
        logTime: input.logTime ?? format(now, 'HH:mm'),
      };
      await db.insulinLogs.add(record);
      log.info(`Insulina registrada: ${input.units} U`);
      return record;
    } catch (error) {
      log.error('Error al registrar insulina', error);
      throw new DatabaseError('No se pudo registrar la dosis de insulina', error);
    }
  },
  
  async getLogsByDateRange(startDate: string, endDate: string): Promise<InsulinLog[]> {
    try {
      return await db.insulinLogs
        .where('logDate').between(startDate, endDate, true, true)
        .and(l => !l.isDeleted)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      log.error('Error al filtrar registros de insulina', error);
      throw new DatabaseError('No se pudieron filtrar los registros', error);
    }
  },
  
  async getToday(): Promise<InsulinLog[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getLogsByDateRange(today, today);
  },

  /** Alias de getLogsByDateRange para compatibilidad con páginas */
  async getByDateRange(startDate: string, endDate: string): Promise<InsulinLog[]> {
    return this.getLogsByDateRange(startDate, endDate);
  },

  /** Obtener registros de un día específico */
  async getByDate(date: string): Promise<InsulinLog[]> {
    return this.getLogsByDateRange(date, date);
  },
  
  async deleteLog(id: string): Promise<void> {
    const existing = await db.insulinLogs.get(id);
    if (!existing) return;
    await db.insulinLogs.put(updateBaseRecord({ ...existing, isDeleted: true }));
  },
  
  async getAllLogs(): Promise<InsulinLog[]> {
    return await db.insulinLogs
      .where('isDeleted').equals(0)
      .reverse()
      .sortBy('timestamp');
  },
  
  async getAllForBackup(): Promise<{ types: InsulinTypeRecord[]; logs: InsulinLog[] }> {
    return {
      types: await db.insulinTypes.toArray(),
      logs: await db.insulinLogs.toArray(),
    };
  },
  
  async restoreFromBackup(types: InsulinTypeRecord[], logs: InsulinLog[]): Promise<void> {
    await db.insulinTypes.bulkPut(types);
    await db.insulinLogs.bulkPut(logs);
  },
};
