import React from 'react';
import { BottomNav, SideNav } from './BottomNav/BottomNav';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principal de la aplicación.
 * - Móvil: Barra inferior fija
 * - Tablet/Desktop: Sidebar izquierdo fijo
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      {/* Sidebar en tablet/desktop */}
      <SideNav />
      
      {/* Contenido principal */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
      
      {/* Bottom nav en móvil */}
      <BottomNav />
    </div>
  );
};
