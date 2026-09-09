# not_for_you.md

A personal working log. Not documentation, and nothing here is needed to use or contribute to Website Hunt. Everything a newcomer actually needs is in [README.md](./README.md) and [DEVDOC.md](./DEVDOC.md).

---

## Fonts and icons came from a CDN, in an app built for a LAN with no internet

`client/src/index.css` opened with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter...&family=Orbitron...');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
```

Two runtime fetches to third parties on every page load, in a self-hosted, Docker-deployed app whose own `.env.example` describes the deployment as "a campus LAN event with no TLS".

On that LAN, with no route out:

- **All 37 `fa-` icons disappear.** Font Awesome is not an npm dependency; those `<i className="fas fa-trophy">` elements have nothing to render.
- **Orbitron does not load**, and Orbitron *is* the visual identity. The WEBSITE HUNT wordmark, every heading, the scoreboard numerals all fall back to a system sans.

So the app degrades from "gaming championship" to "unstyled form" exactly at the event it was written for, and only there, which is the worst place for a bug to hide: it works perfectly on the laptop you build it on.

Fixed by adding `@fortawesome/fontawesome-free`, `@fontsource/inter` and `@fontsource/orbitron` as real dependencies and importing them locally. Vite fingerprints and emits the webfonts into `dist/`, so the container serves them itself: **80 `.woff`/`.woff2` files in the build and zero CDN references left**. Verified in the browser that `Font Awesome 6 Free` and `Orbitron` both report `status: "loaded"` from the bundle.

CI now fails if `dist/` mentions `cdnjs.cloudflare.com` or `fonts.googleapis.com`, or if no `.woff2` is emitted.

## `.env` did not work outside Docker

The README says `cp .env.example .env`, and `.env.example` says "Copy to .env and fill in". That is true for the Docker path, where compose reads the file and passes the variables into the container.

Nothing else read it. There is no `dotenv` dependency, so `npm run dev` and `npm run db:seed` saw none of it and died with `DATABASE_URL must be set.` DEVDOC papered over this by documenting `export DATABASE_URL=...` for local work, so the two halves of the docs quietly disagreed about how the app is configured.

Fixed with Node's own `--env-file-if-exists=.env` on the two local-dev scripts, so no new dependency. **`--env-file-if-exists` rather than `--env-file`**: compose passes the variables in directly and there is no `.env` inside the image, so the strict flag would make the container refuse to start. `engines` now pins `node >= 22.9`, which is where that flag landed.

## The `qs` advisory again

Third repository in this pass with the same shape: `qs` reaches the tree only through Express, Express pins a range that is still affected, nothing here imports `qs` directly. `overrides: { "qs": "^6.16.0" }` clears it. Production advisories: 1 to 0.

The four remaining dev-only advisories are `esbuild` via `drizzle-kit`. drizzle-kit is **already at the latest version** (0.31.10) and npm's suggested "fix" is a *downgrade* to 0.18.1, flagged breaking. Same wrong instinct as the BlogNest `next-auth` case: taking that suggestion would trade a dev-only advisory for a major functional regression. Left alone.

## Notes

- `SEED_WEBSITES` is an override **list of URLs**, not a boolean. I passed `SEED_WEBSITES=1` and it dutifully tried to parse `1` as a hostname and rejected it, reporting "0 added, 1 rejected". Unset, it seeds the ten default IIIT sites. The variable name reads like a flag; it is not.
- **The single dark theme is deliberate**, not an omission. `:root` is dark, `.dark` is never applied, there is no toggle, and `darkMode: ["class"]` in `tailwind.config.ts` is just the scaffold default. So no `README-light.md` and no light gallery: a pair of identical pages would be worse than one.
- Registration ignores synthetic clicks. Setting inputs through the native value setter plus an `input` event populates React Hook Form correctly, but the submit button needs a real mouse click; a dispatched `click` leaves the form unsubmitted with no error shown.
- The screenshot scale is per browser window. It was 0.8078 in one session and 0.7875 in the next, and reusing the stale figure silently crops the right third of every capture. Measure it each time: one screenshot, divide its width by `window.innerWidth`.

## Open threads

- **No tests at all.** `scripts/smoke-test.sh` exists and is a shell script hitting endpoints, not a suite. CI now proves the app typechecks, builds, migrates, seeds, reseeds and serves, which is a floor. `shared/url.ts` is the piece that most deserves unit tests: it decides whether two strings are the same website, and getting that wrong means teams are wrongly charged for duplicates.
- The shell scripts under `scripts/` are full of emoji (✅ ❌ 🚀 and so on). Left alone deliberately: they are operator-facing console output where the emoji carry status at a glance, not product copy or documentation.
- `Continue with Google` is wired to OAuth that needs credentials nobody has set. It renders as a live button that fails if pressed.

## Screenshots, second pass

The first pass produced four images and stopped there because the browser
extension dropped mid-capture. Redone properly against a fully seeded instance:
**ten desktop screens and four responsive ones**, all real viewport renders.

Setting the instance up meant playing the game rather than writing rows: a demo
team registered through the app's own form, four more accounts through the same
`/api/register` the form posts to, five teams created from the admin panel, a
90-minute session started, and ten sites conquered in varied URL shapes -
`cvit.iiit.ac.in`, `HTTPS://Library.IIIT.ac.in/`, `www.ltrc.iiit.ac.in/#about`,
`students.iiit.ac.in/index.html`, `  WWW.IIIT.ac.in/  `. Every one of those was
accepted against the canonical form, which is the app's whole thesis demonstrated
rather than asserted. The deep link `admissions.iiit.ac.in/apply` scored against
the listed root, as designed.

That leaves the leaderboard, the activity feed and the admin panels showing real
standings instead of zeroes, which is the entire reason for doing it this way.

## Two responsive bugs the phone shots exposed

- **The nav bar switched to the desktop layout at 768px**, where it does not fit:
  the links, the user block and the admin badge crowded into each other on a
  tablet. Moved the whole switch to `lg`, so the drawer stays in charge up to
  1024px.
- **"Team Management" and its "Add Team" button overlapped on a phone.** The
  `CardHeader` was `flex flex-row items-center justify-between` with no wrap, so
  at 390px the button sat on top of the title. `flex-wrap` plus a gap; the button
  now drops below the heading.

Neither would have been found without rendering at those exact sizes. The tab
strip inside the admin panel looks clipped in the phone screenshot: it is not, it
is `overflow-x-auto` and scrolls - the capture harness hides scrollbars.
