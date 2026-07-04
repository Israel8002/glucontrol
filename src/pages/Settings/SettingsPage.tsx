import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, Lock, Bell, Scale, Droplets, Heart,
  Palette, Info, ChevronRight, Shield, Fingerprint,
} from 'lucide-react';
import { patientRepository, settingsRepository } from '@/repositories/settingsRepository';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import type { Patient } from '@/entities';
import { Card } from '@/components/ui/Card/Card';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Switch } from '@/components/ui/Switch/Switch';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { DIABETES_TYPE_LABELS, AUTO_LOCK_OPTIONS } from '@/core/constants';
import { calculateAge } from '@/utils/health';
import { hashPin } from '@/utils/security';
import styles from './SettingsPage.module.css';

const DIABETES_OPTIONS = Object.entries(DIABETES_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const UNIT_OPTIONS = [{ value: 'mg/dL', label: 'mg/dL' }, { value: 'mmol/L', label: 'mmol/L' }];
const WEIGHT_UNIT_OPTIONS = [{ value: 'kg', label: 'Kilogramos (kg)' }, { value: 'lb', label: 'Libras (lb)' }];
const LOCK_OPTIONS = AUTO_LOCK_OPTIONS.map(o => ({ value: String(o.value), label: o.label }));
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(v => ({ value: v, label: v }));

/**
 * Página de configuración completa.
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const { setupPin, changePin, disablePin } = useAuthStore();
  const { success, error: toastError } = useToast();
  
  // Detectar si la app está en modo standalone (instalada)
  const [isStandalone, setIsStandalone] = useState(true);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(!!standalone);

      // Detectar OS
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setDeviceOS('ios');
      } else if (/android/.test(ua)) {
        setDeviceOS('android');
      } else {
        setDeviceOS('other');
      }
    };
    checkStandalone();
  }, []);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRangesModal, setShowRangesModal] = useState(false);
  const [showBpRangesModal, setShowBpRangesModal] = useState(false);
  const [showBackupPassModal, setShowBackupPassModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Formulario de perfil
  const [pName, setPName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pBirthDate, setPBirthDate] = useState('');
  const [pDiabetesType, setPDiabetesType] = useState('type2');
  const [pHeight, setPHeight] = useState(170);
  const [pDoctor, setPDoctor] = useState('');
  const [pBloodType, setPBloodType] = useState('');
  
  // Formulario de rangos
  const [rangeMin, setRangeMin] = useState(80);
  const [rangeMax, setRangeMax] = useState(180);

  // Formulario de rangos de presión arterial
  const [bpSystolicTarget, setBpSystolicTarget] = useState(120);
  const [bpDiastolicTarget, setBpDiastolicTarget] = useState(80);

  // Contraseña de respaldo
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordHint, setBackupPasswordHint] = useState('');
  
  // Formulario de PIN
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [oldPin, setOldPin] = useState('');
  
  const load = async () => {
    setIsLoading(true);
    try {
      const [pt] = await Promise.all([patientRepository.get()]);
      setPatient(pt);
      if (pt) {
        setPName(pt.name); setPLastName(pt.lastName);
        setPBirthDate(pt.birthDate); setPDiabetesType(pt.diabetesType);
        setPHeight(pt.height); setPDoctor(pt.doctorName ?? '');
        setPBloodType(pt.bloodType ?? '');
      }
      setRangeMin(settings?.glucoseTargetMin ?? 80);
      setRangeMax(settings?.glucoseTargetMax ?? 180);
      setBpSystolicTarget(settings?.bpSystolicMax ?? 120);
      setBpDiastolicTarget(settings?.bpDiastolicMax ?? 80);
      setBackupPasswordHint(settings?.backupPasswordHint ?? '');
    } catch { } finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, [settings]);
  
  const handleSaveProfile = async () => {
    if (!pName.trim() || !pBirthDate) { toastError('Nombre y fecha de nacimiento son requeridos'); return; }
    setIsSaving(true);
    try {
      const data = {
        name: pName.trim(), lastName: pLastName.trim(), birthDate: pBirthDate,
        diabetesType: pDiabetesType as Patient['diabetesType'],
        height: pHeight, doctorName: pDoctor.trim() || undefined,
        bloodType: pBloodType || undefined,
      };
      if (patient) await patientRepository.update(data);
      else await patientRepository.create(data);
      await load();
      setShowProfileModal(false);
      success('Perfil actualizado');
    } catch { toastError('Error al guardar perfil'); }
    finally { setIsSaving(false); }
  };
  
  const handleSaveRanges = async () => {
    if (rangeMin >= rangeMax) { toastError('El mínimo debe ser menor al máximo'); return; }
    setIsSaving(true);
    try {
      await updateSettings({ glucoseTargetMin: rangeMin, glucoseTargetMax: rangeMax });
      setShowRangesModal(false);
      success('Rangos actualizados');
    } catch { toastError('Error al guardar rangos'); }
    finally { setIsSaving(false); }
  };

  const handleSaveBpRanges = async () => {
    if (bpSystolicTarget <= 0 || bpDiastolicTarget <= 0) { toastError('Ingresa rangos válidos'); return; }
    setIsSaving(true);
    try {
      await updateSettings({ bpSystolicMax: bpSystolicTarget, bpDiastolicMax: bpDiastolicTarget });
      setShowBpRangesModal(false);
      success('Rangos de presión arterial actualizados');
    } catch { toastError('Error al guardar rangos'); }
    finally { setIsSaving(false); }
  };

  const handleSaveBackupPassword = async () => {
    if (!backupPassword.trim()) { toastError('Ingresa una contraseña válida'); return; }
    if (!backupPasswordHint.trim()) { toastError('Ingresa un recordatorio de contraseña'); return; }
    setIsSaving(true);
    try {
      const hashed = await hashPin(backupPassword.trim());
      await updateSettings({
        backupPasswordHash: hashed,
        backupPasswordHint: backupPasswordHint.trim(),
      });
      setShowBackupPassModal(false);
      setBackupPassword('');
      success('Contraseña de respaldos configurada');
    } catch {
      toastError('Error al guardar contraseña');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSetupPin = async () => {
    if (pin.length < 4) { toastError('El PIN debe tener al menos 4 dígitos'); return; }
    if (pin !== pinConfirm) { toastError('Los PINs no coinciden'); return; }
    setIsSaving(true);
    try {
      await setupPin(pin);
      setShowPinModal(false);
      setPin(''); setPinConfirm('');
      success('PIN configurado correctamente');
    } catch (e) { toastError(e instanceof Error ? e.message : 'Error al configurar PIN'); }
    finally { setIsSaving(false); }
  };
  
  const handleDisablePin = async () => {
    setIsSaving(true);
    try {
      await disablePin(oldPin);
      setShowChangePinModal(false);
      setOldPin('');
      success('PIN desactivado');
    } catch (e) { toastError(e instanceof Error ? e.message : 'PIN incorrecto'); }
    finally { setIsSaving(false); }
  };
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}><Settings size={24} className={styles.headerIcon} /><h1>Configuración</h1></div>
      </div>
      
      {/* Perfil */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Perfil del paciente</h2>
        <Card className={styles.settingGroup}>
          <button className={styles.settingRow} onClick={() => setShowProfileModal(true)} id="btn-edit-profile">
            <div className={styles.settingLeft}>
              <User size={20} className={styles.settingIcon} />
              <div>
                <span className={styles.settingLabel}>
                  {patient ? `${patient.name} ${patient.lastName}` : 'Configurar perfil'}
                </span>
                {patient && (
                  <span className={styles.settingDesc}>
                    {calculateAge(patient.birthDate)} años · {DIABETES_TYPE_LABELS[patient.diabetesType]}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </Card>
      </div>
      
      {/* Glucosa */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Glucosa</h2>
        <Card className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Droplets size={20} className={styles.settingIcon} />
              <span className={styles.settingLabel}>Unidad</span>
            </div>
            <Select
              options={UNIT_OPTIONS}
              value={settings?.glucoseUnit ?? 'mg/dL'}
              onChange={e => updateSettings({ glucoseUnit: e.target.value as 'mg/dL' | 'mmol/L' })}
              id="setting-glucose-unit"
              fullWidth={false}
            />
          </div>
          <div className={styles.divider} />
          <button className={styles.settingRow} onClick={() => setShowRangesModal(true)} id="btn-glucose-ranges">
            <div className={styles.settingLeft}>
              <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎯</div>
              <div>
                <span className={styles.settingLabel}>Rango objetivo</span>
                <span className={styles.settingDesc}>{settings?.glucoseTargetMin}–{settings?.glucoseTargetMax} {settings?.glucoseUnit}</span>
              </div>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </Card>
      </div>
      
      {/* Peso */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Peso</h2>
        <Card className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Scale size={20} className={styles.settingIcon} />
              <span className={styles.settingLabel}>Unidad</span>
            </div>
            <Select
              options={WEIGHT_UNIT_OPTIONS}
              value={settings?.weightUnit ?? 'kg'}
              onChange={e => updateSettings({ weightUnit: e.target.value as 'kg' | 'lb' })}
              id="setting-weight-unit"
              fullWidth={false}
            />
          </div>
        </Card>
      </div>

      {/* Presión Arterial */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Presión Arterial</h2>
        <Card className={styles.settingGroup}>
          <button className={styles.settingRow} onClick={() => setShowBpRangesModal(true)} id="btn-bp-ranges">
            <div className={styles.settingLeft}>
              <Heart size={20} className={styles.settingIcon} style={{ color: 'var(--color-danger)' }} />
              <div>
                <span className={styles.settingLabel}>Rango objetivo máximo</span>
                <span className={styles.settingDesc}>
                  Sistólica: {settings?.bpSystolicMax ?? 120} mmHg · Diastólica: {settings?.bpDiastolicMax ?? 80} mmHg
                </span>
              </div>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </Card>
      </div>
      
      {/* Seguridad */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Seguridad</h2>
        <Card className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Lock size={20} className={styles.settingIcon} />
              <div>
                <span className={styles.settingLabel}>PIN de seguridad</span>
                <span className={styles.settingDesc}>{settings?.pinEnabled ? 'Activado' : 'Desactivado'}</span>
              </div>
            </div>
            <Button
              variant={settings?.pinEnabled ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => settings?.pinEnabled ? setShowChangePinModal(true) : setShowPinModal(true)}
              id="btn-pin"
            >
              {settings?.pinEnabled ? 'Cambiar' : 'Activar'}
            </Button>
          </div>
          
          {settings?.pinEnabled && (
            <>
              <div className={styles.divider} />
              <div className={styles.settingItem}>
                <div className={styles.settingLeft}>
                  <Shield size={20} className={styles.settingIcon} />
                  <span className={styles.settingLabel}>Bloqueo automático</span>
                </div>
                <Select
                  options={LOCK_OPTIONS}
                  value={String(settings?.autoLockMinutes ?? 5)}
                  onChange={e => updateSettings({ autoLockMinutes: Number(e.target.value) })}
                  id="setting-auto-lock"
                  fullWidth={false}
                />
              </div>
              <div className={styles.divider} />
              <div className={styles.settingItem}>
                <div className={styles.settingLeft}>
                  <Fingerprint size={20} className={styles.settingIcon} />
                  <div>
                    <span className={styles.settingLabel}>Biometría</span>
                    <span className={styles.settingDesc}>Huella digital / Face ID</span>
                  </div>
                </div>
                <Switch
                  checked={settings?.biometricEnabled ?? false}
                  onChange={v => updateSettings({ biometricEnabled: v })}
                  id="setting-biometric"
                />
              </div>
            </>
          )}
          <div className={styles.divider} />
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Shield size={20} className={styles.settingIcon} />
              <div>
                <span className={styles.settingLabel}>Contraseña de respaldos</span>
                <span className={styles.settingDesc}>
                  {settings?.backupPasswordHash ? 'Configurada (requerida para exportar/importar)' : 'Sin configurar'}
                </span>
              </div>
            </div>
            <Button
              variant={settings?.backupPasswordHash ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setShowBackupPassModal(true)}
              id="btn-backup-pass"
            >
              {settings?.backupPasswordHash ? 'Modificar' : 'Configurar'}
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Notificaciones */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notificaciones</h2>
        <Card className={styles.settingGroup}>
          <Switch
            checked={settings?.notificationsEnabled ?? true}
            onChange={v => updateSettings({ notificationsEnabled: v })}
            label="Notificaciones"
            description="Recibir alertas de recordatorios"
            id="setting-notifications"
          />
        </Card>
      </div>
      
      {/* Apariencia */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Apariencia</h2>
        <Card className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Palette size={20} className={styles.settingIcon} />
              <span className={styles.settingLabel}>Tema</span>
            </div>
            <Select
              options={[{ value: 'dark', label: 'Oscuro' }, { value: 'light', label: 'Claro' }]}
              value={settings?.theme ?? 'dark'}
              onChange={e => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
              id="setting-theme"
              fullWidth={false}
            />
          </div>
        </Card>
      </div>
      
      {/* Instalación PWA (se muestra solo si no está instalada) */}
      {!isStandalone && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--color-primary)' }}>Instalación en Celular</h2>
          <Card className={styles.settingGroup}>
            <div style={{ padding: 'var(--space-4)' }}>
              <strong style={{ display: 'block', fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                Instalar GluControl en tu pantalla de inicio
              </strong>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: 'var(--space-4)' }}>
                Para poder abrir la aplicación a pantalla completa (sin la barra de direcciones del navegador) y tener tu icono de acceso directo en tu teléfono como una aplicación nativa, sigue las siguientes instrucciones:
              </p>
              
              {deviceOS === 'ios' ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>En tu iPhone o iPad (usando Safari):</p>
                  <ol style={{ margin: '0', paddingLeft: '20px' }}>
                    <li>Pulsa el botón de <strong>Compartir</strong> <span style={{ fontSize: '15px' }}>⎋</span> (icono de un cuadro con una flecha hacia arriba en la barra inferior).</li>
                    <li>Desliza hacia abajo en el menú de opciones y selecciona <strong>"Agregar a la pantalla de inicio"</strong>.</li>
                    <li>Confirma pulsando en <strong>Agregar</strong> en la esquina superior derecha.</li>
                    <li>¡Listo! Cierra el navegador y abre GluControl desde el nuevo icono de tu pantalla.</li>
                  </ol>
                </div>
              ) : deviceOS === 'android' ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>En tu teléfono Android (usando Chrome):</p>
                  <ol style={{ margin: '0', paddingLeft: '20px' }}>
                    <li>Pulsa el menú de <strong>tres puntos</strong> en la esquina superior derecha del navegador.</li>
                    <li>Selecciona la opción <strong>"Instalar aplicación"</strong> (o "Agregar a la pantalla principal").</li>
                    <li>Confirma la instalación en la ventana emergente.</li>
                    <li>¡Listo! Abre GluControl directamente desde el nuevo icono en tu cajón de aplicaciones.</li>
                  </ol>
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>Instrucciones rápidas:</p>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    <li><strong>Android (Chrome):</strong> Abre el menú de tres puntos ➔ selecciona <strong>"Instalar aplicación"</strong> o "Agregar a pantalla principal".</li>
                    <li><strong>iOS (Safari):</strong> Pulsa el botón de <strong>Compartir</strong> (cuadrado con flecha) ➔ selecciona <strong>"Agregar a la pantalla de inicio"</strong>.</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      
      {/* Respaldos */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Respaldos de Datos</h2>
        <Card className={styles.settingGroup}>
          <button className={styles.settingRow} onClick={() => navigate('/configuracion/respaldo')} id="btn-go-backups">
            <div className={styles.settingLeft}>
              <Shield size={20} className={styles.settingIcon} style={{ color: 'var(--color-success)' }} />
              <div>
                <span className={styles.settingLabel}>Crear e Importar Respaldos</span>
                <span className={styles.settingDesc}>
                  Exporta tus datos encriptados o restáuralos en este dispositivo
                </span>
              </div>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </Card>
      </div>

      {/* Acerca de */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Acerca de</h2>
        <Card className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <Info size={20} className={styles.settingIcon} />
              <div>
                <span className={styles.settingLabel}>GluControl</span>
                <span className={styles.settingDesc} style={{ display: 'block', marginTop: '4px' }}>
                  Versión 1.3.0
                </span>
                <span className={styles.settingDesc} style={{ display: 'block', marginTop: '2px' }}>
                  Control Clínico Integral de Pacientes Diabéticos
                </span>
                <span className={styles.settingDesc} style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-disabled)', marginTop: '12px' }}>
                  © {new Date().getFullYear()} · Creado por Lic. Enf. Israel Díaz Serrano
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Modal perfil */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Perfil del paciente" id="profile-modal">
        <div className={styles.form}>
          <Input label="Nombre *" value={pName} onChange={e => setPName(e.target.value)} id="profile-name" required />
          <Input label="Apellido" value={pLastName} onChange={e => setPLastName(e.target.value)} id="profile-lastname" />
          <Input label="Fecha de nacimiento *" type="date" value={pBirthDate} onChange={e => setPBirthDate(e.target.value)} id="profile-birthdate" required />
          <Select label="Tipo de diabetes" options={DIABETES_OPTIONS} value={pDiabetesType} onChange={e => setPDiabetesType(e.target.value)} id="profile-diabetes" />
          <NumberInput label="Altura (cm)" value={pHeight} onChange={setPHeight} min={100} max={250} step={1} unit="cm" />
          <Input label="Médico tratante" value={pDoctor} onChange={e => setPDoctor(e.target.value)} placeholder="Nombre del médico" id="profile-doctor" />
          <Select label="Tipo de sangre" options={[{ value: '', label: 'No especificado' }, ...BLOOD_TYPE_OPTIONS]} value={pBloodType} onChange={e => setPBloodType(e.target.value)} id="profile-blood" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowProfileModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveProfile} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal rangos de glucosa */}
      <Modal isOpen={showRangesModal} onClose={() => setShowRangesModal(false)} title="Rango objetivo de glucosa" id="ranges-modal">
        <div className={styles.form}>
          <NumberInput label={`Mínimo (${settings?.glucoseUnit})`} value={rangeMin} onChange={setRangeMin} min={50} max={150} step={1} unit={settings?.glucoseUnit ?? 'mg/dL'} />
          <NumberInput label={`Máximo (${settings?.glucoseUnit})`} value={rangeMax} onChange={setRangeMax} min={100} max={400} step={1} unit={settings?.glucoseUnit ?? 'mg/dL'} />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowRangesModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveRanges} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal rangos de presión arterial */}
      <Modal isOpen={showBpRangesModal} onClose={() => setShowBpRangesModal(false)} title="Rango objetivo de presión arterial" id="bp-ranges-modal">
        <div className={styles.form}>
          <NumberInput label="Sistólica Máxima (mmHg)" value={bpSystolicTarget} onChange={setBpSystolicTarget} min={80} max={200} step={1} unit="mmHg" />
          <NumberInput label="Diastólica Máxima (mmHg)" value={bpDiastolicTarget} onChange={setBpDiastolicTarget} min={50} max={120} step={1} unit="mmHg" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowBpRangesModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveBpRanges} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal configurar contraseña de respaldos */}
      <Modal isOpen={showBackupPassModal} onClose={() => { setShowBackupPassModal(false); setBackupPassword(''); }} title="Contraseña de respaldos" id="backup-password-modal">
        <div className={styles.form}>
          <Input 
            label="Contraseña de respaldos" 
            type="password" 
            value={backupPassword} 
            onChange={e => setBackupPassword(e.target.value)} 
            placeholder="Introduce la contraseña" 
            id="backup-pass-input" 
          />
          <Input 
            label="Recordatorio (Pista)" 
            value={backupPasswordHint} 
            onChange={e => setBackupPasswordHint(e.target.value)} 
            placeholder="Pista para recordar tu contraseña" 
            id="backup-pass-hint" 
            maxLength={100}
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowBackupPassModal(false); setBackupPassword(''); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveBackupPassword} loading={isSaving} fullWidth>Guardar</Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal configurar PIN */}
      <Modal isOpen={showPinModal} onClose={() => { setShowPinModal(false); setPin(''); setPinConfirm(''); }} title="Configurar PIN" id="pin-modal">
        <div className={styles.form}>
          <Input label="Nuevo PIN (4-6 dígitos)" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" id="new-pin" />
          <Input label="Confirmar PIN" type="password" inputMode="numeric" maxLength={6} value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))} placeholder="••••" id="confirm-pin" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowPinModal(false); setPin(''); setPinConfirm(''); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleSetupPin} loading={isSaving} fullWidth>Activar PIN</Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal cambiar/desactivar PIN */}
      <Modal isOpen={showChangePinModal} onClose={() => { setShowChangePinModal(false); setOldPin(''); }} title="Gestionar PIN" id="change-pin-modal">
        <div className={styles.form}>
          <Input label="PIN actual" type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" id="current-pin" />
          <div className={styles.formActions}>
            <Button variant="danger" onClick={handleDisablePin} loading={isSaving} fullWidth>Desactivar PIN</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
