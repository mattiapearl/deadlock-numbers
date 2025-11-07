"use client";

import * as React from "react";
import { DeadlockItem, Hero, WeaponItem } from "@/lib/types";
import { MetricLineChart, type MetricLineChartSeries } from "@/components/metric-line-chart";

type HeroGrowthChartProps = {
  heroes: Hero[];
  items: DeadlockItem[];
};

type PreparedHero = {
  id: number;
  name: string;
  maxLevel: number;
  baseBulletDamage: number | null;
  dmgGain: number | null;
  baseHp: number | null;
  hpGain: number | null;
  baseSpirit: number;
  spiritGain: number;
  burstShotCount: number;
  projectileMultiplier: number | null;
  effectiveCycleTime: number | null;
  effectiveMaxSpinCycleTime: number | null;
  bulletDamagePerSpirit: number;
  roundsPerSecondPerSpirit: number;
};

type MetricDefinition = {
  id: string;
  label: string;
  compute: (hero: PreparedHero, level: number) => number | null;
  format?: (value: number | null) => string;
};

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function isWeaponItem(item: DeadlockItem | undefined): item is WeaponItem {
  return Boolean(item && item.type === "weapon");
}

function parseLevelNumbers(hero: Hero): number[] {
  const levels = Object.keys(hero.level_info ?? {})
    .map((level) => Number.parseInt(level, 10))
    .filter((level) => Number.isFinite(level));

  if (!levels.length) {
    return [1];
  }

  return Array.from({ length: Math.max(...levels) }, (_, index) => index + 1);
}

function prepareHero(hero: Hero, itemMap: Map<string, DeadlockItem>): PreparedHero | null {
  const heroItems = hero.items ?? {};
  const primaryWeaponClass = heroItems?.weapon_primary ?? heroItems?.weapon_secondary ?? null;
  const primaryWeapon = primaryWeaponClass ? itemMap.get(primaryWeaponClass) : undefined;
  const weaponInfo = isWeaponItem(primaryWeapon) ? primaryWeapon.weapon_info ?? null : null;

  const baseBulletDamage = weaponInfo?.bullet_damage ?? null;
  const pellets = weaponInfo?.bullets ?? null;
  const cycleTimeRaw = weaponInfo?.cycle_time ?? null;
  const maxSpinCycleTimeRaw = weaponInfo?.max_spin_cycle_time ?? cycleTimeRaw ?? null;
  const burstShotCount = Math.max(weaponInfo?.burst_shot_count ?? 1, 1);
  const intraBurstCycleTime = weaponInfo?.intra_burst_cycle_time ?? 0;

  const isDrifter = hero.class_name === "hero_drifter";
  const projectilesPerShot = pellets !== null ? (isDrifter ? 1 : pellets) : 1;
  const burstAdjustment = burstShotCount > 1 ? intraBurstCycleTime * burstShotCount : 0;
  const effectiveCycleTime = cycleTimeRaw !== null ? cycleTimeRaw + burstAdjustment : null;
  const effectiveMaxSpinCycleTime =
    maxSpinCycleTimeRaw !== null ? maxSpinCycleTimeRaw + burstAdjustment : effectiveCycleTime;
  const projectileMultiplier = projectilesPerShot * burstShotCount;
  const scalingStats = hero.scaling_stats ?? {};
  const bulletDamagePerSpirit = scalingStats?.EBulletDamage?.scale ?? 0;
  const roundsPerSecondPerSpirit = scalingStats?.ERoundsPerSecond?.scale ?? 0;

  const dmgGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL ?? null;
  const hpGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL ?? null;
  const spiritGain = hero.standard_level_up_upgrades?.MODIFIER_VALUE_TECH_POWER ?? 0;

  const baseHp = hero.starting_stats?.max_health?.value ?? null;
  const baseSpirit = hero.starting_stats?.spirit_power?.value ?? 0;

  const levelNumbers = parseLevelNumbers(hero);
  const maxLevel = levelNumbers[levelNumbers.length - 1] ?? 1;

  return {
    id: hero.id,
    name: hero.name,
    maxLevel,
    baseBulletDamage,
    dmgGain,
    baseHp,
    hpGain,
    baseSpirit,
    spiritGain,
    burstShotCount,
    projectileMultiplier,
    effectiveCycleTime,
    effectiveMaxSpinCycleTime,
    bulletDamagePerSpirit,
    roundsPerSecondPerSpirit,
  } satisfies PreparedHero;
}

