"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import {
  AbilityDamageSummary,
  AbilityDamageTotals,
  AbilityModifierEffect,
  AbilityTag,
  AbilityValueRange,
  HeroAbilityRow,
} from "@/lib/hero-abilities";

type HeroAbilityTableProps = {
  data: HeroAbilityRow[];
};

function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatRange(
  base: number | null,
  max: number | null,
  options?: Intl.NumberFormatOptions,
  suffix?: string,
): string {
  const baseFormatted = formatNumber(base, options);
  const maxFormatted = formatNumber(max, options);

  const append = (value: string) => (suffix && value !== "—" ? `${value}${suffix}` : value);

  if (max === null || base === max) {
    return append(baseFormatted);
  }

  return `${append(baseFormatted)} → ${append(maxFormatted)}`;
}

function formatWithSuffix(
  value: number | null | undefined,
  suffix?: string,
  options?: Intl.NumberFormatOptions,
): string {
  const formatted = formatNumber(value, options);
  return suffix && formatted !== "—" ? `${formatted}${suffix}` : formatted;
}

function formatRangeFromRange(
  range: AbilityValueRange | undefined,
  options?: Intl.NumberFormatOptions,
  suffix?: string,
): string {
  if (!range) {
    return "—";
  }
  return formatRange(range.base ?? null, range.max ?? null, options, suffix);
}

function getRangeValue(range: AbilityValueRange | undefined, level: "base" | "max"): number | null {
  if (!range) {
    return null;
  }
  return level === "base" ? range.base ?? null : range.max ?? null;
}

function formatModifier(effect: AbilityModifierEffect | undefined, level: "base" | "max"): string {
  if (!effect) {
    return "—";
  }
  return formatWithSuffix(getRangeValue(effect.value, level), effect.unit);
}

function formatModifierRange(effect: AbilityModifierEffect | undefined): string | null {
  if (!effect) {
    return null;
  }
  const formatted = formatRangeFromRange(effect.value, undefined, effect.unit);
  if (formatted === "—") {
    return null;
  }
  return `${formatted} ${effect.label}`;
}

type DamageBand = "lv0" | "max";

function computeDamageValueFromTotals(totals: AbilityDamageTotals, spirit: number, band: DamageBand): number {
  const intercept = band === "lv0" ? totals.interceptBase : totals.interceptMax;
  const scaling = band === "lv0" ? totals.scalingBase : totals.scalingMax;
  return intercept + scaling * spirit;
}

function formatDamageRangeForBand(ability: HeroAbilityRow, summary: AbilityDamageSummary, band: DamageBand): string {
  if (!summary.components.length) {
    return "—";
  }
  const spirit = band === "lv0" ? ability.baseSpiritPower : ability.maxSpiritPower;
  const minValue = computeDamageValueFromTotals(summary.totals.min, spirit, band);
  const maxValue = computeDamageValueFromTotals(summary.totals.max, spirit, band);
  return formatRange(minValue, maxValue);
  }

function formatBurstDpmRangeForBand(ability: HeroAbilityRow, band: DamageBand): string {
  const summary = ability.metrics.damage.burst;
  if (!summary.components.length) {
    return "—";
  }
  const spirit = band === "lv0" ? ability.baseSpiritPower : ability.maxSpiritPower;
  const minDamage = computeDamageValueFromTotals(summary.totals.min, spirit, band);
  const maxDamage = computeDamageValueFromTotals(summary.totals.max, spirit, band);
  const cadenceBand = band === "lv0" ? "base" : "max";
  const charges = getRangeValue(ability.metrics.cadence.charges, cadenceBand) ?? 1;
  const cooldown = getRangeValue(ability.metrics.cadence.cooldown, cadenceBand);
  if (!cooldown || cooldown <= 0) {
    return "—";
  }
  const multiplier = (Math.max(charges, 1) * 60) / cooldown;
  return formatRange(minDamage * multiplier, maxDamage * multiplier);
}

