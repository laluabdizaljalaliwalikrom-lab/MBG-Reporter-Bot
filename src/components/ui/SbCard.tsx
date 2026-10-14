import type { ReactNode } from "react";

interface SbCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function SbCard({
  children,
  title,
  subtitle,
  actions,
  className = "",
  contentClassName = "",
}: SbCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#1f2937] border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] shadow-sm hover:shadow transition-shadow ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="px-4 sm:px-6 py-3.5 bg-[#f8f9fc] dark:bg-gray-800/90 border-b border-[#e3e6f0] dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            {title && (
              <h6 className="m-0 font-bold text-[#4e73df] uppercase tracking-wide text-xs sm:text-sm">
                {title}
              </h6>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-4 sm:p-6 text-gray-700 dark:text-gray-300 ${contentClassName}`}>{children}</div>
    </div>
  );
}

