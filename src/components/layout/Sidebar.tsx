/**
 * src/components/layout/Sidebar.tsx
 *
 * Icon-based navigation sidebar. Highlights active route using TanStack Router.
 */

import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Mic2,
  ScrollText,
  FlaskConical,
  Activity,
  GitBranch,
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/voice', icon: Mic2, label: 'Voice Pipeline' },
  { to: '/logs', icon: ScrollText, label: 'Audit Logs' },
] as const;

const META = [
  { icon: FlaskConical, label: 'Prisma DB' },
  { icon: GitBranch, label: 'v0.1.0' },
  { icon: Activity, label: 'Mock Mode' },
] as const;

export function Sidebar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside className="w-16 bg-lab-surface border-r border-lab-border flex flex-col items-center py-4 gap-1 flex-shrink-0">
      {/* Nav links */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = currentPath === to;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={`
                flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-0.5
                transition-all duration-150 group
                ${isActive
                  ? 'bg-lab-accent/10 text-lab-accent shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                  : 'text-lab-muted hover:bg-lab-card hover:text-lab-text'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-mono uppercase tracking-wide leading-tight">
                {label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="w-8 border-t border-lab-border my-2" />

      {/* Meta info */}
      <div className="flex flex-col items-center gap-3 pb-2">
        {META.map(({ icon: Icon, label }) => (
          <div
            key={label}
            title={label}
            className="flex flex-col items-center gap-0.5 text-lab-border hover:text-lab-subtext transition-colors"
          >
            <Icon className="w-4 h-4" />
            <span className="text-[7px] font-mono uppercase tracking-wide">{label.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