function computeBulletDamage(hero: PreparedHero, level: number): number | null {
  if (hero.baseBulletDamage === null) return null;
  const gain = hero.dmgGain ?? 0;
  return hero.baseBulletDamage + gain * (level - 1);
}

function computeDps(hero: PreparedHero, level: number, useMaxSpin: boolean): number | null {
  if (!hero.projectileMultiplier) return null;
  const cycleTime = useMaxSpin ? hero.effectiveMaxSpinCycleTime : hero.effectiveCycleTime;
  if (!cycleTime || cycleTime === 0) return null;

  const damage = computeBulletDamage(hero, level);
  if (damage === null) return null;

  return (damage * hero.projectileMultiplier) / cycleTime;
}

function computeHp(hero: PreparedHero, level: number): number | null {
  if (hero.baseHp === null) return null;
  const gain = hero.hpGain ?? 0;
  return hero.baseHp + gain * (level - 1);
}

function computeSpirit(hero: PreparedHero, level: number): number {
  return hero.baseSpirit + hero.spiritGain * (level - 1);
}

function computeDpsWithSpirit(hero: PreparedHero, level: number, useMaxSpin: boolean): number | null {
  if (!hero.projectileMultiplier) return null;

  const damageBase = computeBulletDamage(hero, level);
  if (damageBase === null) {
    return null;
  }

  const spirit = computeSpirit(hero, level);
  const damageWithSpirit = damageBase + hero.bulletDamagePerSpirit * spirit;

  const cycleTimeRaw = useMaxSpin ? hero.effectiveMaxSpinCycleTime : hero.effectiveCycleTime;
  if (!cycleTimeRaw || cycleTimeRaw <= 0) {
    return null;
  }

  const baseFireRate = hero.burstShotCount / cycleTimeRaw;
  const adjustedFireRate = baseFireRate + hero.roundsPerSecondPerSpirit * spirit;
  if (adjustedFireRate <= 0) {
    return null;
  }

  const adjustedCycleTime = hero.burstShotCount / adjustedFireRate;
  if (!adjustedCycleTime || adjustedCycleTime <= 0) {
    return null;
  }

  return (damageWithSpirit * hero.projectileMultiplier) / adjustedCycleTime;
}

const metricDefinitions: MetricDefinition[] = [
  {
    id: "gunDpsBase",
    label: "Gun DPS (Base Spin)",
    compute: (hero, level) => computeDps(hero, level, false),
    format: formatNumber,
  },
  {
    id: "gunDpsMaxSpin",
    label: "Gun DPS (Max Spin)",
    compute: (hero, level) => computeDps(hero, level, true),
    format: formatNumber,
  },
  {
    id: "gunDpsMaxSpinSpirit",
    label: "Gun DPS (Full Spirit + Max Spin)",
    compute: (hero, level) => computeDpsWithSpirit(hero, level, true),
    format: formatNumber,
  },
  {
    id: "gunDamage",
    label: "Gun Damage (per Shot)",
    compute: (hero, level) => computeBulletDamage(hero, level),
    format: formatNumber,
  },
  {
    id: "hp",
    label: "Max Health",
    compute: (hero, level) => computeHp(hero, level),
    format: formatNumber,
  },
  {
    id: "spirit",
    label: "Spirit",
    compute: (hero, level) => computeSpirit(hero, level),
    format: formatNumber,
  },
];


