"use client";

import * as React from "react";
import { HeroAbilityRow } from "@/lib/hero-abilities";
import {
  MetricLineChart,
  type MetricLineChartSeries,
  type MetricLineChartDatum,
} from "@/components/metric-line-chart";

type HeroAbilityChartProps = {
  data: HeroAbilityRow[];
};

type MetricDefinition = {
  id: string;
  label: string;
  description?: string;
  format?: (value: number | null) => string;
  getBaseValue: (ability: HeroAbilityRow) => number | null;
  getMaxValue: (ability: HeroAbilityRow) => number | null;
  computeAtSpirit?: (ability: HeroAbilityRow, spirit: number, band: AbilityLevelBand) => number | null;
};

type AbilityLevelBand = "lv0" | "max";

const baseMetricDefinitions: MetricDefinition[] = [
  {
    id: "burstDamage",
    label: "Burst Damage per Cast",
    description: "Total ability burst damage using current spirit and charges",
    getBaseValue: (ability) => ability.burstDamageBase,
    getMaxValue: (ability) => ability.burstDamageMax,
    computeAtSpirit: (ability, spirit, band) => {
      const referenceSpirit = band === "lv0" ? ability.baseSpiritPower : ability.maxSpiritPower;
      const scaling = band === "lv0" ? ability.spiritScalingBase : ability.spiritScalingMax;
      const referenceValue = band === "lv0" ? ability.burstDamageBase : ability.burstDamageMax;
      if (referenceValue === null) {
        return null;
      }

      const effectiveScaling = scaling ?? 0;
      const intercept = referenceValue - referenceSpirit * effectiveScaling;
      return intercept + spirit * effectiveScaling;
    },
  },
  {
    id: "burstDpm",
    label: "Burst Damage per Minute",
    description: "Damage output per minute assuming the ability is used on cooldown",
    getBaseValue: (ability) => ability.burstDpmBase,
    getMaxValue: (ability) => ability.burstDpmMax,
    computeAtSpirit: (ability, spirit, band) => {
      const referenceSpirit = band === "lv0" ? ability.baseSpiritPower : ability.maxSpiritPower;
      const scaling = band === "lv0" ? ability.spiritScalingBase : ability.spiritScalingMax;
      const referenceValue = band === "lv0" ? ability.burstDpmBase : ability.burstDpmMax;
      if (referenceValue === null) {
        return null;
      }

      const effectiveScaling = scaling ?? 0;
      const intercept = referenceValue - referenceSpirit * effectiveScaling;
      return intercept + spirit * effectiveScaling;
    },
  },
  {
    id: "spiritScaling",
    label: "Total Spirit Scaling",
    description: "Aggregate spirit scaling applied to the ability per cast",
    getBaseValue: (ability) => ability.spiritScalingBase,
    getMaxValue: (ability) => ability.spiritScalingMax,
    computeAtSpirit: (ability, _spirit, band) =>
      band === "lv0" ? ability.spiritScalingBase ?? null : ability.spiritScalingMax ?? null,
  },
];

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const levelViewOptions = [
  { value: "lv0", label: "Level 0" },
  { value: "max", label: "Max Level" },
  { value: "both", label: "Both" },
] as const;

type LevelView = (typeof levelViewOptions)[number]["value"];

function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function hasMetricData(metric: MetricDefinition, ability: HeroAbilityRow): boolean {
  const baseValue = metric.getBaseValue(ability);
  const maxValue = metric.getMaxValue(ability);
  return baseValue !== null || maxValue !== null;
}

function createSpiritSamples(min: number, max: number, steps = 20): number[] {
  if (max <= min) {
    return [min, max];
  }

  const clampedSteps = Math.max(2, steps);
  return Array.from({ length: clampedSteps }, (_, index) => {
    const ratio = index / (clampedSteps - 1);
    return min + (max - min) * ratio;
  });
}

function getAbilityKey(row: HeroAbilityRow): string {
  return `${row.heroId}-${row.abilitySlot}`;
}

