import { useCallback, useState } from 'react';
import type { Transaction } from '../domain/types';

export type AppModal =
  | { kind: 'about' }
  | { kind: 'recipe' }
  | { kind: 'tour' }
  | { kind: 'privacy' }
  | { kind: 'terms' }
  | { kind: 'guide' }
  | { kind: 'install' }
  | { kind: 'manage'; mode: 'add' | 'edit'; transaction: Transaction | null }
  | { kind: 'confirm'; pending: ConfirmPending }
  | null;

export type ConfirmPending =
  | { kind: 'delete'; tx: Transaction; label: string }
  | { kind: 'unlink' };

export function useAppModals() {
  const [modal, setModal] = useState<AppModal>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const closeModal = useCallback(() => setModal(null), []);

  const openModal = useCallback((next: Exclude<AppModal, null>) => {
    setModal(next);
  }, []);

  const isOpen = useCallback(
    (kind: Exclude<AppModal, null>['kind']) => modal?.kind === kind,
    [modal]
  );

  return {
    modal,
    setModal,
    openModal,
    closeModal,
    isOpen,
    confirmBusy,
    setConfirmBusy,
  };
}
