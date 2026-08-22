<p align="center">
  <img src="./client/src/assets/logo-mark.png" width="96" alt="ADK DEV">
</p>

# Website Hunt

A team competition for IIIT Hyderabad: teams race to find and claim websites across the
campus's domains, scoring points for every site they are first to reach.

An admin seeds a list of target sites and runs the clock. Teams submit URLs; the first
team to submit a given site claims it. Because nobody can list every site on campus, a
submission for a site that is not on the list is checked live, and counts if it is real.

For architecture, data model, and setup, see **[DEVDOC.md](./DEVDOC.md)**.

## Features

### Submitting a site
- Type a URL in any shape. `  HTTPS://Students.IIIT.ac.in/  `, `students.iiit.ac.in`
  and `www.students.iiit.ac.in/#about` are all the same target: leading and trailing
  spaces, spaces *inside* the address, capitals, `http`/`https`, a `www.` prefix, a
  trailing slash, a port, a query string and a fragment are all ignored before matching.
- The form shows the canonical form it will submit, before you submit it.
- Deep links count. If the admin listed `cvit.iiit.ac.in` and you submit
  `cvit.iiit.ac.in/projects/2024`, you have still found the site.

### Sites nobody listed
- A guess for an `iiit.ac.in` site that is not on the list is verified live. If it
  answers, it joins the hunt and scores full points, and is flagged in the admin panel
  as player-discovered.
- This is the point of the game: the list is a starting set, not the whole map.

### Scoring
| Outcome | Points | When |
|---|---|---|
| Conquered | + the site's value (default 100) | You were first to a real, unclaimed site |
| Already done | 0 | Your team already claimed it - no penalty for resubmitting |
| Already taken | 0 | Another team got there first. You are told **which team** |
| Already tried | 0 | You already guessed this exact URL and it was wrong. Never charged twice |
| Could not verify | 0 | We could not reach it. Costs nothing either way |
| Wrong | -25 | Provably wrong: not an `iiit.ac.in` domain |

The rule behind the table: points are only deducted for a guess that can be *proven*
wrong. Anything uncertain scores zero rather than risking a penalty for a correct answer.

### Anti-spam
- One submission per team every 2 seconds, enforced on the server. The submit button
  shows the remaining wait, so a double-click or a held Enter key cannot drain a score.
- Resubmitting anything already settled is always free.

### Live updates
- Leaderboard, recent activity and stats update over a websocket as other teams play.
- The countdown ticks in real time and the game ends by itself when the clock runs out.

## Roles

| Role | Can do |
|---|---|
| **Player** | Join a team, submit URLs, see the leaderboard and their team's history |
| **Admin** | Everything a player can, plus: create teams, add sites in bulk, start / pause / resume / end the game, and see game stats |

## The game lifecycle

```
no game  ->  active  ->  paused  ->  active  ->  ended
                 |                                 ^
                 +---------- clock runs out -------+
```

Submissions are only accepted while a game is `active`. Starting a new game
automatically ends any previous one, so only one hunt runs at a time.

## A typical run

1. Admin signs in and adds target sites, one URL per line, in **Websites**.
2. Admin creates teams in **Teams**, picking members from registered users.
3. Admin sets a duration and presses **Start New Game**.
4. Players sign in, find their team dashboard, and start submitting.
5. The game ends when the admin ends it or the clock expires. The leaderboard is final.

## Tech stack

React 19 + Vite 8 + Tailwind on the client, Express 5 + Drizzle ORM + PostgreSQL on the
server, with a websocket for live updates. TypeScript throughout, sharing the URL
normalization rules between client and server so both judge a URL identically.

## Getting started

```bash
cp .env.example .env      # fill in DATABASE_URL, SESSION_SECRET and ADMIN_PASSWORD
docker compose up -d
```

First boot needs `SEED_DATABASE=true` and an `ADMIN_PASSWORD` in `.env` to create the
admin account, which is the only way into the admin panel.

Running without Docker is covered in [DEVDOC.md](./DEVDOC.md).

## License

MIT
