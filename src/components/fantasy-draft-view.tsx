"use client";

import * as React from "react";
import { Ban, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Hero } from "@/lib/types";

type TeamKey = "teamA" | "teamB";

type TeamState = Record<TeamKey, number[]>;

type FantasyDraftViewProps = {
  heroes: Hero[];
};

const TEAM_CONFIG: Record<
  TeamKey,
  {
    label: string;
    shortLabel: string;
    accent: string;
    accentMuted: string;
    badge: string;
  }
> = {
  teamA: {
    label: "Amber Hand",
    shortLabel: "Amber",
    accent: "border-amber-500 dark:border-amber-500",
    accentMuted: "bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  },
  teamB: {
    label: "Sapphire Flame",
    shortLabel: "Sapphire",
    accent: "border-blue-500 dark:border-blue-500",
    accentMuted: "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
  },
};

const PICK_BUTTON_STYLES: Record<TeamKey, string> = {
  teamA:
    "bg-amber-500 text-amber-950 hover:bg-amber-600 focus-visible:ring-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-amber-950",
  teamB:
    "bg-blue-500 text-blue-50 hover:bg-blue-600 focus-visible:ring-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-blue-50",
};

const BAN_BUTTON_STYLES: Record<TeamKey, string> = {
  teamA:
    "bg-rose-500 text-rose-50 hover:bg-rose-600 focus-visible:ring-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400",
  teamB:
    "bg-rose-500 text-rose-50 hover:bg-rose-600 focus-visible:ring-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400",
};

const DISABLED_ACTION_CLASSES =
  "cursor-not-allowed bg-zinc-200 text-zinc-500 opacity-50 dark:bg-zinc-800/40 dark:text-zinc-500";

const BANNED_BADGE_CLASSES =
  "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:bg-rose-900/40 dark:text-rose-200";

type ActionButtonProps = {
  ariaLabel: string;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  team: TeamKey;
  tooltip?: string | null;
  variant: "pick" | "ban";
};

function ActionButton({
  ariaLabel,
  disabled,
  icon: Icon,
  label,
  onClick,
  team,
  tooltip,
  variant,
}: ActionButtonProps) {
  const palette =
    variant === "pick" ? PICK_BUTTON_STYLES[team] : BAN_BUTTON_STYLES[team];
  const baseClasses =
    "inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900";
  const className = `${baseClasses} ${disabled ? DISABLED_ACTION_CLASSES : palette}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      onClick={onClick}
      title={tooltip ?? undefined}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function getOpponent(team: TeamKey): TeamKey {
  return team === "teamA" ? "teamB" : "teamA";
}

function getHeroImage(hero: Hero | undefined): string | null {
  if (!hero) {
    return null;
  }
  return (
    hero.images?.icon_image_small_webp ??
    hero.images?.icon_image_small ??
    hero.images?.icon_hero_card ??
    null
  );
}

function HeroSlot({
  hero,
  onRemove,
  placeholder,
}: {
  hero: Hero | undefined;
  onRemove: (() => void) | null;
  placeholder: string;
}) {
  if (!hero) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
        <span>{placeholder}</span>
      </div>
    );
  }

  const heroImage = getHeroImage(hero);
  const heroInitials = hero.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      <div className="flex items-center gap-3">
        {heroImage ? (
          <img
            src={heroImage}
            alt={hero.name}
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-cover shadow-sm"
            loading="lazy"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {heroInitials}
          </div>
        )}
        <span className="truncate">{hero.name}</span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-3 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Remove
        </button>
      )}
    </div>
  );
}

type TeamPanelProps = {
  team: TeamKey;
  picks: number[];
  bans: number[];
  globalBans: number[];
  heroMap: Map<number, Hero>;
  onRemovePick: (heroId: number) => void;
  onRemoveBan: (heroId: number) => void;
};

function TeamPanel({ team, picks, bans, globalBans, heroMap, onRemovePick, onRemoveBan }: TeamPanelProps) {
  const teamLabel = TEAM_CONFIG[team].label;

  return (
    <div className={`flex flex-col gap-5 rounded-2xl border-2 ${TEAM_CONFIG[team].accent} bg-white p-5 shadow-sm dark:bg-zinc-900`}>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${TEAM_CONFIG[team].accentMuted}`}>
            {teamLabel}
          </span>
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Each team drafts up to six heroes. Banned heroes disable picks for both sides.</p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Picks</h4>
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, index) => {
            const heroId = picks[index];
            const hero = heroId !== undefined ? heroMap.get(heroId) : undefined;
            return (
              <HeroSlot
                key={`pick-${index}`}
                hero={hero}
                placeholder={`Slot ${index + 1}`}
                onRemove={hero ? () => onRemovePick(hero.id) : null}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Bans</h4>
        <div className="grid gap-2">
          {Array.from({ length: 2 }, (_, index) => {
            const heroId = bans[index];
            const hero = heroId !== undefined ? heroMap.get(heroId) : undefined;
            return (
              <HeroSlot
                key={`ban-${index}`}
                hero={hero}
                placeholder={`Ban ${index + 1}`}
                onRemove={hero ? () => onRemoveBan(hero.id) : null}
              />
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Banned heroes are unavailable to both teams.</p>
      </div>

      <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Currently banned</p>
        {globalBans.length ? (
          <ul className="space-y-1">
            {globalBans.map((heroId) => {
              const hero = heroMap.get(heroId);
              if (!hero) return null;
              return <li key={hero.id}>{hero.name}</li>;
            })}
          </ul>
        ) : (
          <p>No bans have been applied.</p>
        )}
      </div>
    </div>
  );
}

function buildDisabledReason({
  heroId,
  team,
  picks,
  bans,
}: {
  heroId: number;
  team: TeamKey;
  picks: TeamState;
  bans: TeamState;
}): { disabled: boolean; reason: string | null } {
  const opponent = getOpponent(team);

  if (picks[team].includes(heroId)) {
    return { disabled: true, reason: `${TEAM_CONFIG[team].label} already picked this hero.` };
  }

  if (picks[opponent].includes(heroId)) {
    return { disabled: true, reason: `${TEAM_CONFIG[opponent].label} already picked this hero.` };
  }

  if (bans.teamA.includes(heroId) || bans.teamB.includes(heroId)) {
    return { disabled: true, reason: "This hero is banned for both teams." };
  }

  if (picks[team].length >= 6) {
    return { disabled: true, reason: `${TEAM_CONFIG[team].label} already has six heroes.` };
  }

  return { disabled: false, reason: null };
}

function buildBanDisabledReason({
  heroId,
  team,
  picks,
  bans,
}: {
  heroId: number;
  team: TeamKey;
  picks: TeamState;
  bans: TeamState;
}): { disabled: boolean; reason: string | null } {
  const opponent = getOpponent(team);

  if (bans[team].includes(heroId)) {
    return { disabled: true, reason: "This hero is already banned." };
  }

  if (bans[opponent].includes(heroId)) {
    return { disabled: true, reason: "This hero is already banned." };
  }

  if (picks.teamA.includes(heroId) || picks.teamB.includes(heroId)) {
    return { disabled: true, reason: "Picked heroes cannot be banned." };
  }

  if (bans[team].length >= 2) {
    return { disabled: true, reason: `${TEAM_CONFIG[team].label} already used both bans.` };
  }

  return { disabled: false, reason: null };
}

export function FantasyDraftView({ heroes }: FantasyDraftViewProps) {
  const enabledHeroes = React.useMemo(
    () =>
      heroes
        .filter((hero) => !(hero.disabled ?? false))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [heroes],
  );

  const heroMap = React.useMemo(() => new Map(enabledHeroes.map((hero) => [hero.id, hero])), [enabledHeroes]);

  const [search, setSearch] = React.useState("");
  const [teamPicks, setTeamPicks] = React.useState<TeamState>({ teamA: [], teamB: [] });
  const [teamBans, setTeamBans] = React.useState<TeamState>({ teamA: [], teamB: [] });
  const globalBans = React.useMemo(
    () => Array.from(new Set([...teamBans.teamA, ...teamBans.teamB])),
    [teamBans],
  );

  const filteredHeroes = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return enabledHeroes;
    }

    return enabledHeroes.filter((hero) => hero.name.toLowerCase().includes(query));
  }, [enabledHeroes, search]);

  const handlePick = React.useCallback(
    (team: TeamKey, heroId: number) => {
      setTeamPicks((current) => {
        if (current[team].includes(heroId)) {
          return current;
        }

        const opponent = getOpponent(team);
        if (current.teamA.includes(heroId) || current.teamB.includes(heroId)) {
          return current;
        }
        if (teamBans[opponent].includes(heroId)) {
          return current;
        }
        if (current[team].length >= 6) {
          return current;
        }

        return {
          ...current,
          [team]: [...current[team], heroId],
        };
      });
    },
    [teamBans],
  );

  const handleRemovePick = React.useCallback((team: TeamKey, heroId: number) => {
    setTeamPicks((current) => ({
      ...current,
      [team]: current[team].filter((id) => id !== heroId),
    }));
  }, []);

  const handleBan = React.useCallback(
    (team: TeamKey, heroId: number) => {
      setTeamBans((current) => {
        if (current[team].includes(heroId)) {
          return current;
        }

        const opponent = getOpponent(team);
        if (current[opponent].includes(heroId)) {
          return current;
        }
        if (teamPicks.teamA.includes(heroId) || teamPicks.teamB.includes(heroId)) {
          return current;
        }
        if (current[team].length >= 2) {
          return current;
        }

        return {
          ...current,
          [team]: [...current[team], heroId],
        };
      });
    },
    [teamPicks],
  );

  const handleRemoveBan = React.useCallback((team: TeamKey, heroId: number) => {
    setTeamBans((current) => ({
      ...current,
      [team]: current[team].filter((id) => id !== heroId),
    }));
  }, []);

  const handleReset = React.useCallback(() => {
    setTeamPicks({ teamA: [], teamB: [] });
    setTeamBans({ teamA: [], teamB: [] });
    setSearch("");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Hero Pool</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Click to assign heroes to a team or ban them. Disabled heroes are hidden automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search heroes..."
              className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reset draft
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {filteredHeroes.length ? (
            <div className="max-h-[30rem] overflow-y-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      Hero
                    </th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {TEAM_CONFIG.teamA.shortLabel} Pick
                    </th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {TEAM_CONFIG.teamB.shortLabel} Pick
                    </th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {TEAM_CONFIG.teamA.shortLabel} Ban
                    </th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {TEAM_CONFIG.teamB.shortLabel} Ban
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredHeroes.map((hero) => {
                    const pickStateTeamA = buildDisabledReason({
                      heroId: hero.id,
                      team: "teamA",
                      picks: teamPicks,
                      bans: teamBans,
                    });
                    const pickStateTeamB = buildDisabledReason({
                      heroId: hero.id,
                      team: "teamB",
                      picks: teamPicks,
                      bans: teamBans,
                    });
                    const banStateTeamA = buildBanDisabledReason({
                      heroId: hero.id,
                      team: "teamA",
                      picks: teamPicks,
                      bans: teamBans,
                    });
                    const banStateTeamB = buildBanDisabledReason({
                      heroId: hero.id,
                      team: "teamB",
                      picks: teamPicks,
                      bans: teamBans,
                    });

                    const pickedTeam: TeamKey | null = teamPicks.teamA.includes(hero.id)
                      ? "teamA"
                      : teamPicks.teamB.includes(hero.id)
                        ? "teamB"
                        : null;
                    const bannedTeam: TeamKey | null = teamBans.teamA.includes(hero.id)
                      ? "teamA"
                      : teamBans.teamB.includes(hero.id)
                        ? "teamB"
                        : null;

                    const heroImage = getHeroImage(hero);
                    const heroInitials = hero.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={hero.id}
                        className="bg-white/70 transition hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            {heroImage ? (
                              <img
                                src={heroImage}
                                alt={hero.name}
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-md object-cover shadow-sm"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-200 text-[11px] font-semibold uppercase text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                                {heroInitials}
                              </div>
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {hero.name}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {pickedTeam && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TEAM_CONFIG[pickedTeam].badge}`}
                                  >
                                    <UserPlus aria-hidden="true" className="h-3 w-3" />
                                    {TEAM_CONFIG[pickedTeam].shortLabel} Picked
                                  </span>
                                )}
                                {bannedTeam && (
                                  <span className={BANNED_BADGE_CLASSES}>
                                    <Ban aria-hidden="true" className="h-3 w-3" />
                                    Banned
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ActionButton
                            ariaLabel={`Pick ${hero.name} for ${TEAM_CONFIG.teamA.label}`}
                            disabled={pickStateTeamA.disabled}
                            icon={UserPlus}
                            label="Pick"
                            onClick={() => handlePick("teamA", hero.id)}
                            team="teamA"
                            tooltip={pickStateTeamA.reason ?? `Pick ${hero.name} for ${TEAM_CONFIG.teamA.label}`}
                            variant="pick"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ActionButton
                            ariaLabel={`Pick ${hero.name} for ${TEAM_CONFIG.teamB.label}`}
                            disabled={pickStateTeamB.disabled}
                            icon={UserPlus}
                            label="Pick"
                            onClick={() => handlePick("teamB", hero.id)}
                            team="teamB"
                            tooltip={pickStateTeamB.reason ?? `Pick ${hero.name} for ${TEAM_CONFIG.teamB.label}`}
                            variant="pick"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ActionButton
                            ariaLabel={`Ban ${hero.name} on behalf of ${TEAM_CONFIG.teamA.label}`}
                            disabled={banStateTeamA.disabled}
                            icon={Ban}
                            label="Ban"
                            onClick={() => handleBan("teamA", hero.id)}
                            team="teamA"
                            tooltip={banStateTeamA.reason ?? `Ban ${hero.name} on behalf of ${TEAM_CONFIG.teamA.label}`}
                            variant="ban"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ActionButton
                            ariaLabel={`Ban ${hero.name} on behalf of ${TEAM_CONFIG.teamB.label}`}
                            disabled={banStateTeamB.disabled}
                            icon={Ban}
                            label="Ban"
                            onClick={() => handleBan("teamB", hero.id)}
                            team="teamB"
                            tooltip={banStateTeamB.reason ?? `Ban ${hero.name} on behalf of ${TEAM_CONFIG.teamB.label}`}
                            variant="ban"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center px-6 text-sm text-zinc-500 dark:text-zinc-400">
              No heroes match this search.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["teamA", "teamB"] as TeamKey[]).map((team) => (
          <TeamPanel
            key={team}
            team={team}
            picks={teamPicks[team]}
            bans={teamBans[team]}
            globalBans={globalBans}
            heroMap={heroMap}
            onRemovePick={(heroId) => handleRemovePick(team, heroId)}
            onRemoveBan={(heroId) => handleRemoveBan(team, heroId)}
          />
        ))}
      </div>
    </div>
  );
}