export function HeroAbilitiesChart({ data }: HeroAbilityChartProps) {
  const metricDefinitions = React.useMemo(
    () => baseMetricDefinitions.filter((metric) => data.some((ability) => hasMetricData(metric, ability))),
    [data],
  );

  const [selectedMetricId, setSelectedMetricId] = React.useState<string>(metricDefinitions[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDisabled, setShowDisabled] = React.useState(false);
  const [levelView, setLevelView] = React.useState<LevelView>("both");

  const preparedAbilities = React.useMemo(() => {
    return data
      .filter((ability) => (showDisabled ? true : !ability.isDisabled))
      .sort((a, b) => {
        if (a.heroName === b.heroName) {
          return a.abilityName.localeCompare(b.abilityName);
        }
        return a.heroName.localeCompare(b.heroName);
      });
  }, [data, showDisabled]);

  const filteredAbilities = React.useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return preparedAbilities;
    }

    return preparedAbilities.filter((ability) => {
      return (
        ability.heroName.toLowerCase().includes(normalized) || ability.abilityName.toLowerCase().includes(normalized)
      );
    });
  }, [preparedAbilities, searchQuery]);

  const [selectedAbilityKeys, setSelectedAbilityKeys] = React.useState<string[]>(() =>
    preparedAbilities.slice(0, 5).map((ability) => getAbilityKey(ability)),
  );

  const levelViewLabel = React.useMemo(
    () => levelViewOptions.find((option) => option.value === levelView)?.label ?? "",
    [levelView],
  );

  const getAbilityCategoryLabel = React.useCallback((ability: HeroAbilityRow): string | null => {
    const hasBurst = ability.hasBurstComponents;
    const hasDps = ability.hasDpsComponents;

    if (hasBurst && hasDps) return "Burst + DPS";
    if (hasBurst) return "Burst";
    if (hasDps) return "DPS";
    return null;
  }, []);

  React.useEffect(() => {
    setSelectedMetricId((current) => {
      if (metricDefinitions.find((metric) => metric.id === current)) {
        return current;
      }
      return metricDefinitions[0]?.id ?? "";
    });
  }, [metricDefinitions]);

  React.useEffect(() => {
    setSelectedAbilityKeys((current) =>
      current.filter((key) => preparedAbilities.some((ability) => getAbilityKey(ability) === key)),
    );
  }, [preparedAbilities]);

  const abilityColorIndex = React.useMemo(() => {
    const map = new Map<string, number>();
    preparedAbilities.forEach((ability, index) => {
      map.set(getAbilityKey(ability), index);
    });
    return map;
  }, [preparedAbilities]);

  const selectedMetric = React.useMemo(
    () => metricDefinitions.find((metric) => metric.id === selectedMetricId) ?? metricDefinitions[0],
    [metricDefinitions, selectedMetricId],
  );

  const chartSeries = React.useMemo<MetricLineChartSeries[]>(() => {
    if (!selectedMetric) {
      return [];
    }

    const bands: AbilityLevelBand[] = levelView === "both" ? ["lv0", "max"] : [levelView === "lv0" ? "lv0" : "max"];
    const spiritMin = 0;
    const spiritMax = 250;

    const spiritSamples = createSpiritSamples(spiritMin, spiritMax, 26);

    return selectedAbilityKeys.flatMap((key) => {
      const ability = preparedAbilities.find((item) => getAbilityKey(item) === key);
      if (!ability) {
        return [];
      }

      const colorIndex = abilityColorIndex.get(key) ?? 0;

      return bands
        .map<MetricLineChartSeries | null>((band) => {
          const referenceValue = band === "lv0" ? selectedMetric.getBaseValue(ability) : selectedMetric.getMaxValue(ability);
          if (referenceValue === null) {
            return null;
          }

          let data: MetricLineChartDatum[];

          if (selectedMetric.computeAtSpirit) {
            data = spiritSamples
              .map((spirit) => {
                const value = selectedMetric.computeAtSpirit?.(ability, spirit, band);
                if (value === null) {
                  return null;
                }
                return { x: spirit, y: value };
              })
              .filter((point): point is MetricLineChartDatum => point !== null);
          } else {
            data = [
              { x: spiritMin, y: referenceValue },
              { x: spiritMax, y: referenceValue },
            ];
          }

          if (!data.length) {
            return null;
          }

          const categoryLabel = getAbilityCategoryLabel(ability);
          const bandLabel = band === "lv0" ? "Lv0" : "Max";

          return {
            id: `${key}-${band}`,
            label: `${ability.heroName} – ${ability.abilityName} (${bandLabel}${categoryLabel ? ` · ${categoryLabel}` : ""})`,
            data,
            colorIndex,
            strokeDasharray: band === "lv0" && levelView === "both" ? "6 4" : undefined,
          } satisfies MetricLineChartSeries;
        })
        .filter((series): series is MetricLineChartSeries => Boolean(series));
    });
  }, [abilityColorIndex, getAbilityCategoryLabel, levelView, preparedAbilities, selectedAbilityKeys, selectedMetric]);

  const handleToggleAbility = React.useCallback((key: string) => {
    setSelectedAbilityKeys((current) =>
      current.includes(key) ? current.filter((existing) => existing !== key) : [...current, key],
    );
  }, []);

  const handleSelectAll = React.useCallback(() => {
    setSelectedAbilityKeys(filteredAbilities.map((ability) => getAbilityKey(ability)));
  }, [filteredAbilities]);

  const handleClearSelection = React.useCallback(() => {
    setSelectedAbilityKeys([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex w-full flex-col gap-2 lg:w-1/3">
            <label htmlFor="ability-metric-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Metric
            </label>
            <select
              id="ability-metric-select"
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
            {selectedMetric?.description ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedMetric.description}</p>
            ) : null}
            <label htmlFor="ability-level-view" className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Level snapshot
            </label>
            <select
              id="ability-level-view"
              value={levelView}
              onChange={(event) => setLevelView(event.target.value as LevelView)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
            >
              {levelViewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-2/3">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">Abilities</p>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search heroes or abilities..."
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
            <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800 sm:grid-cols-2">
              {filteredAbilities.map((ability) => {
                const key = getAbilityKey(ability);
                const checked = selectedAbilityKeys.includes(key);
                const categoryLabel = getAbilityCategoryLabel(ability);

                return (
                  <label
                    key={key}
                    className={`flex flex-col gap-1 rounded-md px-2 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      checked ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleAbility(key)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                      />
                      <span className="truncate text-zinc-700 dark:text-zinc-200">{ability.heroName}</span>
                    </span>
                    <span className="pl-6 text-xs text-zinc-500 dark:text-zinc-400">
                      {ability.abilityName}
                      {categoryLabel ? <span className="ml-1 inline-flex rounded bg-zinc-200 px-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{categoryLabel}</span> : null}
                    </span>
                    {ability.assumptionNotes.length ? (
                      <span className="pl-6 text-[11px] text-sky-600 dark:text-sky-400">
                        {ability.assumptionNotes.join(" · ")}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Select abilities to compare their spirit scaling curves. Use the search box to filter by hero or ability name.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Damage per cast is recalculated with <span className="font-medium">Base damage + (Spirit × Scaling)</span>. For the
              Level 0 view we subtract the hero&apos;s starting spirit from the burst numbers to find the base damage, then add the
              scaling back for each spirit sample. The Max view repeats the same calculation using max-level spirit and scaling.
            </p>
          </div>
        </div>
      </div>

      <MetricLineChart
        series={chartSeries}
        xLabel="Spirit"
        yLabel={selectedMetric?.label ?? "Value"}
        header={
          <div className="flex items-center justify-between">
            <span>{selectedMetric?.label ?? "Metric"}</span>
            <span>
              {selectedAbilityKeys.length} abil{selectedAbilityKeys.length === 1 ? "ity" : "ities"} selected · {levelViewLabel}
            </span>
          </div>
        }
        valueFormatter={(value) => selectedMetric?.format?.(value) ?? formatNumber(value)}
        xValueFormatter={(value) => `Spirit ${numberFormatter.format(value)}`}
        emptyMessage="Select at least one ability to display its spirit scaling curve."
        tooltipOptions={{ primaryColumnLimit: levelView === "both" ? 8 : 12, primaryColumnClassName: "grid-cols-1" }}
      />
    </div>
  );
}


