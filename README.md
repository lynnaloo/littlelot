# The Little Lot

Lot search for tiny home buyers, with a Readiness Score weighted by build type. Zoning codes are shown; plain-language zoning summaries are coming soon (code descriptions aren't in the landrecords.us API yet).

```bash
npm install
cp .env.local.sample .env.local   # add LANDRECORDS_API_KEY (server-side only, never NEXT_PUBLIC_)
npm run dev                        # http://localhost:3000
```

See [CLAUDE.md](CLAUDE.md) for conventions, scoring, and what's next.
