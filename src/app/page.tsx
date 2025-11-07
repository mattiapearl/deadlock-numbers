import { HeroGrowthTable } from "@/components/hero-growth-table";
import { HeroGrowthChart } from "@/components/hero-growth-chart";
import { HeroAbilitiesChart } from "@/components/hero-abilities-chart";
import { HeroAbilityTable } from "@/components/hero-abilities-table";
import { getHeroes, getItems } from "@/lib/deadlock-api";
import { buildHeroGrowthRows } from "@/lib/hero-growth";
import { buildHeroAbilityRows } from "@/lib/hero-abilities";
import type { LucideIcon } from "lucide-react";
import { Github, Twitch, Youtube } from "lucide-react";

type FooterLinkProps = {
  href: string;
  icon: LucideIcon;
  label: string;
};

function FooterLink({ href, icon: Icon, label }: FooterLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/40"
    >
      <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

export default async function Home() {
  const [heroes, items] = await Promise.all([getHeroes(), getItems()]);
  const growthRows = buildHeroGrowthRows(heroes, items);
  const abilityRows = buildHeroAbilityRows(heroes, items);

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 sm:px-12">
        <section className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Deadlock Data Explorer
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Hero Growth Metrics
          </h1>
          <p className="max-w-3xl text-base text-zinc-600 dark:text-zinc-300">
            Compare how each hero&apos;s primary weapon and survivability scale with level. Sort and filter the table to find
            standout DPS curves, identify tanky frontliners, or spot builds that spike as they reach max level.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">View 1 · Weapon &amp; Level Scaling</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All base stats and growth calculations are derived directly from the Deadlock assets API. Alternate-fire metrics
              are shown when a secondary weapon is defined for that hero.
            </p>
          </div>

          <HeroGrowthTable data={growthRows} />
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">View 2 · Weapon &amp; Visual Scaling</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Pick any combination of heroes and see how their core stats evolve with level. Compare gun DPS, per-shot damage,
              max health, move speed, or spirit gain on a single timeline.
            </p>
          </div>

          <HeroGrowthChart heroes={heroes} items={items} />
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">View 3 · Ability Spirit Scaling</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Compare signature abilities by how their burst potential and spirit scaling progress as heroes invest in spirit.
              Filter by hero and overlay multiple skills to see who spikes hardest at high spirit totals.
            </p>
          </div>

          <HeroAbilitiesChart data={abilityRows} />
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">View 4 · Ability Burst &amp; Shred</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signature abilities, cooldown cadence, and burst potential. Includes spirit-scaling damage, gun/spirit shred, and
              damage amplification effects aggregated from each ability&apos;s property list.
            </p>
          </div>

          <HeroAbilityTable data={abilityRows} />
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 sm:px-12">
          <div className="flex flex-col gap-3">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Mattia</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">&lsquo;I&apos;m the dude who made the wesbite&rsquo;</p>
            <div className="flex flex-wrap gap-4">
              <FooterLink
                href="https://www.youtube.com/@mattiadl"
                icon={Youtube}
                label="YT: @mattiadl"
              />
              <FooterLink
                href="https://www.twitch.tv/mattiadltv"
                icon={Twitch}
                label="Twitch: mattiadltv"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Lightbringer</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              &lsquo;For the starting tables and help during the construction of the website, overall just the goat&rsquo;
            </p>
            <FooterLink
              href="https://www.twitch.tv/lightbringer_dl"
              icon={Twitch}
              label="Lightbringer on Twitch"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Deadlock API team (Raimann)</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              &lsquo;This entire project ONLY exists thanks to the DL API, go support it here:&rsquo;
            </p>
            <FooterLink
              href="https://github.com/sponsors/raimannma"
              icon={Github}
              label="Manuel on GitHub Sponsors"
            />
          </div>
        </div>
      </footer>
    </>
  );
}