const TAG_LABELS: Record<AbilityTag, string> = {
  burst: "Burst",
  sustained: "DPS",
  "crowd-control": "CC",
  buff: "Buff",
  debuff: "Debuff",
};

type AbilityDescriptionDialogProps = {
  abilityName: string;
  description: string;
};

function AbilityDescriptionDialog({ abilityName, description }: AbilityDescriptionDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<number | null>(null);
  const dialogId = React.useId();

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const open = React.useCallback(() => {
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const close = React.useCallback(
    (delay = 0) => {
      clearCloseTimeout();
      if (delay > 0) {
        closeTimeoutRef.current = window.setTimeout(() => {
          closeTimeoutRef.current = null;
          setIsOpen(false);
        }, delay);
      } else {
        setIsOpen(false);
      }
    },
    [clearCloseTimeout],
  );

  React.useEffect(
    () => () => {
      clearCloseTimeout();
    },
    [clearCloseTimeout],
  );

  return (
    <div
      className="relative mt-1 inline-flex"
      onMouseEnter={() => open()}
      onMouseLeave={() => close(80)}
      onFocus={() => open()}
      onBlur={() => close(0)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100 dark:focus:ring-blue-300"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close(0);
          }
        }}
      >
        <span className="text-[10px] uppercase tracking-wide">Description</span>
      </button>
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          id={dialogId}
          aria-label={`${abilityName} description`}
          className="absolute left-0 top-full z-50 mt-2 max-w-sm rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xl ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10"
        >
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</p>
        </div>
      ) : null}
    </div>
  );
}

