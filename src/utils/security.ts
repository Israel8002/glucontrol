/**
 * Utilidades de seguridad: hashing de PIN y cifrado de respaldos.
 * Todo se ejecuta 100% en el cliente, sin transmisión de datos.
 */

/**
 * Genera un hash SHA-256 de texto (para PIN)
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'glucontrol_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica si un PIN coincide con su hash
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

/**
 * Genera una clave AES-GCM desde una contraseña (para cifrar respaldos)
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra datos JSON para exportación de respaldo
 * @returns Base64 del respaldo cifrado
 */
export async function encryptBackup(data: unknown, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const jsonStr = JSON.stringify(data);
  const plaintext = encoder.encode(jsonStr);
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  
  // Combinar salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Descifra un respaldo cifrado
 */
export async function decryptBackup(encryptedBase64: string, password: string): Promise<unknown> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  
  const key = await deriveKey(password, salt);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

/**
 * Genera un respaldo sin cifrado (JSON plano) para uso básico
 */
export function createPlainBackup(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Descarga un archivo en el navegador
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'application/json'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Lee un archivo seleccionado por el usuario como texto
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Valida que un string es JSON válido
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ─── Alias para compatibilidad con BackupPage ─────────────────────────────────
export const createEncryptedBackup = encryptBackup;
export const restoreEncryptedBackup = decryptBackup;
