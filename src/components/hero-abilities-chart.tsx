"use client";

import * as React from "react";
import {
  AbilityDamageSummary,
  AbilityDamageTotals,
  AbilityTag,
  AbilityValueRange,
  HeroAbilityRow,
} from "@/lib/hero-abilities";
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

const TAG_LABELS: Record<AbilityTag, string> = {
  burst: "Burst",
  sustained: "DPS",
  "crowd-control": "CC",
  buff: "Buff",
  debuff: "Debuff",
};

function computeValueAtSpirit(
  intercept: number | null | undefined,
  scaling: number | null | undefined,
  spirit: number,
): number | null {
  if (intercept === null && scaling === null) {
    return null;
  }
  const interceptValue = intercept ?? 0;
  const scalingValue = scaling ?? 0;
  return interceptValue + scalingValue * spirit;
}

function getRangeValue(range: AbilityValueRange | undefined, band: AbilityLevelBand): number | null {
  if (!range) {
    return null;
  }
  return band === "lv0" ? range.base ?? null : range.max ?? null;
}

const TOTALS_EPSILON = 1e-6;

function totalsApproximatelyEqual(a: AbilityDamageTotals, b: AbilityDamageTotals): boolean {
  return (
    Math.abs(a.interceptBase - b.interceptBase) <= TOTALS_EPSILON &&
    Math.abs(a.interceptMax - b.interceptMax) <= TOTALS_EPSILON &&
    Math.abs(a.scalingBase - b.scalingBase) <= TOTALS_EPSILON &&
    Math.abs(a.scalingMax - b.scalingMax) <= TOTALS_EPSILON
  );
}

function createDamageVariantConfigs(summary: AbilityDamageSummary): Array<{
  key: string;
  label: string;
  totals: AbilityDamageTotals;
}> {
  if (summary.value.base === null && summary.value.max === null) {
    return [];
  }

  if (totalsApproximatelyEqual(summary.totals.min, summary.totals.max)) {
    return [{ key: "total", label: "", totals: summary.totals.min }];
  }

  return [
    { key: "min", label: "Min", totals: summary.totals.min },
    { key: "max", label: "Max", totals: summary.totals.max },
  ];
}

function computeDamageFromTotals(
  totals: AbilityDamageTotals,
  spirit: number,
  band: AbilityLevelBand,
): number {
  const intercept = band === "lv0" ? totals.interceptBase : totals.interceptMax;
  const scaling = band === "lv0" ? totals.scalingBase : totals.scalingMax;
  return intercept + scaling * spirit;
}

const baseMetricDefinitions: MetricDefinition[] = [
  {
    id: "burstDamage",
    label: "Burst Damage per Cast",
    description: "Total ability burst damage using current spirit and charges",
    getBaseValue: (ability) => ability.metrics.damage.burst.value.base,
    getMaxValue: (ability) => ability.metrics.damage.burst.value.max,
    computeAtSpirit: (ability, spirit, band) => {
      const burst = ability.metrics.damage.burst;
      const intercept = band === "lv0" ? burst.intercept.base : burst.intercept.max;
      const scaling = band === "lv0" ? burst.scaling.base : burst.scaling.max;
      return computeValueAtSpirit(intercept, scaling, spirit);
    },
  },
  {
    id: "burstDpm",
    label: "Burst Damage per Minute",
    description: "Damage output per minute assuming the ability is used on cooldown",
    getBaseValue: (ability) => ability.metrics.damage.burst.perMinute?.base ?? null,
    getMaxValue: (ability) => ability.metrics.damage.burst.perMinute?.max ?? null,
    computeAtSpirit: (ability, spirit, band) => {
      const burst = ability.metrics.damage.burst;
      const intercept = band === "lv0" ? burst.intercept.base : burst.intercept.max;
      const scaling = band === "lv0" ? burst.scaling.base : burst.scaling.max;
      if (intercept === null && scaling === null) {
        return null;
      }
      const damage = computeValueAtSpirit(intercept, scaling, spirit);
      if (damage === null) {
        return null;
      }
      const charges = getRangeValue(ability.metrics.cadence.charges, band) ?? 1;
      const cooldown = getRangeValue(ability.metrics.cadence.cooldown, band);
      if (!cooldown || cooldown <= 0) {
        return null;
      }
      return (damage * Math.max(charges, 1) * 60) / cooldown;
    },
  },
  {
    id: "burstScaling",
    label: "Burst Scaling per Spirit",
    description: "Aggregate burst scaling applied to the ability per point of spirit",
    getBaseValue: (ability) => ability.metrics.damage.burst.scaling.base ?? null,
    getMaxValue: (ability) => ability.metrics.damage.burst.scaling.max ?? null,
    computeAtSpirit: (ability, _spirit, band) =>
      band === "lv0"
        ? ability.metrics.damage.burst.scaling.base ?? null
        : ability.metrics.damage.burst.scaling.max ?? null,
  },
  {
    id: "sustainedDps",
    label: "Sustained Damage per Second",
    description: "Damage per second from sustained components at the sampled spirit value",
    getBaseValue: (ability) => ability.metrics.damage.sustained.value.base,
    getMaxValue: (ability) => ability.metrics.damage.sustained.value.max,
    computeAtSpirit: (ability, spirit, band) => {
      const sustained = ability.metrics.damage.sustained;
      const intercept = band === "lv0" ? sustained.intercept.base : sustained.intercept.max;
      const scaling = band === "lv0" ? sustained.scaling.base : sustained.scaling.max;
      return computeValueAtSpirit(intercept, scaling, spirit);
    },
  },
  {
    id: "sustainedScaling",
    label: "Sustained Scaling per Spirit",
    description: "Per-spirit scaling contributed by sustained damage components",
    getBaseValue: (ability) => ability.metrics.damage.sustained.scaling.base ?? null,
    getMaxValue: (ability) => ability.metrics.damage.sustained.scaling.max ?? null,
    computeAtSpirit: (ability, _spirit, band) =>
      band === "lv0"
        ? ability.metrics.damage.sustained.scaling.base ?? null
        : ability.metrics.damage.sustained.scaling.max ?? null,
  },
  {
    id: "stunDuration",
    label: "Stun Duration",
    description: "Maximum stun duration applied by the ability",
    getBaseValue: (ability) => ability.metrics.control.summary.stun?.base ?? null,
    getMaxValue: (ability) => ability.metrics.control.summary.stun?.max ?? null,
  },
];

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const levelViewOptions = [
  { value: "lv0", label: "Level 0" },
  { value: "max", label: "Max Level" },
  { value: "both", label: "Both" },
] as const;

