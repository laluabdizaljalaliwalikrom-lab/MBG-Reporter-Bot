import type { ReactNode } from "react";

interface SbStatCardProps {
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "success" | "danger" | "info" | "warning";
  icon?: ReactNode;
  className?: string;
}

const borderToneClass: Record<string, string> = {
  primary: "border-l-sb-primary",
  info: "border-l-sb-info",
  success: "border-l-sb-success",
  warning: "border-l-sb-warning",
  danger: "border-l-sb-danger",
  default: "border-l-sb-primary",
};

const textToneClass: Record<string, string> = {
  primary: "text-sb-primary",
  info: "text-sb-info",
  success: "text-sb-success",
  warning: "text-sb-warning",
  danger: "text-sb-danger",
  default: "text-sb-primary",
};

export default function SbStatCard({
  label,
  value,
  tone = "primary",
  icon,
  className = "",
}: SbStatCardProps) {
  const borderClass = borderToneClass[tone] || borderToneClass.primary;
  const labelTextClass = textToneClass[tone] || textToneClass.primary;

  return (
    <div
      className={`bg-white dark:bg-[#1f2937] border border-[#e3e6f0] dark:border-gray-700 border-l-4 ${borderClass} rounded-[0.35rem] shadow-sm hover:shadow transition-shadow py-3 px-4 sm:py-4 sm:px-5 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <div className={`text-[11px] font-extrabold uppercase tracking-wider truncate mb-1 ${labelTextClass}`}>
          {label}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight truncate">
          {value}
        </div>
      </div>
      {icon && (
        <div className="text-gray-300 dark:text-gray-600 shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}

