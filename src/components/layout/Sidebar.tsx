import type { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-[300px] shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface)"
      aria-label="Filters"
    >
      {children}
    </aside>
  );
}
