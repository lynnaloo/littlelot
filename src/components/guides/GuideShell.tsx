// Shared frame for the /guides pages: top bar, breadcrumb, and page width
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'

export interface Crumb {
  label: string
  href?: string
}

export function GuideShell({ crumbs, children }: { crumbs: Crumb[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="h-12 bg-ink flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} variant="reversed" />
          <span className="font-serif text-tan-lt text-base">the little lot</span>
        </Link>
        <Link href="/search"
              className="ml-auto h-8 px-3 bg-accent text-white text-xs font-medium rounded
                         flex items-center hover:bg-accent/90 transition-colors">
          Search lots
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-xs text-ink-3 mb-5 flex flex-wrap gap-1.5">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex gap-1.5">
              {i > 0 && <span>/</span>}
              {c.href
                ? <Link href={c.href} className="hover:text-accent">{c.label}</Link>
                : <span className="text-ink-2">{c.label}</span>}
            </span>
          ))}
        </nav>
        {children}
      </main>
    </div>
  )
}
