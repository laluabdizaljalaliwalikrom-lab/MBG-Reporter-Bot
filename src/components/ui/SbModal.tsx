"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SbModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  widthClassName?: string;
  className?: string;
}

export default function SbModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClassName = "max-w-2xl",
  className = "",
}: SbModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open && mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open, mounted]);

  // Handle ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop click */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 w-full ${widthClassName} bg-white dark:bg-[#1f2937] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-2xl overflow-hidden ${className}`}
      >
        {(title || subtitle) && (
          <div className="px-5 sm:px-6 py-4 bg-[#f8f9fc] dark:bg-gray-800/90 border-b border-[#e3e6f0] dark:border-gray-700 flex items-center justify-between gap-3">
            <div>
              {title && (
                <h6 className="text-sm sm:text-base font-bold text-[#4e73df] uppercase tracking-wide">
                  {title}
                </h6>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="p-5 sm:p-6 text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>,
    document.body
  );
}
