// Footer for the home and guide pages: contact, then the data credit
export const CONTACT_EMAIL = 'info@findlittlelot.com'

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-border px-[5%] py-8 text-center">
      <h2 className="text-sm font-semibold text-ink mb-1">Questions or corrections?</h2>
      <p className="text-xs text-ink-2 leading-relaxed max-w-md mx-auto mb-3">
        Spotted a wrong zoning code, know your county&apos;s rules, or just stuck on a lot?
        We read every email.
      </p>
      <a href={`mailto:${CONTACT_EMAIL}`}
         className="text-sm text-accent font-medium hover:underline">
        {CONTACT_EMAIL}
      </a>
      <p className="text-xs text-ink-3 mt-6">
        Lot information powered by{' '}
        <a href="https://landrecords.us" target="_blank" rel="noopener noreferrer"
           className="text-accent font-medium hover:underline">
          landrecords.us
        </a>
        , covering every county in the US.
      </p>
    </footer>
  )
}