const damageFilterOptions: Array<{ value: AbilityTag; label: string }> = [
  { value: "burst", label: "Burst" },
  { value: "sustained", label: "DPS" },
];

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
  const [damageFilters, setDamageFilters] = React.useState<AbilityTag[]>([]);

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
      return preparedAbilities.filter((ability) => {
        if (!damageFilters.length) {
          return true;
        }
        return damageFilters.some((filter) => ability.tags.includes(filter));
      });
    }

    return preparedAbilities.filter((ability) => {
      const matchesSearch =
        ability.heroName.toLowerCase().includes(normalized) ||
        ability.abilityName.toLowerCase().includes(normalized);
      if (!matchesSearch) {
        return false;
      }
      if (!damageFilters.length) {
        return true;
      }
      return damageFilters.some((filter) => ability.tags.includes(filter));
    });
  }, [damageFilters, preparedAbilities, searchQuery]);

  const [selectedAbilityKeys, setSelectedAbilityKeys] = React.useState<string[]>(() =>
    preparedAbilities.slice(0, 5).map((ability) => getAbilityKey(ability)),
  );

  const levelViewLabel = React.useMemo(
    () => levelViewOptions.find((option) => option.value === levelView)?.label ?? "",
    [levelView],
  );

  const getAbilityCategoryLabel = React.useCallback((ability: HeroAbilityRow): string | null => {
    if (!ability.tags.length) {
      return null;
    }
    const preferredOrder: AbilityTag[] = ["burst", "sustained", "crowd-control", "buff", "debuff"];
    const labels = preferredOrder
      .filter((tag) => ability.tags.includes(tag))
      .map((tag) => TAG_LABELS[tag] ?? tag);
    if (!labels.length) {
      return null;
    }
    return labels.join(" · ");
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

      let variants: Array<{ key: string; label: string; totals: AbilityDamageTotals }> | null = null;

      if (selectedMetric.id === "burstDamage" || selectedMetric.id === "burstDpm") {
        variants = createDamageVariantConfigs(ability.metrics.damage.burst);
      } else if (selectedMetric.id === "sustainedDps") {
        variants = createDamageVariantConfigs(ability.metrics.damage.sustained);
      }

      if (variants && variants.length > 0) {
        return variants
          .flatMap((variant) =>
            bands
              .map<MetricLineChartSeries | null>((band) => {
                const data = spiritSamples
                  .map((spirit) => {
                    if (selectedMetric.id === "burstDpm") {
                      const charges =
                        getRangeValue(ability.metrics.cadence.charges, band) ?? 1;
                      const cooldown = getRangeValue(ability.metrics.cadence.cooldown, band);
                      if (!cooldown || cooldown <= 0) {
                        return null;
                      }
                      const multiplier = (Math.max(charges, 1) * 60) / cooldown;
                      const damage = computeDamageFromTotals(variant.totals, spirit, band);
                      return { x: spirit, y: damage * multiplier };
                    }

                    const value = computeDamageFromTotals(variant.totals, spirit, band);
                    return { x: spirit, y: value };
                  })
                  .filter((point): point is MetricLineChartDatum => point !== null);

                if (!data.length) {
                  return null;
                }

                const categoryLabel = getAbilityCategoryLabel(ability);
                const bandLabel = band === "lv0" ? "Lv0" : "Max";
                const variantLabel = variant.label ? ` · ${variant.label}` : "";

                let strokeDasharray: string | undefined;
                if (variant.key === "min") {
                  strokeDasharray = "2 4";
                } else if (band === "lv0" && levelView === "both") {
                  strokeDasharray = "6 4";
                }

                return {
                  id: `${key}-${variant.key}-${band}`,
                  label: `${ability.heroName} – ${ability.abilityName} (${bandLabel}${categoryLabel ? ` · ${categoryLabel}` : ""}${variantLabel})`,
                  data,
                  colorIndex,
                  strokeDasharray,
                } satisfies MetricLineChartSeries;
              })
              .filter((series): series is MetricLineChartSeries => Boolean(series)),
          )
          .flat();
      }

      return bands
        .map<MetricLineChartSeries | null>((band) => {
          const referenceValue =
            band === "lv0" ? selectedMetric.getBaseValue(ability) : selectedMetric.getMaxValue(ability);
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
  const handleToggleDamageFilter = React.useCallback((tag: AbilityTag) => {
    setDamageFilters((current) =>
      current.includes(tag) ? current.filter((existing) => existing !== tag) : [...current, tag],
    );
  }, []);


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
                {damageFilterOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={damageFilters.includes(option.value)}
                      onChange={() => handleToggleDamageFilter(option.value)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                    />
                    {option.label}
                  </label>
                ))}
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


