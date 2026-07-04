import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { BaseRecord } from '@/entities';
import { DATE_FORMAT, TIME_FORMAT } from '@/core/constants';

/**
 * Crea los campos base automáticos para cualquier nuevo registro.
 * El usuario nunca ve ni ingresa estos datos manualmente.
 */
export function createBaseRecord(): Omit<BaseRecord, 'id'> & { id: string } {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    id: uuidv4(),
    createdAt: format(now, DATE_FORMAT),
    createdTime: format(now, TIME_FORMAT),
    updatedAt: format(now, DATE_FORMAT),
    updatedTime: format(now, TIME_FORMAT),
    timezone,
    timestamp: now.getTime(),
    version: 1,
    isActive: 1 as any,
    isDeleted: 0 as any,
  };
}

/**
 * Actualiza los campos de modificación de un registro existente.
 */
export function updateBaseRecord<T extends BaseRecord>(record: T): T {
  const now = new Date();
  
  const isDeletedVal = record.isDeleted === true ? 1 : record.isDeleted === false ? 0 : record.isDeleted;
  const isActiveVal = record.isActive === true ? 1 : record.isActive === false ? 0 : record.isActive;

  return {
    ...record,
    isDeleted: isDeletedVal as any,
    isActive: isActiveVal as any,
    updatedAt: format(now, DATE_FORMAT),
    updatedTime: format(now, TIME_FORMAT),
    timestamp: now.getTime(),
    version: record.version + 1,
  };
}