export function HeroGrowthChart({ heroes, items }: HeroGrowthChartProps) {
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.class_name, item])), [items]);

  const preparedHeroes = React.useMemo(
    () =>
      heroes
        .map((hero) => prepareHero(hero, itemMap))
        .filter((hero): hero is PreparedHero => hero !== null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [heroes, itemMap],
  );

  const heroColorIndex = React.useMemo(() => {
    const map = new Map<number, number>();
    preparedHeroes.forEach((hero, index) => {
      map.set(hero.id, index);
    });
    return map;
  }, [preparedHeroes]);

  const [heroSearch, setHeroSearch] = React.useState("");
  const [showDisabled, setShowDisabled] = React.useState(false);

  const [selectedMetricId, setSelectedMetricId] = React.useState<string>(metricDefinitions[0]?.id ?? "");
  const [selectedHeroIds, setSelectedHeroIds] = React.useState<number[]>(() =>
    preparedHeroes.slice(0, 4).map((hero) => hero.id),
  );

  const filteredHeroes = React.useMemo(() => {
    const normalizedQuery = heroSearch.trim().toLowerCase();
    return preparedHeroes.filter((hero) => {
      if (!showDisabled && (heroes.find((h) => h.id === hero.id)?.disabled ?? false)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return hero.name.toLowerCase().includes(normalizedQuery);
    });
  }, [heroSearch, preparedHeroes, showDisabled, heroes]);

  const selectedMetric = React.useMemo(
    () => metricDefinitions.find((metric) => metric.id === selectedMetricId) ?? metricDefinitions[0],
    [selectedMetricId],
  );

  const chartSeries = React.useMemo<MetricLineChartSeries[]>(() => {
    if (!selectedMetric) return [];

    const result: MetricLineChartSeries[] = [];

    selectedHeroIds.forEach((heroId) => {
      const hero = preparedHeroes.find((item) => item.id === heroId);
      if (!hero) {
        return;
      }

      const levels = Array.from({ length: hero.maxLevel }, (_, index) => index + 1);
      const data = levels
        .map((level) => ({ x: level, y: selectedMetric.compute(hero, level) }))
        .filter((point): point is { x: number; y: number } => point.y !== null);

      if (!data.length) {
        return;
      }

      const colorIndex = heroColorIndex.get(hero.id) ?? 0;

      result.push({
        id: hero.id,
        label: hero.name,
        data,
        colorIndex,
      });
    });

    return result;
  }, [preparedHeroes, selectedHeroIds, selectedMetric, heroColorIndex]);

  const toggleHeroSelection = (id: number) => {
    setSelectedHeroIds((current) =>
      current.includes(id) ? current.filter((heroId) => heroId !== id) : [...current, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedHeroIds(filteredHeroes.map((hero) => hero.id));
  };

  const handleClearSelection = () => {
    setSelectedHeroIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex w-full flex-col gap-2 lg:w-1/3">
            <label htmlFor="hero-metric-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Metric
            </label>
            <select
              id="hero-metric-select"
              value={selectedMetric?.id}
              onChange={(event) => setSelectedMetricId(event.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
            >
              {metricDefinitions.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-2/3">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">Heroes</p>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(event) => setHeroSearch(event.target.value)}
                  placeholder="Search heroes..."
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={handleSelectAll}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={handleClearSelection}
                >
                  Clear
                </button>
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={showDisabled}
                    onChange={() => setShowDisabled((prev) => !prev)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                  />
                  Show disabled heroes
                </label>
              </div>
            </div>
            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              {filteredHeroes.map((hero) => {
                const checked = selectedHeroIds.includes(hero.id);
                return (
                  <label
                    key={hero.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      checked ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHeroSelection(hero.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                    />
                    <span className="truncate text-zinc-700 dark:text-zinc-200">{hero.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Select heroes to compare how their stats scale from level 1 to max level. Use the search box to filter, or bulk select/clear the visible heroes.
            </p>
          </div>
        </div>
      </div>

      <MetricLineChart
        series={chartSeries}
        xLabel="Level"
        yLabel={selectedMetric?.label ?? "Value"}
        header={
          <div className="flex items-center justify-between">
            <span>{selectedMetric?.label ?? "Metric"}</span>
            <span>
              {selectedHeroIds.length} hero{selectedHeroIds.length === 1 ? "" : "es"} selected
            </span>
          </div>
        }
        valueFormatter={(value) => selectedMetric?.format?.(value) ?? formatNumber(value)}
        xValueFormatter={(value) => `Level ${numberFormatter.format(value)}`}
        emptyMessage="Select at least one hero to display their growth curve."
      />
    </div>
  );
}


