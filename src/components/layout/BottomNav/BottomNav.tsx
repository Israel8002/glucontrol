import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Droplets,
  Pill,
  Syringe,
  Scale,
  Heart,
  BarChart3,
  CalendarDays,
  Bell,
  Settings,
  FileText,
} from 'lucide-react';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/glucosa', icon: Droplets, label: 'Glucosa' },
  { path: '/presion', icon: Heart, label: 'Presión' },
  { path: '/medicamentos', icon: Pill, label: 'Medicamentos' },
  { path: '/calendario', icon: CalendarDays, label: 'Calendario' },
  { path: '/configuracion', icon: Settings, label: 'Ajustes' },
];

const MORE_ITEMS = [
  { path: '/insulina', icon: Syringe, label: 'Insulina' },
  { path: '/peso', icon: Scale, label: 'Peso' },
  { path: '/estadisticas', icon: BarChart3, label: 'Estadísticas' },
  { path: '/recordatorios', icon: Bell, label: 'Recordatorios' },
  { path: '/reportes', icon: FileText, label: 'Reportes' },
];

/**
 * Barra de navegación inferior para móviles.
 * Muestra los 6 elementos seleccionados.
 */
export const BottomNav: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.iconWrapper}>
            <Icon size={22} strokeWidth={location.pathname === path ? 2.5 : 1.75} />
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

/**
 * Sidebar para tablets y desktop
 */
export const SideNav: React.FC = () => {
  const allItems = [...NAV_ITEMS.slice(0, -1), ...MORE_ITEMS, NAV_ITEMS[NAV_ITEMS.length - 1]];
  
  return (
    <aside className={styles.sidebar} role="navigation" aria-label="Menú lateral">
      <div className={styles.sidebarBrand}>
        <Droplets size={28} className={styles.brandIcon} />
        <span className={styles.brandName}>GluControl</span>
      </div>
      <div className={styles.sidebarNav}>
        {allItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `${styles.sideItem} ${isActive ? styles.sideActive : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};
