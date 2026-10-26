<img src="public/logo.svg" alt="The Little Lot logo" width="88">

# The Little Lot

Lot search for tiny home buyers, with a Readiness Score weighted by build type. Zoning codes (and county descriptions, where available) are shown; plain-language zoning summaries are coming soon.

```bash
npm install
cp .env.local.sample .env.local   # add LANDRECORDS_API_KEY and GOOGLE_MAPS_API_KEY (server-side only)
npm run dev                        # http://localhost:3000
```

See [CLAUDE.md](CLAUDE.md) for conventions, scoring, and what's next.
