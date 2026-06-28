"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Konfirmasi",
  variant = "default",
}: ConfirmModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-float max-w-sm w-full p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-brand-50 text-brand-400"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
            variant === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-amber-100 text-amber-600"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h3 className="text-lg font-bold text-brand-950 mb-1">{title}</h3>
        <p className="text-sm text-brand-500 mb-6">{message}</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              variant === "danger"
                ? "btn-danger flex-1"
                : "btn-primary flex-1"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
