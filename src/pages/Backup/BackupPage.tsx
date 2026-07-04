import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Trash2, Shield, AlertTriangle, Clock, Lock, Key } from 'lucide-react';
import { db } from '@/database/db';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Modal } from '@/components/ui/Modal/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { useSettingsStore } from '@/stores/settingsStore';
import { createEncryptedBackup, restoreEncryptedBackup, hashPin } from '@/utils/security';
import { formatDisplayDate } from '@/utils/date';
import styles from './BackupPage.module.css';

/**
 * Página de respaldo y restauración protegida por contraseña configurada en Ajustes.
 * Exporta/importa un JSON cifrado con AES-GCM localmente.
 */
export const BackupPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettingsStore();
  const { success, error: toastError, warning } = useToast();
  
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Contraseñas y estados de desbloqueo
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const hasBackupPassword = !!settings?.backupPasswordHash;

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unlockPassword.trim()) return;
    
    try {
      const hashed = await hashPin(unlockPassword.trim());
      if (hashed === settings?.backupPasswordHash) {
        setIsUnlocked(true);
        setUnlockError('');
      } else {
        setUnlockError('Contraseña incorrecta');
      }
    } catch {
      setUnlockError('Error al validar la contraseña');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Recopilar todos los datos de IndexedDB
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        glucoseReadings: await db.glucoseReadings.toArray(),
        medications: await db.medications.toArray(),
        medicationLogs: await db.medicationLogs.toArray(),
        insulinTypes: await db.insulinTypes.toArray(),
        insulinLogs: await db.insulinLogs.toArray(),
        weightLogs: await db.weightLogs.toArray(),
        bloodPressureLogs: await db.bloodPressureLogs.toArray(),
        exerciseLogs: await db.exerciseLogs.toArray(),
        nutritionLogs: await db.nutritionLogs.toArray(),
        reminders: await db.reminders.toArray(),
        patients: await db.patients.toArray(),
        settings: await db.appSettings.toArray(),
        errorLogs: await db.errorLogs.toArray(),
      };
      
      const fileContent = JSON.stringify(data, null, 2);
      const filename = `glucontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      // Descargar el archivo
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Actualizar contador y fecha de último backup
      await updateSettings({
        backupCount: (settings?.backupCount ?? 0) + 1,
        lastBackupAt: new Date().toISOString(),
      });
      
      success(`Respaldo exportado exitosamente: ${filename}`);
    } catch (err) {
      toastError('Error al exportar respaldo');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleImport = async () => {
    if (!restoreFile) {
      toastError('Selecciona un archivo de respaldo');
      return;
    }
    
    setIsImporting(true);
    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);
      
      let data: Record<string, unknown[]>;
      
      if (parsed.encrypted) {
        toastError('Este archivo de respaldo antiguo está encriptado. El nuevo sistema utiliza respaldos en formato JSON estándar.');
        setIsImporting(false);
        return;
      } else {
        data = parsed;
      }
      
      // Verificar versión
      if (!data.version || !data.exportedAt) {
        toastError('Archivo de respaldo inválido o corrupto');
        setIsImporting(false);
        return;
      }
      
      // Restaurar datos en la BD
      await db.transaction('rw',
        [db.glucoseReadings, db.medications, db.medicationLogs, db.insulinTypes,
         db.insulinLogs, db.weightLogs, db.bloodPressureLogs, db.exerciseLogs,
         db.nutritionLogs, db.reminders, db.patients, db.appSettings],
        async () => {
          // Limpiar antes de poblar
          await Promise.all([
            db.glucoseReadings.clear(), db.medications.clear(),
            db.medicationLogs.clear(), db.insulinTypes.clear(),
            db.insulinLogs.clear(), db.weightLogs.clear(),
            db.bloodPressureLogs.clear(), db.exerciseLogs.clear(),
            db.nutritionLogs.clear(), db.reminders.clear(),
            db.patients.clear(), db.appSettings.clear()
          ]);

          if (data.glucoseReadings?.length) await db.glucoseReadings.bulkPut(data.glucoseReadings as never[]);
          if (data.medications?.length) await db.medications.bulkPut(data.medications as never[]);
          if (data.medicationLogs?.length) await db.medicationLogs.bulkPut(data.medicationLogs as never[]);
          if (data.insulinTypes?.length) await db.insulinTypes.bulkPut(data.insulinTypes as never[]);
          if (data.insulinLogs?.length) await db.insulinLogs.bulkPut(data.insulinLogs as never[]);
          if (data.weightLogs?.length) await db.weightLogs.bulkPut(data.weightLogs as never[]);
          if (data.bloodPressureLogs?.length) await db.bloodPressureLogs.bulkPut(data.bloodPressureLogs as never[]);
          if (data.exerciseLogs?.length) await db.exerciseLogs.bulkPut(data.exerciseLogs as never[]);
          if (data.nutritionLogs?.length) await db.nutritionLogs.bulkPut(data.nutritionLogs as never[]);
          if (data.reminders?.length) await db.reminders.bulkPut(data.reminders as never[]);
          if (data.patients?.length) await db.patients.bulkPut(data.patients as never[]);
          if (data.settings?.length) await db.appSettings.bulkPut(data.settings as never[]);
        }
      );
      
      success('Respaldo restaurado correctamente. Recargando la aplicación...');
      setShowRestoreModal(false);
      setRestoreFile(null);
      
      // Recargar la aplicación para cargar el estado del store y base de datos de inmediato
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (err) {
      toastError('Archivo de respaldo corrupto o inválido.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await db.transaction('rw',
        [db.glucoseReadings, db.medications, db.medicationLogs, db.insulinTypes,
         db.insulinLogs, db.weightLogs, db.bloodPressureLogs, db.exerciseLogs,
         db.nutritionLogs, db.reminders, db.errorLogs],
        async () => {
          await Promise.all([
            db.glucoseReadings.clear(), db.medications.clear(),
            db.medicationLogs.clear(), db.insulinTypes.clear(),
            db.insulinLogs.clear(), db.weightLogs.clear(),
            db.bloodPressureLogs.clear(), db.exerciseLogs.clear(),
            db.nutritionLogs.clear(), db.reminders.clear(),
            db.errorLogs.clear(),
          ]);
        }
      );
      success('Todos los datos han sido eliminados');
      setShowClearModal(false);
    } catch {
      toastError('Error al limpiar datos');
    } finally {
      setIsClearing(false);
    }
  };

  // ─── PANTALLA 2: Bloqueado por Contraseña de Respaldos ────────────────────────
  if (hasBackupPassword && !isUnlocked) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Shield size={24} className={styles.headerIcon} />
            <h1>Respaldo y datos</h1>
          </div>
        </div>
        <Card className={styles.lockContainer}>
          <Lock size={48} className={styles.lockIcon} />
          <h2>Sección Protegida</h2>
          <p className={styles.lockDesc}>
            Ingresa tu contraseña de respaldos para acceder a las opciones de exportación, importación y limpieza de datos.
          </p>
          <form onSubmit={handleUnlock} className={styles.lockForm}>
            <Input
              label="Contraseña de respaldos"
              type="password"
              placeholder="Introduce tu contraseña"
              value={unlockPassword}
              onChange={e => setUnlockPassword(e.target.value)}
              id="unlock-password"
            />
            {unlockError && <p className={styles.errorText}>{unlockError}</p>}
            
            {settings?.backupPasswordHint && (
              <p className={styles.lockHint}>
                <strong>Recordatorio:</strong> {settings.backupPasswordHint}
              </p>
            )}
            
            <Button variant="primary" type="submit" fullWidth id="btn-unlock-backup">
              Desbloquear
            </Button>
          </form>
          
          <div className={styles.lockDivider} />
          
          <p className={styles.lockHint} style={{ textAlign: 'center' }}>
            ¿Quieres restaurar un respaldo directamente para recuperar tu información?
          </p>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => setShowRestoreModal(true)}
            leftIcon={<Upload size={18} />}
            id="btn-import-locked"
          >
            Importar respaldo (.json)
          </Button>
        </Card>

        {/* Modal de restauración desde pantalla bloqueada */}
        <Modal isOpen={showRestoreModal} onClose={() => { setShowRestoreModal(false); setRestoreFile(null); }} title="Importar respaldo directo" id="restore-modal-locked">
          <div className={styles.form}>
            <div className={styles.filePickerWrapper}>
              <label className={styles.filePickerLabel} htmlFor="backup-file-locked">
                {restoreFile ? restoreFile.name : 'Seleccionar archivo (.json)'}
              </label>
              <input
                id="backup-file-locked"
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={e => setRestoreFile(e.target.files?.[0] ?? null)}
              />
            </div>
            
            <div className={styles.formActions}>
              <Button variant="ghost" onClick={() => { setShowRestoreModal(false); setRestoreFile(null); }}>Cancelar</Button>
              <Button variant="primary" onClick={handleImport} loading={isImporting} disabled={!restoreFile} fullWidth>
                Restaurar e Importar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ─── PANTALLA 3: Desbloqueada (Sección Desbloqueada) ─────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Shield size={24} className={styles.headerIcon} />
          <h1>Respaldo y datos</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsUnlocked(false)} id="btn-lock-backup">
          Bloquear
        </Button>
      </div>
      
      {/* Información del último backup */}
      {settings?.lastBackupAt && (
        <Card className={styles.infoCard}>
          <Clock size={18} className={styles.infoIcon} />
          <div>
            <p className={styles.infoText}>Último respaldo</p>
            <p className={styles.infoDate}>
              {formatDisplayDate(settings.lastBackupAt.slice(0, 10))} · {settings.lastBackupAt.slice(11, 16)}
            </p>
          </div>
          <div className={styles.infoCount}>
            <span className={styles.infoCountNum}>{settings.backupCount ?? 0}</span>
            <span className={styles.infoCountLabel}>respaldos</span>
          </div>
        </Card>
      )}
      
      {/* EXPORTAR */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Exportar datos</h2>
        <Card className={styles.actionCard}>
          <div className={styles.actionDescription}>
            <Download size={20} className={styles.actionIcon} />
            <div>
              <p className={styles.actionTitle}>Exportar respaldo (.json)</p>
              <p className={styles.actionDesc}>
                Descarga un archivo JSON estándar con el historial clínico completo de tu aplicación.
              </p>
            </div>
          </div>
          
          <Button
            variant="primary"
            fullWidth
            onClick={handleExport}
            loading={isExporting}
            leftIcon={<Download size={18} />}
            id="btn-export"
          >
            Exportar respaldo (.json)
          </Button>
        </Card>
      </div>
      
      {/* IMPORTAR */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Importar datos</h2>
        <Card className={styles.actionCard}>
          <div className={styles.actionDescription}>
            <Upload size={20} className={styles.actionIcon} />
            <div>
              <p className={styles.actionTitle}>Restaurar respaldo (.json)</p>
              <p className={styles.actionDesc}>
                Carga un archivo de respaldo en formato JSON para restaurar todos tus datos.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowRestoreModal(true)}
            leftIcon={<Upload size={18} />}
            id="btn-import"
          >
            Seleccionar archivo de respaldo
          </Button>
        </Card>
      </div>
      
      {/* ZONE DE PELIGRO */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitleDanger}>Zona de peligro</h2>
        <Card className={styles.dangerCard}>
          <div className={styles.actionDescription}>
            <AlertTriangle size={20} className={styles.dangerIcon} />
            <div>
              <p className={styles.actionTitle}>Eliminar todos los datos</p>
              <p className={styles.actionDesc}>
                Borra permanentemente todos los registros. Los ajustes y perfil se conservan.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowClearModal(true)}
            leftIcon={<Trash2 size={18} />}
            id="btn-clear-all"
          >
            Eliminar todos los datos
          </Button>
        </Card>
      </div>
      
      {/* Modal restaurar */}
      <Modal isOpen={showRestoreModal} onClose={() => { setShowRestoreModal(false); setRestoreFile(null); }} title="Restaurar respaldo" id="restore-modal">
        <div className={styles.form}>
          <div className={styles.filePickerWrapper}>
            <label className={styles.filePickerLabel} htmlFor="backup-file">
              {restoreFile ? restoreFile.name : 'Seleccionar archivo (.json)'}
            </label>
            <input
              id="backup-file"
              type="file"
              accept=".json"
              className={styles.fileInput}
              onChange={e => setRestoreFile(e.target.files?.[0] ?? null)}
            />
          </div>
          
          <div className={styles.warningBox}>
            <AlertTriangle size={16} className={styles.warningIcon} />
            <p>Los datos existentes en IndexedDB serán sobreescritos por el respaldo.</p>
          </div>
          
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowRestoreModal(false); setRestoreFile(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleImport} loading={isImporting} disabled={!restoreFile} fullWidth>
              Restaurar
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Confirmación borrar todo */}
      <ConfirmDialog
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearAll}
        title="Eliminar todos los datos"
        message="Esta acción es IRREVERSIBLE. Se borrarán todos los registros. ¿Deseas continuar?"
        confirmLabel="Sí, eliminar todo"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isClearing}
      />
    </div>
  );
};