export function HeroAbilityTable({ data }: HeroAbilityTableProps) {
  const [showDisabled, setShowDisabled] = React.useState(false);

  const filteredData = React.useMemo(
    () => (showDisabled ? data : data.filter((row) => !row.isDisabled)),
    [data, showDisabled],
  );

  const totalCount = data.length;
  const visibleCount = filteredData.length;

  const columns = React.useMemo<ColumnDef<HeroAbilityRow>[]>(() => {
    const heroColumn: ColumnDef<HeroAbilityRow> = {
      id: "hero",
      accessorFn: (row) => row.heroName,
    header: "Hero",
    cell: ({ row }) => {
      const hero = row.original;
      return (
        <div className="flex items-center gap-3">
          {hero.heroImage ? (
            <img
              src={hero.heroImage}
              alt={hero.heroName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {hero.heroName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{hero.heroName}</span>
              <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {hero.abilitySlot}
              </span>
            </div>
        </div>
      );
    },
    };

    const abilityColumn: ColumnDef<HeroAbilityRow> = {
      id: "ability",
      accessorFn: (row) =>
        [
          row.abilityName,
          row.abilityType ?? "",
          row.abilityDescription ?? "",
          row.heroName,
          row.assumptionNotes.join(" "),
          row.tags.join(" "),
        ]
          .join(" ")
          .trim(),
    header: "Ability",
    cell: ({ row }) => {
      const ability = row.original;
        const { metrics } = ability;
        const weaponDamageEffect = metrics.modifiers.summary.weaponDamage;
        const spiritPowerEffect = metrics.modifiers.summary.spiritPower;
        const bulletResistEffect = metrics.modifiers.summary.bulletResist;
        const spiritResistEffect = metrics.modifiers.summary.spiritResist;

        const damageAmpGunEffect = metrics.modifiers.summary.damageAmpGun;
        const damageAmpAllEffect = metrics.modifiers.summary.damageAmpAll;
        const damageAmpSpiritEffect = metrics.modifiers.summary.damageAmpSpirit;
        const gunShredEffect = metrics.modifiers.summary.gunShred;
        const spiritShredEffect = metrics.modifiers.summary.spiritShred;

        const buffParts = [
          formatModifierRange(weaponDamageEffect),
          formatModifierRange(spiritPowerEffect),
          formatModifierRange(bulletResistEffect),
          formatModifierRange(spiritResistEffect),
          formatModifierRange(damageAmpGunEffect),
        ].filter((part): part is string => Boolean(part));

        const debuffParts = [
          formatModifierRange(damageAmpAllEffect),
          formatModifierRange(damageAmpSpiritEffect),
          formatModifierRange(gunShredEffect),
          formatModifierRange(spiritShredEffect),
        ].filter((part): part is string => Boolean(part));

        const ccParts: string[] = [];
        if (metrics.control.summary.stun) {
          ccParts.push(`Stun ${formatRangeFromRange(metrics.control.summary.stun, undefined, "s")}`);
        }
        if (metrics.control.summary.silence) {
          ccParts.push(`Silence ${formatRangeFromRange(metrics.control.summary.silence, undefined, "s")}`);
        }
        if (metrics.control.summary.immobilize) {
          ccParts.push(
            `Immobilize ${formatRangeFromRange(metrics.control.summary.immobilize, undefined, "s")}`,
          );
        }
        if (metrics.control.summary.displacement) {
          ccParts.push(
            `Displace ${formatRangeFromRange(metrics.control.summary.displacement, undefined, "s")}`,
          );
        }
        if (metrics.control.summary.slow?.magnitude) {
          const magnitude = formatRangeFromRange(metrics.control.summary.slow.magnitude, undefined, "%");
          const duration = metrics.control.summary.slow.duration
            ? formatRangeFromRange(metrics.control.summary.slow.duration, undefined, "s")
            : null;
          ccParts.push(
            `Slow ${magnitude}${duration && duration !== "—" ? ` · ${duration}` : ""}`,
          );
        }

      return (
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{ability.abilityName}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{ability.abilityType ?? "—"}</span>
            {ability.abilityDescription ? (
              <AbilityDescriptionDialog
                abilityName={ability.abilityName}
                description={ability.abilityDescription}
              />
            ) : null}
            {ability.tags.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {ability.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            ) : null}
            {buffParts.length ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Buffs: {buffParts.join(" · ")}
              </span>
            ) : null}
            {debuffParts.length ? (
              <span className="text-[11px] text-rose-600 dark:text-rose-400">
                Debuffs: {debuffParts.join(" · ")}
          </span>
            ) : null}
            {ccParts.length ? (
              <span className="text-[11px] text-sky-600 dark:text-sky-400">CC: {ccParts.join(" · ")}</span>
            ) : null}
          {ability.assumptionNotes.length ? (
            <ul className="mt-1 space-y-1 text-[11px] text-sky-600 dark:text-sky-400">
              {ability.assumptionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    },
    };

    const cadenceColumns: ColumnDef<HeroAbilityRow>[] = [
  {
        id: "cooldown",
    header: "Cooldown (L0 → Max)",
    enableSorting: false,
        cell: ({ row }) => formatRangeFromRange(row.original.metrics.cadence.cooldown, undefined, "s"),
  },
  {
        id: "duration",
    header: "Duration (L0 → Max)",
    enableSorting: false,
        cell: ({ row }) => formatRangeFromRange(row.original.metrics.cadence.duration, undefined, "s"),
  },
  {
        id: "charges",
    header: "Charges (L0 → Max)",
    enableSorting: false,
        cell: ({ row }) =>
          formatRangeFromRange(row.original.metrics.cadence.charges, { maximumFractionDigits: 0 }),
  },
    ];

    const damageColumns: ColumnDef<HeroAbilityRow>[] = [
  {
        id: "burst-damage-base",
    header: "Burst Damage L0",
        accessorFn: (row) => row.burstDamageBase,
        cell: ({ row }) =>
          formatDamageRangeForBand(row.original, row.original.metrics.damage.burst, "lv0"),
  },
  {
        id: "burst-damage-max",
    header: "Burst Damage Max",
        accessorFn: (row) => row.burstDamageMax,
        cell: ({ row }) =>
          formatDamageRangeForBand(row.original, row.original.metrics.damage.burst, "max"),
  },
  {
        id: "burst-dpm-base",
    header: "Burst DPM L0",
        accessorFn: (row) => row.burstDpmBase,
        cell: ({ row }) => formatBurstDpmRangeForBand(row.original, "lv0"),
  },
  {
        id: "burst-dpm-max",
    header: "Burst DPM Max",
        accessorFn: (row) => row.burstDpmMax,
        cell: ({ row }) => formatBurstDpmRangeForBand(row.original, "max"),
      },
      {
        id: "burst-scaling-base",
        header: "Burst Scaling / Spirit L0",
        accessorFn: (row) => row.burstScalingBase,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
      {
        id: "burst-scaling-max",
        header: "Burst Scaling / Spirit Max",
        accessorFn: (row) => row.burstScalingMax,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
      {
        id: "sustained-dps-base",
        header: "Sustained DPS L0",
        accessorFn: (row) => row.sustainedDpsBase,
        cell: ({ row }) =>
          formatDamageRangeForBand(row.original, row.original.metrics.damage.sustained, "lv0"),
      },
      {
        id: "sustained-dps-max",
        header: "Sustained DPS Max",
        accessorFn: (row) => row.sustainedDpsMax,
        cell: ({ row }) =>
          formatDamageRangeForBand(row.original, row.original.metrics.damage.sustained, "max"),
      },
      {
        id: "sustained-scaling-base",
        header: "Sustained Scaling / Spirit L0",
        accessorFn: (row) => row.sustainedScalingBase,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
      {
        id: "sustained-scaling-max",
        header: "Sustained Scaling / Spirit Max",
        accessorFn: (row) => row.sustainedScalingMax,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
      {
        id: "total-scaling-base",
        header: "Total Spirit Scaling L0",
        accessorFn: (row) => row.spiritScalingBase,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
      {
        id: "total-scaling-max",
        header: "Total Spirit Scaling Max",
        accessorFn: (row) => row.spiritScalingMax,
        cell: ({ getValue }) => formatWithSuffix(getValue<number | null>(), " / Spirit"),
      },
    ];

    const controlColumns: ColumnDef<HeroAbilityRow>[] = [
      {
        id: "stun-duration-base",
        header: "Stun Duration L0",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.stun, "base"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.stun, "base"), "s"),
      },
      {
        id: "stun-duration-max",
        header: "Stun Duration Max",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.stun, "max"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.stun, "max"), "s"),
      },
      {
        id: "silence-duration-base",
        header: "Silence Duration L0",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.silence, "base"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.silence, "base"), "s"),
      },
      {
        id: "silence-duration-max",
        header: "Silence Duration Max",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.silence, "max"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.silence, "max"), "s"),
      },
      {
        id: "slow-magnitude-base",
        header: "Slow % L0",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.slow?.magnitude, "base"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.slow?.magnitude, "base"), "%"),
      },
      {
        id: "slow-magnitude-max",
        header: "Slow % Max",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.slow?.magnitude, "max"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.slow?.magnitude, "max"), "%"),
      },
      {
        id: "slow-duration-base",
        header: "Slow Duration L0",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.slow?.duration, "base"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.slow?.duration, "base"), "s"),
      },
      {
        id: "slow-duration-max",
        header: "Slow Duration Max",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.slow?.duration, "max"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.slow?.duration, "max"), "s"),
      },
      {
        id: "displacement-duration-base",
        header: "Displace Duration L0",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.displacement, "base"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.displacement, "base"), "s"),
      },
      {
        id: "displacement-duration-max",
        header: "Displace Duration Max",
        accessorFn: (row) => getRangeValue(row.metrics.control.summary.displacement, "max"),
        cell: ({ row }) =>
          formatWithSuffix(getRangeValue(row.original.metrics.control.summary.displacement, "max"), "s"),
      },
    ];

    const modifierColumns: ColumnDef<HeroAbilityRow>[] = [
      {
        id: "weapon-damage-buff-base",
        header: "Weapon Damage Buff L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.weaponDamage?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.weaponDamage, "base"),
      },
      {
        id: "weapon-damage-buff-max",
        header: "Weapon Damage Buff Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.weaponDamage?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.weaponDamage, "max"),
      },
      {
        id: "spirit-power-buff-base",
        header: "Spirit Power Buff L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.spiritPower?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.spiritPower, "base"),
      },
      {
        id: "spirit-power-buff-max",
        header: "Spirit Power Buff Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.spiritPower?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.spiritPower, "max"),
      },
      {
        id: "damage-amp-all-base",
        header: "Damage Amp (All) L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpAll?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpAll, "base"),
      },
      {
        id: "damage-amp-all-max",
        header: "Damage Amp (All) Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpAll?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpAll, "max"),
      },
      {
        id: "damage-amp-gun-base",
        header: "Damage Amp (Gun) L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpGun?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpGun, "base"),
      },
      {
        id: "damage-amp-gun-max",
        header: "Damage Amp (Gun) Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpGun?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpGun, "max"),
      },
      {
        id: "damage-amp-spirit-base",
        header: "Damage Amp (Spirit) L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpSpirit?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpSpirit, "base"),
      },
      {
        id: "damage-amp-spirit-max",
        header: "Damage Amp (Spirit) Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.damageAmpSpirit?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.damageAmpSpirit, "max"),
      },
      {
        id: "gun-shred-base",
        header: "Gun Shred L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.gunShred?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.gunShred, "base"),
      },
      {
        id: "gun-shred-max",
        header: "Gun Shred Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.gunShred?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.gunShred, "max"),
      },
      {
        id: "spirit-shred-base",
        header: "Spirit Shred L0",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.spiritShred?.value, "base"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.spiritShred, "base"),
      },
      {
        id: "spirit-shred-max",
        header: "Spirit Shred Max",
        accessorFn: (row) => getRangeValue(row.metrics.modifiers.summary.spiritShred?.value, "max"),
        cell: ({ row }) => formatModifier(row.original.metrics.modifiers.summary.spiritShred, "max"),
      },
    ];

    return [
      heroColumn,
      abilityColumn,
      ...cadenceColumns,
      ...damageColumns,
      ...controlColumns,
      ...modifierColumns,
    ];
  }, []);

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      initialPageSize={50}
      storageKey="hero-abilities-table"
      toolbar={(context) => {
        const handleSearchChange = (() => {
          let timeoutId: number | undefined;
          return (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            if (timeoutId !== undefined) {
              window.clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(() => {
              if (value.endsWith(",")) {
                context.setGlobalFilter("");
              } else {
                context.setGlobalFilter(value);
              }
            }, 200);
          };
        })();

        return (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                value={context.globalFilter}
                onChange={handleSearchChange}
                placeholder="Search abilities..."
                className="w-full sm:w-60 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => context.exportToCsv({ filename: "hero-abilities.csv" })}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={context.openColumnManager}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Manage columns
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:gap-3">
              <span>
                {visibleCount} / {totalCount} abilities
              </span>
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => setShowDisabled((prev) => !prev)}
              >
                {showDisabled ? "Hide disabled heroes" : "Show disabled heroes"}
              </button>
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => {
                  context.setGlobalFilter("");
                  context.table.resetSorting();
                  context.table.resetColumnFilters();
                  setShowDisabled(false);
                }}
              >
                Reset view
              </button>
            </div>
          </div>
        );
      }}
      footer={(context) => {
        const pagination = context.table.getState().pagination;
        const totalRows = context.table.getPrePaginationRowModel().rows.length;
        const currentRows = context.table.getRowModel().rows.length;
        const pageIndex = pagination.pageIndex;
        const pageSize = pagination.pageSize;
        const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
        const end = totalRows === 0 ? 0 : pageIndex * pageSize + currentRows;
        const pageCount = context.table.getPageCount();

        return (
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row">
            <span>
              Showing {start}–{end} of {totalRows} abilities · Page {pageIndex + 1}
              {pageCount ? ` / ${pageCount}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) => context.table.setPageSize(Number(event.target.value))}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-zinc-600"
                >
                  {context.pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === totalRows ? `${option} (All)` : option}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => context.table.previousPage()}
                disabled={!context.table.getCanPreviousPage()}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => context.table.nextPage()}
                disabled={!context.table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        );
      }}
    />
  );
}


