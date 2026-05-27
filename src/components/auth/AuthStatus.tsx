import { auth0 } from "@/lib/auth0";

export async function AuthStatus() {
  const session = await auth0.getSession();

  return (
    <div className="fixed top-3 left-3 z-50 rounded-sm border border-(--color-border) bg-surface/90 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-muted) backdrop-blur-sm">
      {!session ? (
        <div className="flex items-center gap-2">
          <a href="/auth/login?screen_hint=signup" className="hover:text-(--color-accent)">
            Signup
          </a>
          <span className="text-(--color-border-strong)">·</span>
          <a href="/auth/login" className="hover:text-(--color-accent)">
            Login
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[18rem] normal-case text-(--color-foreground)">
            {session.user.email ?? session.user.name ?? "Authenticated"}
          </span>
          <span className="text-(--color-border-strong)">·</span>
          <a href="/auth/logout" className="hover:text-(--color-accent)">
            Logout
          </a>
        </div>
      )}
    </div>
  );
}
