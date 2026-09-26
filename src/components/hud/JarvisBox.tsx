import React from 'react';

export interface JarvisBoxProps {
  title: string;
  statusBadge?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export const JarvisBox: React.FC<JarvisBoxProps> = ({
  title,
  statusBadge,
  children,
  className = '',
  icon,
  headerRight,
}) => {
  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-stone-950/75 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(245,158,11,0.05)] font-mono text-xs select-none ${className}`}
    >
      {/* Brass Corner Brackets (JARVIS HUD Aesthetic) */}
      <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20 shadow-[0_0_6px_#f59e0b]" />
      <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20 shadow-[0_0_6px_#f59e0b]" />
      <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20 shadow-[0_0_6px_#f59e0b]" />
      <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20 shadow-[0_0_6px_#f59e0b]" />

      {/* Box Header Bar */}
      <div className="px-3 py-2 border-b border-amber-500/20 bg-stone-900/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-amber-400 shrink-0">{icon}</span>}
          <h3 className="text-[11px] font-bold tracking-wider uppercase text-amber-300 truncate drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          {statusBadge && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold tracking-wider uppercase shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              {statusBadge}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 flex-1 overflow-hidden min-h-0 relative flex flex-col">
        {children}
      </div>
    </div>
  );
};
