import React, { useState, useEffect } from 'react';
import { Plus, Syringe, Trash2, Pencil, X } from 'lucide-react';
import { insulinRepository } from '@/repositories/insulinRepository';
import type { InsulinTypeRecord, InsulinLog } from '@/entities';
import type { InsulinType, InsulinSite } from '@/types';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Modal } from '@/components/ui/Modal/Modal';
import { NumberInput } from '@/components/ui/NumberInput/NumberInput';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { Badge } from '@/components/ui/Badge/Badge';
import { INSULIN_TYPE_LABELS, INSULIN_SITE_LABELS } from '@/core/constants';
import { formatDisplayDate, formatTime, today, nowTime } from '@/utils/date';
import { Switch } from '@/components/ui/Switch/Switch';
import styles from './InsulinPage.module.css';

const INSULIN_TYPE_OPTIONS = Object.entries(INSULIN_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const INSULIN_SITE_OPTIONS = Object.entries(INSULIN_SITE_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const InsulinPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  
  const [types, setTypes] = useState<InsulinTypeRecord[]>([]);
  const [todayLogs, setTodayLogs] = useState<InsulinLog[]>([]);
  const [allLogs, setAllLogs] = useState<InsulinLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  
  // Formulario nuevo tipo
  const [typeName, setTypeName] = useState('');
  const [typeType, setTypeType] = useState<InsulinType>('long');
  const [typeUnits, setTypeUnits] = useState(10);
  const [typeTime, setTypeTime] = useState('08:00');
  const [typeSite, setTypeSite] = useState<InsulinSite>('abdomen');
  
  // Formulario nueva dosis
  const [logInsulinId, setLogInsulinId] = useState('');
  const [logUnits, setLogUnits] = useState(10);
  const [logSite, setLogSite] = useState<InsulinSite>('abdomen');
  const [logCorrection, setLogCorrection] = useState(false);
  const [logDate, setLogDate] = useState(today());
  const [logTime, setLogTime] = useState(nowTime());
  const [isSaving, setIsSaving] = useState(false);
  
  const load = async () => {
    setIsLoading(true);
    try {
      const [t, todayL, logs] = await Promise.all([
        insulinRepository.getAllTypes(),
        insulinRepository.getToday(),
        insulinRepository.getAllLogs(),
      ]);
      setTypes(t);
      setTodayLogs(todayL);
      setAllLogs(logs);
      if (t.length > 0 && !logInsulinId) {
        setLogInsulinId(t[0].id);
        setLogUnits(t[0].units);
        setLogSite((t[0].defaultSite || 'abdomen') as InsulinSite);
        setLogTime(t[0].defaultTime || nowTime());
      }
    } catch { toastError('Error al cargar insulinas'); }
    finally { setIsLoading(false); }
  };
  
  useEffect(() => { load(); }, []);
  
  const handleNewTypeClick = () => {
    setEditingTypeId(null);
    setTypeName('');
    setTypeType('long');
    setTypeUnits(10);
    setTypeTime('08:00');
    setTypeSite('abdomen');
    setShowTypeForm(true);
  };

  const handleEditTypeClick = (t: InsulinTypeRecord) => {
    setEditingTypeId(t.id);
    setTypeName(t.name);
    setTypeType(t.type);
    setTypeUnits(t.units);
    setTypeTime(t.defaultTime || '08:00');
    setTypeSite((t.defaultSite || 'abdomen') as InsulinSite);
    setShowTypeForm(true);
  };

  const handleSaveType = async () => {
    if (!typeName.trim()) { toastError('El nombre es requerido'); return; }
    setIsSaving(true);
    try {
      const data = {
        name: typeName.trim(),
        type: typeType,
        units: typeUnits,
        defaultTime: typeTime,
        defaultSite: typeSite,
      };
      if (editingTypeId) {
        await insulinRepository.updateType(editingTypeId, data);
        success('Insulina actualizada');
      } else {
        await insulinRepository.createType(data);
        success('Insulina agregada');
      }
      await load();
      setShowTypeForm(false);
      setTypeName(''); setTypeUnits(10);
      setTypeTime('08:00'); setTypeSite('abdomen');
      setEditingTypeId(null);
    } catch { toastError('Error al guardar'); }
    finally { setIsSaving(false); }
  };
  
  const handleLogInsulinChange = (id: string) => {
    setLogInsulinId(id);
    const selected = types.find(t => t.id === id);
    if (selected) {
      setLogUnits(selected.units);
      if (selected.defaultSite) {
        setLogSite(selected.defaultSite as InsulinSite);
      }
      if (selected.defaultTime) {
        setLogTime(selected.defaultTime);
      }
    }
  };

  const handleNewLogClick = () => {
    setEditingLogId(null);
    const initialId = types.length > 0 ? types[0].id : '';
    setLogInsulinId(initialId);
    
    const selected = types.find(t => t.id === initialId);
    setLogUnits(selected ? selected.units : 10);
    setLogSite((selected?.defaultSite || 'abdomen') as InsulinSite);
    setLogCorrection(false);
    setLogDate(today());
    setLogTime(selected?.defaultTime || nowTime());
    setShowLogForm(true);
  };

  const handleEditLogClick = (log: InsulinLog) => {
    setEditingLogId(log.id);
    setLogInsulinId(log.insulinId);
    setLogUnits(log.units);
    setLogSite(log.site as InsulinSite);
    setLogCorrection(log.correctionDose);
    setLogDate(log.logDate);
    setLogTime(log.logTime);
    setShowLogForm(true);
  };

  const handleSaveLog = async () => {
    if (!logInsulinId) { toastError('Selecciona un tipo de insulina'); return; }
    setIsSaving(true);
    try {
      const selectedType = types.find(t => t.id === logInsulinId);
      const logData = {
        insulinId: logInsulinId,
        units: logUnits,
        site: logSite,
        type: selectedType?.type ?? 'long',
        correctionDose: logCorrection,
        logDate,
        logTime,
      };

      if (editingLogId) {
        await insulinRepository.updateLog(editingLogId, logData);
        success('Dosis de insulina actualizada');
      } else {
        await insulinRepository.createLog(logData);
        success(`${logUnits} U de insulina registradas`);
      }
      await load();
      setShowLogForm(false);
    } catch { toastError(editingLogId ? 'Error al actualizar dosis' : 'Error al registrar dosis'); }
    finally { setIsSaving(false); }
  };
  
  const handleDeleteType = async () => {
    if (!deleteTypeId) return;
    try {
      await insulinRepository.deleteType(deleteTypeId);
      await load();
      success('Insulina eliminada');
    } catch { toastError('Error al eliminar'); }
    finally { setDeleteTypeId(null); }
  };

  const handleDeleteLog = async () => {
    if (!deleteLogId) return;
    try {
      await insulinRepository.deleteLog(deleteLogId);
      await load();
      success('Registro eliminado');
    } catch { toastError('Error al eliminar'); }
    finally { setDeleteLogId(null); }
  };
  
  if (isLoading) return <div className={styles.loading}><Spinner size="lg" /></div>;
  
  const totalUnitsToday = todayLogs.reduce((s, l) => s + l.units, 0);
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Syringe size={24} className={styles.headerIcon} />
          <h1>Insulina</h1>
        </div>
        <div className={styles.headerActions}>
          {types.length > 0 && (
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={handleNewLogClick} id="btn-log-insulin">
              Dosis
            </Button>
          )}
          <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={handleNewTypeClick} id="btn-add-insulin-type">
            Agregar
          </Button>
        </div>
      </div>
      
      {/* Resumen del día */}
      {todayLogs.length > 0 && (
        <Card className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Total hoy</span>
            <span className={styles.summaryValue}>{totalUnitsToday} U</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Dosis</span>
            <span className={styles.summaryValue}>{todayLogs.length}</span>
          </div>
        </Card>
      )}
      
      {/* Tipos de insulina disponibles */}
      {types.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Mis insulinas</h2>
          <div className={styles.typeList}>
            {types.map(t => (
              <Card key={t.id} className={styles.typeCard} padding="sm">
                <div className={styles.typeInfo}>
                  <span className={styles.typeName}>{t.name}</span>
                  <span className={styles.typeLabel}>
                    {INSULIN_TYPE_LABELS[t.type]}
                    {t.defaultTime && ` · ${t.defaultTime}`}
                    {t.defaultSite && ` · ${INSULIN_SITE_LABELS[t.defaultSite as keyof typeof INSULIN_SITE_LABELS] || t.defaultSite}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="muted">{t.units} U</Badge>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleEditTypeClick(t)}
                    aria-label={`Editar ${t.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    onClick={() => setDeleteTypeId(t.id)}
                    aria-label={`Eliminar ${t.name}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Historial de dosis */}
      {allLogs.length === 0 && types.length === 0 ? (
        <EmptyState
          icon={<Syringe size={56} />}
          title="Sin insulinas configuradas"
          description="Agrega tus tipos de insulina para empezar a registrar dosis"
          actionLabel="Agregar insulina"
          onAction={handleNewTypeClick}
        />
      ) : (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Historial de dosis</h2>
          {allLogs.length === 0 ? (
            <p className={styles.emptyText}>Sin dosis registradas</p>
          ) : (
            (() => {
              const groupedLogs = allLogs.reduce((acc, log) => {
                const d = log.logDate;
                if (!acc[d]) acc[d] = [];
                acc[d].push(log);
                return acc;
              }, {} as Record<string, InsulinLog[]>);

              const sortedLogDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

              return sortedLogDates.map(date => (
                <div key={date} className={styles.dateGroup} style={{ marginTop: '12px' }}>
                  <div className={styles.dateLabel} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{formatDisplayDate(date)}</span>
                    <Badge variant="muted">{groupedLogs[date].length}</Badge>
                  </div>
                  <div className={styles.logList} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {groupedLogs[date].map(log => {
                      const insulinType = types.find(t => t.id === log.insulinId);
                      return (
                        <Card key={log.id} className={styles.logCard} padding="sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className={styles.logInfo} style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.logUnits} style={{ fontSize: '16px', fontWeight: '600', color: '#8b5cf6', marginRight: '12px' }}>{log.units} U</span>
                            <div>
                              <span className={styles.logName} style={{ display: 'block', fontSize: '14px', fontWeight: '600' }}>{insulinType?.name ?? log.insulinTypeName ?? 'Insulina'}</span>
                              <span className={styles.logMeta} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                {INSULIN_SITE_LABELS[log.site as keyof typeof INSULIN_SITE_LABELS] ?? log.site} · {log.logTime}
                                {log.correctionDose && ' · Corrección'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className={styles.actionBtn}
                              onClick={() => handleEditLogClick(log)}
                              aria-label="Editar"
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              onClick={() => setDeleteLogId(log.id)}
                              aria-label="Eliminar"
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}
      
      {/* Modal: nuevo tipo de insulina */}
      <Modal isOpen={showTypeForm} onClose={() => { setShowTypeForm(false); setEditingTypeId(null); setTypeName(''); setTypeUnits(10); setTypeTime('08:00'); setTypeSite('abdomen'); }} title={editingTypeId ? 'Editar insulina' : 'Agregar insulina'} id="insulin-type-modal">
        <div className={styles.form}>
          <Input label="Nombre *" placeholder="Ej: Lantus, Humalog" value={typeName} onChange={e => setTypeName(e.target.value)} id="insulin-name" required />
          <Select label="Tipo" options={INSULIN_TYPE_OPTIONS} value={typeType} onChange={e => setTypeType(e.target.value as InsulinType)} id="insulin-type" />
          <NumberInput label="Dosis habitual (U)" value={typeUnits} onChange={setTypeUnits} min={0} max={200} step={1} unit="U" />
          <Input label="Horario de aplicación *" type="time" value={typeTime} onChange={e => setTypeTime(e.target.value)} id="insulin-type-time" required />
          <Select label="Lugar de aplicación" options={INSULIN_SITE_OPTIONS} value={typeSite} onChange={e => setTypeSite(e.target.value as InsulinSite)} id="insulin-type-site" />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowTypeForm(false); setEditingTypeId(null); setTypeName(''); setTypeUnits(10); setTypeTime('08:00'); setTypeSite('abdomen'); }}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveType} loading={isSaving} fullWidth>{editingTypeId ? 'Guardar cambios' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal: registrar/editar dosis */}
      <Modal isOpen={showLogForm} onClose={() => setShowLogForm(false)} title={editingLogId ? 'Editar dosis' : 'Registrar dosis'} id="insulin-log-modal">
        <div className={styles.form}>
          <Select label="Insulina" options={types.map(t => ({ value: t.id, label: `${t.name} (${INSULIN_TYPE_LABELS[t.type]})` }))} value={logInsulinId} onChange={e => handleLogInsulinChange(e.target.value)} id="log-insulin-select" />
          <NumberInput label="Unidades" value={logUnits} onChange={setLogUnits} min={0.5} max={200} step={0.5} unit="U" large />
          <Select label="Zona de aplicación" options={INSULIN_SITE_OPTIONS} value={logSite} onChange={e => setLogSite(e.target.value as InsulinSite)} id="log-site" />
          <Input label="Fecha *" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} id="log-date" required />
          <Input label="Hora *" type="time" value={logTime} onChange={e => setLogTime(e.target.value)} id="log-time" required />
          
          <Switch
            checked={logCorrection}
            onChange={setLogCorrection}
            label="Dosis de corrección"
            description="Marcar si esta dosis es para corregir una hiperglucemia"
            id="log-correction"
          />

          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowLogForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveLog} loading={isSaving} fullWidth>{editingLogId ? 'Guardar cambios' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog isOpen={!!deleteLogId} onClose={() => setDeleteLogId(null)} onConfirm={handleDeleteLog} title="Eliminar dosis" message="¿Eliminar este registro de insulina?" confirmLabel="Eliminar" />
      <ConfirmDialog isOpen={!!deleteTypeId} onClose={() => setDeleteTypeId(null)} onConfirm={handleDeleteType} title="Eliminar insulina" message="¿Eliminar este tipo de insulina? Se mantendrá en tu historial de dosis pero ya no podrás seleccionarla para nuevos registros." confirmLabel="Eliminar" />
    </div>
  );
};
