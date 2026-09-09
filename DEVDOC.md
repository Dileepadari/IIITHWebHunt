# Website Hunt - Developer Documentation

Technical reference for the Website Hunt codebase: architecture, auth, data model, API
surface, scoring rules, and setup. For what the app does from a player's point of view,
see [README.md](./README.md).

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [URL normalization](#url-normalization)
- [Scoring engine](#scoring-engine)
- [Site discovery](#site-discovery)
- [Auth model](#auth-model)
- [API surface](#api-surface)
- [Data model](#data-model)
- [Real-time updates](#real-time-updates)
- [Theming](#theming)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Deployment](#deployment)
- [Gotchas](#gotchas)

## Tech stack

React 19, Vite 8, Tailwind 3 and TanStack Query on the client; Express 5, Drizzle ORM
and PostgreSQL on the server; `ws` for websockets; Passport for auth. Tailwind is
deliberately held at 3.x - v4 moves theme configuration into CSS and would require
re-declaring and re-verifying the whole custom palette.

One Vite dev server is mounted inside Express in development, so the API and the client
are served from a single port in both development and production.

## Architecture overview

```
  browser
    |  fetch (credentials: include)          websocket /ws
    v                                              |
  Express 5  --------------------------------------+
    |  routes.ts        thin HTTP layer, auth guards, broadcasts
    |  conquest.ts      decides what a submission is worth
    |  discovery.ts     verifies unknown hosts over the network
    |  storage.ts       every database query lives here
    v
  PostgreSQL (Drizzle)
```

`shared/` is imported by both sides. `shared/url.ts` in particular is the single
definition of what a URL means, so the client's live preview and the server's matching
can never disagree.

Layering rule: routes never write SQL and never make network calls; `storage.ts` never
makes decisions. `conquest.ts` holds the game rules and is the only place to change them.

## URL normalization

`shared/url.ts`, `parseHuntUrl()`. Everything below is stripped or folded before two
URLs are compared:

| Input | Canonical key |
|---|---|
| `  https://Students.IIIT.ac.in/  ` | `students.iiit.ac.in` |
| `students .iiit.ac.in` | `students.iiit.ac.in` |
| `www.students.iiit.ac.in` | `students.iiit.ac.in` |
| `http://students.iiit.ac.in:80/` | `students.iiit.ac.in` |
| `students.iiit.ac.in/page?x=1#top` | `students.iiit.ac.in/page` |
| `https://x.iiit.ac.in//deep//path/` | `x.iiit.ac.in/deep/path` |

Specifically: every kind of whitespace is removed (including non-breaking spaces,
zero-width characters and soft hyphens, which survive copy-paste invisibly), the whole
string is lowercased, the scheme and any `www.` prefix are dropped, ports, query strings,
fragments, duplicate slashes, trailing slashes and trailing dots are discarded.

The hostname is then validated: it must be at least two dot-separated labels. Input that
fails this is a typo, not a guess, and is rejected with a 400 and no penalty.

`isHuntDomain` is true only for `iiit.ac.in` and hosts ending in `.iiit.ac.in`. Note that
`evil-iiit.ac.in` is correctly *not* a hunt domain.

**Never compare raw URLs anywhere.** Use `parseHuntUrl()` or `urlKey()`.

### Matching a guess to a target

`storage.findWebsiteForGuess(key, host)` tries the full key first, then falls back to the
bare host. Admins seed roots while players paste deep links, so a player who submits
`cvit.iiit.ac.in/projects` matches a stored `cvit.iiit.ac.in`. An exact key match always
wins over the host fallback, so two deliberately distinct targets stay distinct.

## Scoring engine

`server/conquest.ts`, `evaluateConquest()`. Two invariants govern every branch:

1. **Only penalise a provably wrong guess.** Anything uncertain scores zero.
2. **Never charge a team twice for the same URL.** Every repeat is a no-op.

Outcomes (`shared/conquest.ts`):

| Outcome | Points | Recorded? | Scores? |
|---|---|---|---|
| `conquered` | site's `points` | yes | yes |
| `already_yours` | 0 | no | no |
| `already_taken` | 0 | first time only | no |
| `repeat_miss` | 0 | no | no |
| `unverified` | 0 | no | no |
| `wrong` | `WRONG_GUESS_PENALTY` (-25) | yes | yes |

Decision order:

1. Parse. Unparseable input returns `rejected` (HTTP 400, no penalty).
2. Look up this team's prior attempt at the same key. A prior `wrong` means any repeat
   becomes `repeat_miss` instead of a second penalty.
3. Not a hunt domain -> `wrong`. No network call is made: probing arbitrary hosts on a
   player's say-so would make the server an open request proxy.
4. Look up the target. If unknown, verify the host over the network (below).
5. Already conquered -> `already_yours` or `already_taken` (with the holding team's name).
6. Otherwise claim it atomically and return `conquered`.

The claim is a conditional `UPDATE ... WHERE is_conquered = false` that returns the
affected rows, not a read-then-write, so two teams submitting the same URL in the same
millisecond cannot both be told they won. The loser gets `already_taken`.

### Rate limiting

`server/rateLimit.ts`. One submission per team per `SUBMISSION_COOLDOWN_MS` (2s), returning
429 with `retryAfterMs`. The client disables its button for the same window and shows a
countdown, but that is a courtesy - the server limit is the real control. A blocked
attempt does not restart the clock, so hammering cannot extend a team's own lockout.

State is per-process, which suits the single-instance deployment. Running multiple app
containers would need a shared store.

## Site discovery

`server/discovery.ts`, `verifyHuntHost()`. For an `iiit.ac.in` host not already in the
database:

1. Probe `https://host/` with HEAD, then GET, then `http://host/` with GET. Any HTTP
   response at all means **live** - 401, 403 and 404 included, since plenty of real
   campus sites are access-controlled or have no index page.
2. If nothing answered, ask DNS. `ENOTFOUND`/`ENODATA` means **absent**; any other
   failure (timeout, resolver down) means **unreachable**.

A **live** host is inserted with `source = 'discovered'` and scores full points.

**unreachable** always scores zero and is never penalised. **absent** is only penalised
when `PENALISE_UNVERIFIED_IIIT=true`, because many IIIT sites are intranet-only and
simply do not resolve from outside the campus network - off campus, "absent" describes
our vantage point, not the guess. Turn it on only when the server runs on campus.

Verdicts are cached (live 10 min, absent 60s, unreachable 15s) and concurrent probes of
the same host are collapsed into one request, so a popular wrong guess cannot be used to
generate traffic.

## Auth model

Session cookie based, via Passport and `express-session`, with sessions stored in the
`sessions` table (`connect-pg-simple`). No Redis is involved anywhere.

- **Local**: username + password, scrypt with a per-user random salt, stored as
  `hash.salt`. Comparison is length-checked before `timingSafeEqual`, which throws on a
  length mismatch rather than returning false.
- **Google OAuth**: enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
  are set. A new user's username is derived from the email prefix and de-duplicated,
  since two people at different domains often share one.
- Usernames and emails are matched case-insensitively.
- `deserializeUser` fails closed: a session whose user has been deleted is rejected
  rather than resolving to `undefined`.
- Logout destroys the session row and clears the cookie.
- `SESSION_SECRET` is mandatory in production; the server refuses to start without it.

Admin is the `users.is_admin` flag. There is no endpoint that grants it - the seed script
is the only way to create the first admin, deliberately. The `isAdmin` middleware
re-reads the user from the database on every request rather than trusting the session
copy, so revoking admin takes effect immediately.

## API surface

All routes require an authenticated session unless noted.

| Method | Path | Who | Returns |
|---|---|---|---|
| GET | `/api/health` | public | Liveness, uptime |
| POST | `/api/register` | public | Creates a user and logs in |
| POST | `/api/login` | public | Logs in |
| POST | `/api/logout` | any | Destroys the session |
| GET | `/api/user` | any | The current user |
| GET | `/api/auth/google` | public | OAuth redirect (if configured) |
| GET | `/api/users` | admin | All users, without password hashes |
| GET | `/api/teams` | player | Leaderboard order |
| GET | `/api/teams/my-team` | player | The caller's team, or `null` |
| POST | `/api/teams` | admin | Creates a team |
| GET | `/api/websites` | player | All sites |
| GET | `/api/websites/available` | player | Unclaimed sites |
| POST | `/api/websites/bulk` | admin | `{count, duplicates, rejected[], websites[]}` |
| POST | `/api/conquests` | player | A `ConquestResult` |
| GET | `/api/conquests/my-team` | player | The caller's team history |
| GET | `/api/conquests/recent` | player | Global feed with team and site joined |
| GET | `/api/game/current` | player | Session plus `endsAt`, `serverTime`, `cooldownMs` |
| POST | `/api/game/start` | admin | Starts a game, ending any previous one |
| POST | `/api/game/pause`, `/resume`, `/end` | admin | Transitions the session |
| GET | `/api/admin/stats` | player | Counts (also drives the public hero banner) |

Status codes worth knowing: `409` for an illegal game transition or a duplicate team
name, `429` for the cooldown, `400` for an unparseable URL (no penalty).

## Data model

Postgres via Drizzle (`shared/schema.ts`). Ids are `varchar` primary keys defaulting to
`gen_random_uuid()`. Timestamps are `timestamp` without time zone, written as UTC.

**users** - `id`, `username` (unique), `email` (unique), `password` (null for Google
users), `first_name`, `last_name`, `profile_image_url`, `is_admin`, `is_google_auth`,
timestamps.

**teams** - `id`, `name` (unique), `captain_id` -> users, `members` (`text[]` of **user
ids**), `score`, `websites_conquered`, `successful_attempts`, `total_attempts`. The
counters are `NOT NULL DEFAULT 0` so the client never divides by null.

> `members` holds user ids, not names. `getTeamByUserId` resolves a player's team by
> looking their own id up in this array, so a name here means the player never resolves
> to a team at all.

**websites** - `id`, `url` (display form), `normalized_url` (**unique**, the only column
ever matched against a guess), `domain`, `is_conquered`, `conquered_by` -> teams,
`conquered_at`, `points`, `source` (`admin` | `discovered`).

**conquests** - `id`, `team_id`, `website_id` (nullable), `url`, `normalized_url`,
`is_successful`, `points`, `outcome`, `attempted_at`. Indexed on
`(team_id, normalized_url)`, which is what makes the repeat-submission check cheap.

> `conquests.normalized_url` must always store the canonical key, never the display URL,
> or repeat detection silently stops working and teams get penalised twice.

**game_sessions** - `id`, `status` (`waiting` | `active` | `paused` | `ended`),
`start_time`, `end_time`, `duration` (minutes).

**sessions** - the `express-session` store.

The schema is owned by Drizzle and applied with `npm run db:push`.
`docker/postgres/init.sql` only creates extensions and roles; it deliberately does not
declare tables, because a second copy of the schema drifts.

## Real-time updates

Server broadcasts on `/ws`: `TEAM_CREATED`, `WEBSITES_ADDED`, `CONQUEST_RESULT`,
`GAME_STARTED`, `GAME_PAUSED`, `GAME_RESUMED`, `GAME_ENDED`. `client/src/hooks/useWebSocket.ts`
maps each to the query keys it invalidates.

The socket is module-scoped and reference-counted: several components call the hook, but
the page holds one connection. On reconnect the client invalidates everything, since it
cannot know what it missed while offline.

Broadcasts only fire when something actually changed - a repeat submission does not wake
every connected leaderboard.

## Theming

A dark gaming theme. Palette tokens are CSS variables on `:root` in
`client/src/index.css` (`--gaming-dark`, `--electric-blue`, `--neon-green`,
`--electric-purple`), surfaced to Tailwind through `tailwind.config.ts`. Fonts are Inter
and Orbitron; icons are Font Awesome 6, both from CDNs imported at the top of `index.css`.

The ADK DEV mark lives at `client/src/assets/logo-mark.png` and is recoloured for the
surface with the `.logo-mono` filter rather than shipping a second file.

## Environment variables

See `.env.example` for the annotated list. The ones that change behaviour:

| Variable | Default | Effect |
|---|---|---|
| `DATABASE_URL` | - | Required. Postgres connection string |
| `SESSION_SECRET` | - | Required in production; startup fails without it |
| `PORT` | `5000` | HTTP port |
| `COOKIE_SECURE` | `true` in production | HTTPS-only session cookies. Set `false` when serving over plain HTTP, or logins silently fail |
| `PENALISE_UNVERIFIED_IIIT` | `false` | Whether an unresolvable `iiit.ac.in` host costs points. Only enable on campus |
| `SEED_DATABASE` | `false` | Entrypoint runs the seed on boot |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin` / `admin@iiit.ac.in` / - | The seeded admin. Seeding aborts rather than inventing a password |
| `SEED_WEBSITES` | built-in list | Starter sites, whitespace or comma separated |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | - | Both required to enable Google sign-in |

## Local setup

```bash
npm install
docker run -d --name hunt-pg -e POSTGRES_PASSWORD=hunt -e POSTGRES_USER=hunt \
  -e POSTGRES_DB=websitehunt -p 5432:5432 postgres:16-alpine

# .env is read directly by `npm run dev` and `npm run db:seed`, so this is the
# same file the Docker path uses. Exporting the variables still works if you
# prefer.
cp .env.example .env      # then set DATABASE_URL and SESSION_SECRET

npm run db:push     # apply the schema
npm run db:seed     # create the admin and starter sites
npm run dev         # http://localhost:5000
```

Scripts: `dev`, `build`, `start`, `check` (typecheck), `db:push`, `db:seed`, `test:smoke`.

### Smoke test

`scripts/smoke-test.sh` walks every user journey against a running server: registration,
login, authorization, team creation, the game lifecycle, URL normalization, the
cooldown, each scoring outcome, and auto-discovery. 33 checks, non-zero exit on failure.

```bash
BASE_URL=http://localhost:5000 PG_CONTAINER=hunt-pg npm run test:smoke
```

Safe to run repeatedly: each run generates fresh usernames, team names and target
hostnames rather than depending on a virgin database. It still registers users, adds
websites and starts games, so point it only at a disposable database.

`DISCOVERY_HOST` (default `cvit.iiit.ac.in`) is the real host used to prove the
live-verification path; override it if that host ever goes away.

## Deployment

`docker compose up -d` builds the app, starts Postgres, applies migrations through
`docker-entrypoint.sh`, and serves on port 5000. Neither compose file defines a default
admin password: set `ADMIN_PASSWORD` and `SEED_DATABASE=true` in `.env` for the first
boot, in development as well as production. Optional profiles add nginx
(`--profile with-nginx`) and Prometheus/Grafana (`--profile with-monitoring`).

The image installs the full dependency tree, not just production dependencies, because
the entrypoint runs `drizzle-kit push` and `tsx scripts/seed.ts` at container start and
both are devDependencies.

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [DOCKER.md](./DOCKER.md) for the longer form.

## Gotchas

- **Never compare raw URLs.** Always go through `parseHuntUrl()`. This is the bug the
  whole `shared/url.ts` module exists to prevent.
- **`conquests.normalized_url` stores the key, not the href.** Getting this wrong breaks
  repeat detection silently, and teams get penalised twice for one mistake.
- **`teams.members` holds user ids.** Names here mean players never resolve to a team.
- **Do not set `reusePort` on `server.listen`.** With `SO_REUSEPORT` a stale process
  binds the same port instead of failing, and the kernel then splits traffic between old
  and new code with no error anywhere to show it. This actually happened during
  development and produced results that looked like random logic bugs.
- **Express 5 wildcards.** `app.use("*")` is invalid, and `/*splat` does not match `/`.
  The catch-all in `server/vite.ts` is path-less for exactly this reason.
- **Drizzle wraps driver errors.** `error.code` is on `.cause`; use
  `server/dbErrors.ts` rather than reading one level, or unique-violation handling
  silently degrades to a 500.
- **Count columns come back as strings.** `count(*)` is `bigint`, which node-postgres
  hands over as a string. `getGameStats` casts with `::int`.
- **Admin creation is seed-only by design.** There is no promote endpoint.
- **Secure cookies need HTTPS.** In production the session cookie is `secure` by
  default, so over plain HTTP the browser accepts it and never sends it back: every
  request then looks unauthenticated with no error explaining why. Put the app behind
  TLS, or set `COOKIE_SECURE=false` deliberately.

## Assets are bundled, never fetched

Fonts (Inter, Orbitron) and Font Awesome are npm dependencies imported from
`client/src/index.css`. Vite fingerprints the webfonts into `dist/`, so the
container serves them itself.

**Do not replace these with a CDN `@import`.** They were exactly that, and it
fails on the deployment this app is built for: a campus LAN with no route out,
where all 37 `fa-` icons vanish and Orbitron, which is most of the visual
identity, falls back to a system sans. It works fine on a laptop with internet,
which is why it went unnoticed.

CI fails the build if `dist/` references `cdnjs.cloudflare.com` or
`fonts.googleapis.com`, or if no `.woff2` is emitted.

## Configuration

`.env` is read by three things now, and they are not the same mechanism:

| Consumer | How |
|---|---|
| `docker compose` | Reads `.env` and passes the values into the container |
| `drizzle-kit` (`db:push`) | Loads `.env` itself |
| `npm run dev`, `npm run db:seed` | Node's `--env-file-if-exists=.env` |

The last row is why `engines` pins **node >= 22.9**: that is where
`--env-file-if-exists` landed. The tolerant flag matters, because there is no
`.env` inside the image and the strict `--env-file` would make the container
refuse to start.

`npm start` deliberately does **not** read `.env`: production takes its
configuration from the real environment.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `master` and every pull request.

| Job | What it runs |
|---|---|
| `check` | `npm run check`, `npm run build`, and the no-CDN assertion, on Node **22** and **24** |
| `smoke` | Against a real Postgres: `db:push`, `db:seed`, seed **again** to prove idempotency, build, serve, and assert `/api/user` is 401 unauthenticated |
| `audit` | `npm audit` for information, then `--omit=dev --audit-level=high` as a gate |

There is no test suite, so the smoke job is what stands in for one. Seeding
twice is checked explicitly because the seed is the only way an admin account
can exist: a seed that fails on a second run means a redeploy locks you out of
the admin panel.

## Documentation

| File | For |
|---|---|
| `README.md` | Users |
| `DEVDOC.md` | This file. Contributors |
| `DOCKER.md`, `DEPLOYMENT.md` | Running it in anger |
| `not_for_you.md` | The author's working log. Not documentation |

There is **no `README-light.md`**. The app ships a single dark theme: `:root` is
dark, `.dark` is never applied, and there is no toggle. A light page would be a
duplicate of the dark one.

Screenshots live in `docs/screenshots/` at 1440x900, captured against a seeded
instance with an account registered through the app's own form.

## Licensing

MIT, see `LICENSE`. Runtime dependencies are permissive (MIT/ISC/Apache-2.0);
Font Awesome Free is CC BY 4.0 for the icons and MIT for the code, and
`@fontsource/*` ships the fonts under the SIL Open Font License.
