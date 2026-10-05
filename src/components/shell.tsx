import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, DoorOpen, LayoutDashboard, Receipt, Settings, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/buildings", label: "อาคาร", icon: Building2 },
  { to: "/rooms", label: "ห้อง", icon: DoorOpen },
  { to: "/billing", label: "เรียกเก็บ", icon: Wallet },
  { to: "/invoices", label: "บิล", icon: Receipt },
] as const;

function isActive(path: string, to: string) {
  if (to === "/") return path === "/";
  return path === to || path.startsWith(`${to}/`);
}

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-10 bg-brand text-accent-fg">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo-daengniem.png" alt="DAENG NiEM" className="h-14 w-auto shrink-0" />
            <h1 className="truncate text-lg leading-tight font-medium">{title}</h1>
          </div>
          <Link
            to="/settings"
            aria-label="ตั้งค่า"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-accent-fg/25 text-accent-fg"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[max(0px,env(safe-area-inset-bottom))]">
        <ul className="mx-auto grid w-full max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(path, item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 text-xs",
                    active ? "border-accent font-medium text-accent" : "border-transparent text-muted",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}