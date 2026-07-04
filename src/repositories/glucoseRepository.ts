import { db } from '@/database/db';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import type { GlucoseReading } from '@/entities';
import type { GlucoseContext } from '@/types';
import { determineGlucoseStatus } from '@/utils/glucose';
import { logger } from '@/core/logger';
import { DatabaseError } from '@/core/errors';
import { format } from 'date-fns';

const log = logger.forModule('GlucoseRepository');

/** Datos necesarios para crear una nueva lectura de glucosa */
export interface CreateGlucoseInput {
  value: number;
  unit: GlucoseReading['unit'];
  context: GlucoseContext;
  notes?: string;
  readingDate?: string;   // YYYY-MM-DD (por defecto: hoy)
  readingTime?: string;   // HH:mm (por defecto: ahora)
  targetMin: number;
  targetMax: number;
  hypoThreshold: number;
  hyperThreshold: number;
  severeHypoThreshold: number;
  severeHyperThreshold: number;
}

/**
 * Repositorio de lecturas de glucosa.
 * 
 * Esta capa abstrae completamente IndexedDB.
 * Para migrar a SQLite, solo se cambia la implementación aquí,
 * nunca la lógica de negocio ni los componentes.
 */
export const glucoseRepository = {
  /**
   * Crear nueva lectura de glucosa
   */
  async create(input: CreateGlucoseInput): Promise<GlucoseReading> {
    try {
      const now = new Date();
      // Siempre almacenar en mg/dL internamente
      const valueMgdl = input.unit === 'mmol/L'
        ? Math.round(input.value * 18.018)
        : input.value;
      
      const status = determineGlucoseStatus(valueMgdl, {
        targetMin: input.targetMin,
        targetMax: input.targetMax,
        hypoThreshold: input.hypoThreshold,
        hyperThreshold: input.hyperThreshold,
        severeHypoThreshold: input.severeHypoThreshold,
        severeHyperThreshold: input.severeHyperThreshold,
      });
      
      const record: GlucoseReading = {
        ...createBaseRecord(),
        value: valueMgdl,
        unit: input.unit,
        context: input.context,
        status,
        notes: input.notes,
        readingDate: input.readingDate ?? format(now, 'yyyy-MM-dd'),
        readingTime: input.readingTime ?? format(now, 'HH:mm'),
      };
      
      await db.glucoseReadings.add(record);
      log.info(`Glucosa registrada: ${valueMgdl} mg/dL [${status}]`);
      return record;
    } catch (error) {
      log.error('Error al guardar glucosa', error);
      throw new DatabaseError('No se pudo guardar la lectura de glucosa', error);
    }
  },
  
  /**
   * Obtener todas las lecturas (no eliminadas) ordenadas por fecha desc
   */
  async getAll(): Promise<GlucoseReading[]> {
    try {
      return await db.glucoseReadings
        .where('isDeleted')
        .equals(0)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      log.error('Error al obtener glucosas', error);
      throw new DatabaseError('No se pudieron cargar las lecturas', error);
    }
  },
  
  /**
   * Obtener lecturas por rango de fechas
   */
  async getByDateRange(startDate: string, endDate: string): Promise<GlucoseReading[]> {
    try {
      return await db.glucoseReadings
        .where('readingDate')
        .between(startDate, endDate, true, true)
        .and(r => !r.isDeleted)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      log.error('Error al filtrar glucosas por fecha', error);
      throw new DatabaseError('No se pudieron filtrar las lecturas', error);
    }
  },
  
  /**
   * Obtener lecturas del día actual
   */
  async getToday(): Promise<GlucoseReading[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getByDateRange(today, today);
  },

  /**
   * Obtener lecturas de una fecha específica
   */
  async getByDate(date: string): Promise<GlucoseReading[]> {
    return this.getByDateRange(date, date);
  },
  
  /**
   * Obtener la última lectura registrada
   */
  async getLatest(): Promise<GlucoseReading | undefined> {
    try {
      const readings = await db.glucoseReadings
        .where('isDeleted')
        .equals(0)
        .reverse()
        .sortBy('timestamp');
      return readings[0];
    } catch (error) {
      log.error('Error al obtener última glucosa', error);
      return undefined;
    }
  },
  
  /**
   * Obtener lectura por ID
   */
  async getById(id: string): Promise<GlucoseReading | undefined> {
    try {
      return await db.glucoseReadings.get(id);
    } catch (error) {
      log.error('Error al obtener glucosa por ID', error);
      throw new DatabaseError('No se encontró la lectura', error);
    }
  },
  
  /**
   * Actualizar lectura existente
   */
  async update(id: string, changes: Partial<Omit<GlucoseReading, keyof import('@/entities').BaseRecord>>): Promise<GlucoseReading> {
    try {
      const existing = await db.glucoseReadings.get(id);
      if (!existing) throw new DatabaseError('Lectura no encontrada');
      
      const updated = updateBaseRecord({ ...existing, ...changes });
      await db.glucoseReadings.put(updated);
      log.info(`Glucosa actualizada: ${id}`);
      return updated;
    } catch (error) {
      log.error('Error al actualizar glucosa', error);
      throw new DatabaseError('No se pudo actualizar la lectura', error);
    }
  },
  
  /**
   * Eliminación lógica (nunca eliminar físicamente)
   */
  async delete(id: string): Promise<void> {
    try {
      const existing = await db.glucoseReadings.get(id);
      if (!existing) return;
      const updated = updateBaseRecord({ ...existing, isDeleted: true, isActive: false });
      await db.glucoseReadings.put(updated);
      log.info(`Glucosa eliminada (lógico): ${id}`);
    } catch (error) {
      log.error('Error al eliminar glucosa', error);
      throw new DatabaseError('No se pudo eliminar la lectura', error);
    }
  },
  
  /**
   * Contar lecturas totales (no eliminadas)
   */
  async count(): Promise<number> {
    try {
      return await db.glucoseReadings
        .where('isDeleted')
        .equals(0)
        .count();
    } catch {
      return 0;
    }
  },
  
  /**
   * Obtener todos los registros incluyendo eliminados (para respaldo)
   */
  async getAllForBackup(): Promise<GlucoseReading[]> {
    return db.glucoseReadings.toArray();
  },
  
  /**
   * Restaurar registros desde respaldo
   */
  async restoreFromBackup(records: GlucoseReading[]): Promise<void> {
    await db.glucoseReadings.bulkPut(records);
    log.info(`Glucosas restauradas: ${records.length} registros`);
  },
};
