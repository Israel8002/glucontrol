import type { BMICategory, BloodPressureCategory } from '@/types';

/**
 * Calcula el Índice de Masa Corporal (IMC)
 * @param weightKg Peso en kilogramos
 * @param heightCm Altura en centímetros
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Clasifica el IMC según categorías de la OMS
 */
export function classifyBMI(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese_1';
  if (bmi < 40) return 'obese_2';
  return 'obese_3';
}

/**
 * Clasifica la presión arterial según AHA/ACC 2017
 */
export function classifyBloodPressure(systolic: number, diastolic: number): BloodPressureCategory {
  if (systolic >= 180 || diastolic >= 110) return 'crisis';
  if (systolic >= 160 || diastolic >= 100) return 'stage2';
  if (systolic >= 140 || diastolic >= 90) return 'stage1';
  return 'normal';
}

/**
 * Calcula la edad en años desde la fecha de nacimiento
 */
export function calculateAge(birthDateStr: string): number {
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Convierte peso de lb a kg
 */
export function lbToKg(lb: number): number {
  return Math.round(lb * 0.453592 * 10) / 10;
}

/**
 * Convierte peso de kg a lb
 */
export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/**
 * Estima el peso corporal ideal (fórmula de Devine)
 * @param heightCm Altura en cm
 * @param isMale true para hombre, false para mujer
 */
export function idealBodyWeight(heightCm: number, isMale: boolean): number {
  const heightIn = heightCm / 2.54;
  const inchesOver5ft = Math.max(0, heightIn - 60);
  if (isMale) {
    return 50 + 2.3 * inchesOver5ft;
  }
  return 45.5 + 2.3 * inchesOver5ft;
}

/**
 * Calcula el pulso máximo estimado por edad
 */
export function maxHeartRate(age: number): number {
  return 220 - age;
}

/**
 * Calcula zonas cardíacas de entrenamiento
 */
export function heartRateZones(maxHR: number): {
  zone1: [number, number];
  zone2: [number, number];
  zone3: [number, number];
  zone4: [number, number];
  zone5: [number, number];
} {
  return {
    zone1: [Math.round(maxHR * 0.5), Math.round(maxHR * 0.6)],
    zone2: [Math.round(maxHR * 0.6), Math.round(maxHR * 0.7)],
    zone3: [Math.round(maxHR * 0.7), Math.round(maxHR * 0.8)],
    zone4: [Math.round(maxHR * 0.8), Math.round(maxHR * 0.9)],
    zone5: [Math.round(maxHR * 0.9), maxHR],
  };
}
