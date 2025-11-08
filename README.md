# Deadlock Numbers

Deadlock Numbers is a Next.js dashboard for exploring hero stats and ability data scraped from the Deadlock assets API. It pairs sortable data tables with comparison charts so you can spot outliers, theorycraft builds, and sanity-check in-game balance at a glance.

Live site: <https://deadlock-numbers.vercel.app>  
Source: <https://github.com/mattiapearl/deadlock-numbers>

## Key Views

- **View 1 · Weapon & Level Scaling** – Table covering base stats, per-level growth, pellets, DPS, and spirit bonuses.
- **View 2 · Weapon & Visual Scaling** – Line chart that compares gun DPS, spirit growth, and survivability curves across heroes.
- **View 3 · Ability Spirit Scaling** – Overlay hero abilities to understand burst damage and spirit scaling at different spirit totals.
- **View 4 · Ability Burst & Shred** – Detail table summarising cooldowns, spirit shred, and damage amplification effects.

## Running Locally

```bash
pnpm install
pnpm dev
```

The app runs on <http://localhost:3000>. Production builds run through `pnpm build`.

## Data & Contact

- Live data is fetched from `https://assets.deadlock-api.com/v2`.
- For feature requests or bug reports, reach out on Discord (`mattia2604`) or open an issue on GitHub.

## Thanks

- Mattia – [YouTube](https://www.youtube.com/@mattiadl) · [Twitch](https://www.twitch.tv/mattiadltv)
- Lightbringer – [Twitch](https://www.twitch.tv/lightbringer_dl)
- Deadlock API team (Raimann) – [GitHub Sponsors](https://github.com/sponsors/raimannma)