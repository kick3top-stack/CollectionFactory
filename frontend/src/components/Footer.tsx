import { Github } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-10 border-t border-[var(--app-border)] bg-[var(--app-surface-elevated)]/95 relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="w-full h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_60%)]" />
      </div>
      <div className="app-container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-[var(--app-text-muted)] relative z-10">
        <span className="flex items-center gap-2">
          <span className="text-[var(--app-text)] font-medium">Victor Valdes</span>
          <span className="hidden sm:inline-block text-[var(--app-text-dim)]">·</span>
          <span>© All rights reserved · kick.3top@gmail.com</span>
        </span>
        <a
          href="https://github.com/kick3top-stack"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[var(--app-text-muted)] hover:text-[var(--app-primary)] transition-colors"
        >
          <Github className="w-4 h-4" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
}

