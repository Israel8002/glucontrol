/**
 * Repositorio de Pacientes (para perfil del usuario)
 * Reutiliza el patrón base de settingsRepository
 */

import { db } from '@/database/db';
import type { Patient } from '@/entities';
import { createBaseRecord, updateBaseRecord } from '@/database/helpers';
import { today } from '@/utils/date';
import { logger } from '@/core/logger';

const log = logger.forModule('PatientRepository');

interface CreatePatientInput {
  name: string;
  lastName: string;
  birthDate: string;
  diabetesType: Patient['diabetesType'];
  height: number;
  doctorName?: string;
  bloodType?: string;
}

export const patientRepository = {
  async get(): Promise<Patient | undefined> {
    return db.patients.orderBy('createdTime').last();
  },

  async create(input: CreatePatientInput): Promise<Patient> {
    const record: Patient = {
      ...createBaseRecord(),
      ...input,
      age: 0, // se calcula en UI
    };
    await db.patients.add(record);
    log.info('Paciente creado');
    return record;
  },

  async update(input: Partial<Patient>): Promise<Patient> {
    const existing = await db.patients.orderBy('createdTime').last();
    if (!existing) throw new Error('No existe perfil de paciente');
    const updated = { ...existing, ...updateBaseRecord(existing), ...input };
    await db.patients.put(updated);
    return updated;
  },
};
