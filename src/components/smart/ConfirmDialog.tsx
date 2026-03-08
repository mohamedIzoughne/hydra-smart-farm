import React from "react";
import { Modal } from "@/components/smart/Modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  dangerMode?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmer", dangerMode = false }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={
      <>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button variant={dangerMode ? "destructive" : "default"} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    }>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}
