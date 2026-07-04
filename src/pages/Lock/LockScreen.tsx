import React, { useState, useCallback } from 'react';
import { Fingerprint, Delete, Droplets } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './LockScreen.module.css';

const PIN_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];

/**
 * Pantalla de bloqueo con teclado numérico PIN.
 * Soporte para biometría mediante Web Authentication API.
 */
export const LockScreen: React.FC = () => {
  const { unlock, failedAttempts } = useAuthStore();
  const { settings } = useSettingsStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  
  const handleDigit = useCallback((digit: number | string) => {
    if (digit === 'del') {
      setPin(prev => prev.slice(0, -1));
      setError('');
      return;
    }
    if (typeof digit === 'string' && digit === '') return;
    
    const newPin = pin + String(digit);
    setPin(newPin);
    setError('');
    
    // Auto-submit cuando se completan 4+ dígitos
    if (newPin.length >= 4) {
      submitPin(newPin);
    }
  }, [pin]);
  
  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true);
    try {
      await unlock(pinToSubmit, 'pin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN incorrecto');
      setPin('');
      setShakeKey(k => k + 1);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBiometric = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Intentar con Web Authentication API (Passkeys / WebAuthn)
      await unlock(undefined, 'biometric');
    } catch {
      setError('Autenticación biométrica no disponible');
    } finally {
      setIsLoading(false);
    }
  };
  
  const dotCount = Math.max(4, pin.length + 1);
  
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <Droplets size={48} className={styles.logoIcon} />
          <h1 className={styles.appName}>GluControl</h1>
        </div>
        
        {/* Indicadores de PIN */}
        <div
          key={shakeKey}
          className={`${styles.dotsContainer} ${error ? styles.shake : ''}`}
          aria-label={`PIN: ${pin.length} dígitos ingresados`}
        >
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i < pin.length ? styles.filled : ''}`}
            />
          ))}
        </div>
        
        {/* Error */}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        
        {failedAttempts > 0 && !error && (
          <p className={styles.warning}>
            {failedAttempts} {failedAttempts === 1 ? 'intento' : 'intentos'} fallidos
          </p>
        )}
        
        {/* Teclado numérico */}
        <div className={styles.keypad} role="group" aria-label="Teclado PIN">
          {PIN_DIGITS.map((digit, idx) => {
            if (digit === '') return <div key={idx} className={styles.keyEmpty} />;
            
            if (digit === 'del') {
              return (
                <button
                  key={idx}
                  className={styles.keySpecial}
                  onClick={() => handleDigit('del')}
                  disabled={pin.length === 0 || isLoading}
                  aria-label="Borrar último dígito"
                >
                  <Delete size={22} />
                </button>
              );
            }
            
            return (
              <button
                key={idx}
                className={styles.key}
                onClick={() => handleDigit(digit)}
                disabled={isLoading || pin.length >= 6}
                aria-label={String(digit)}
              >
                {digit}
              </button>
            );
          })}
        </div>
        
        {/* Biometría */}
        {settings?.biometricEnabled && (
          <button
            className={styles.biometricBtn}
            onClick={handleBiometric}
            disabled={isLoading}
            aria-label="Desbloquear con huella digital"
          >
            <Fingerprint size={32} />
            <span>Huella digital</span>
          </button>
        )}
      </div>
    </div>
  );
};
