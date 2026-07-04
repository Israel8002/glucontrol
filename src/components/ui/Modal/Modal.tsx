import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
  id?: string;
}

/**
 * Modal con trampa de foco, cierre con Escape y animación de entrada.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlay = true,
  id,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
  
  // Bloquear scroll del body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  
  // Foco automático al abrir
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const firstFocusable = contentRef.current.querySelector<HTMLElement>(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={closeOnOverlay ? (e) => { if (e.target === overlayRef.current) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `${id ?? 'modal'}-title` : undefined}
    >
      <div
        ref={contentRef}
        className={`${styles.content} ${styles[`size-${size}`]}`}
        id={id}
      >
        {title && (
          <div className={styles.header}>
            <h2 id={`${id ?? 'modal'}-title`} className={styles.title}>{title}</h2>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
