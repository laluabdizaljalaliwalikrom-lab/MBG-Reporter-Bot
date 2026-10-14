import type { ReactNode } from "react";

interface SbTableProps {
  children: ReactNode;
  className?: string;
}

export default function SbTable({ children, className = "" }: SbTableProps) {
  return (
    <div
      className={`overflow-x-auto border border-[#e3e6f0] dark:border-gray-700 rounded-[0.35rem] bg-white dark:bg-[#1f2937] ${className}`}
    >
      {children}
    </div>
  );
}
