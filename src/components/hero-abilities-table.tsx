"use client";

import * as React from "react";
import Image from "next/image";
import { type CellContext, ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { HeroAbilityRow } from "@/lib/hero-abilities";

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

function formatDamageComponentLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

type DamageComponentField = "damageBase" | "damageMax" | "scalingBase" | "scalingMax";

function getDamageValue(
  row: HeroAbilityRow,
  order: string[],
  index: number,
  field: DamageComponentField,
): number | null {
  const key = order[index];
  if (!key) {
    return null;
  }

  const component = row.damageComponents?.[key];
  if (!component) {
    return null;
  }

  return component[field] ?? null;
}

function renderDamageCell(
  info: CellContext<HeroAbilityRow, unknown>,
  order: string[],
  index: number,
  field: DamageComponentField,
  suffix?: string,
): React.ReactNode {
  const key = order[index];
  if (!key) {
    return "—";
  }

  const component = info.row.original.damageComponents?.[key];
  if (!component) {
    return "—";
  }

  const label = formatDamageComponentLabel(key);
  const formatted = formatNumber(info.getValue() as number | null);

  if (formatted === "—") {
    return (
      <div className="flex flex-col">
        <span>—</span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
    );
  }

  const displayValue = suffix ? `${formatted}${suffix}` : formatted;

  return (
    <div className="flex flex-col">
      <span>{displayValue}</span>
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}

const BASE_COLUMNS: ColumnDef<HeroAbilityRow>[] = [
  {
    accessorKey: "heroName",
    header: "Hero",
    cell: ({ row }) => {
      const hero = row.original;
      return (
        <div className="flex items-center gap-3">
          {hero.heroImage ? (
            <Image
              src={hero.heroImage}
              alt={hero.heroName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {hero.heroName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{hero.heroName}</span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{hero.abilitySlot}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "abilityName",
    header: "Ability",
    cell: ({ row }) => {
      const ability = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{ability.abilityName}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {ability.abilityType ?? "—"}
          </span>
          {ability.abilityDescription && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{ability.abilityDescription}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "cooldownRange",
    header: "Cooldown (L0 → Max)",
    cell: ({ row }) => formatRange(row.original.cooldownBase, row.original.cooldownMax, undefined, "s"),
    enableSorting: false,
  },
  {
    id: "durationRange",
    header: "Duration (L0 → Max)",
    cell: ({ row }) => formatRange(row.original.durationBase, row.original.durationMax, undefined, "s"),
    enableSorting: false,
  },
  {
    id: "chargesRange",
    header: "Charges (L0 → Max)",
    cell: ({ row }) => formatRange(row.original.chargesBase, row.original.chargesMax, { maximumFractionDigits: 0 }),
    enableSorting: false,
  },
  {
    accessorKey: "burstDamageBase",
    header: "Burst Damage L0",
    cell: ({ getValue }) => formatNumber(getValue<number | null>()),
  },
  {
    accessorKey: "burstDamageMax",
    header: "Burst Damage Max",
    cell: ({ getValue }) => formatNumber(getValue<number | null>()),
  },
  {
    accessorKey: "burstDpmBase",
    header: "Burst DPM L0",
    cell: ({ getValue }) => formatNumber(getValue<number | null>()),
  },
  {
    accessorKey: "burstDpmMax",
    header: "Burst DPM Max",
    cell: ({ getValue }) => formatNumber(getValue<number | null>()),
  },
];

const TRAILING_COLUMNS: ColumnDef<HeroAbilityRow>[] = [
  {
    accessorKey: "spiritScalingBase",
    header: "Total Spirit Scaling L0",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted} / Spirit`;
    },
  },
  {
    accessorKey: "spiritScalingMax",
    header: "Total Spirit Scaling Max",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted} / Spirit`;
    },
  },
  {
    accessorKey: "gunShredTotal",
    header: "Gun Shred",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted}%`;
    },
  },
  {
    accessorKey: "spiritShredTotal",
    header: "Spirit Shred",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted}%`;
    },
  },
  {
    accessorKey: "damageAmpAll",
    header: "Damage Amp (All)",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted}%`;
    },
  },
  {
    accessorKey: "damageAmpGun",
    header: "Damage Amp (Gun)",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted}%`;
    },
  },
  {
    accessorKey: "damageAmpSpirit",
    header: "Damage Amp (Spirit)",
    cell: ({ getValue }) => {
      const value = getValue<number | null>();
      const formatted = formatNumber(value);
      return formatted === "—" ? formatted : `${formatted}%`;
    },
  },
];

export function HeroAbilityTable({ data }: HeroAbilityTableProps) {
  const [showDisabled, setShowDisabled] = React.useState(false);

  const filteredData = React.useMemo(
    () => (showDisabled ? data : data.filter((row) => !row.isDisabled)),
    [data, showDisabled],
  );

  const totalCount = data.length;
  const visibleCount = filteredData.length;

  const MAX_DAMAGE_TYPES = 2;

  const burstColumns = React.useMemo<ColumnDef<HeroAbilityRow>[]>(() => {
    const columns: ColumnDef<HeroAbilityRow>[] = [];

    for (let index = 0; index < MAX_DAMAGE_TYPES; index += 1) {
      const label = `Burst Damage ${index + 1}`;
      columns.push({
        id: `burst-damage-${index}-base`,
        header: `${label} L0`,
        accessorFn: (row) => getDamageValue(row, row.burstDamageComponentOrder, index, "damageBase"),
        cell: (info) =>
          renderDamageCell(info, info.row.original.burstDamageComponentOrder, index, "damageBase"),
      });
      columns.push({
        id: `burst-damage-${index}-max`,
        header: `${label} Max`,
        accessorFn: (row) => getDamageValue(row, row.burstDamageComponentOrder, index, "damageMax"),
        cell: (info) => renderDamageCell(info, info.row.original.burstDamageComponentOrder, index, "damageMax"),
      });
      columns.push({
        id: `burst-damage-${index}-scale-base`,
        header: `${label} Scaling L0`,
        accessorFn: (row) => getDamageValue(row, row.burstDamageComponentOrder, index, "scalingBase"),
        cell: (info) =>
          renderDamageCell(info, info.row.original.burstDamageComponentOrder, index, "scalingBase", " / Spirit"),
      });
      columns.push({
        id: `burst-damage-${index}-scale-max`,
        header: `${label} Scaling Max`,
        accessorFn: (row) => getDamageValue(row, row.burstDamageComponentOrder, index, "scalingMax"),
        cell: (info) =>
          renderDamageCell(info, info.row.original.burstDamageComponentOrder, index, "scalingMax", " / Spirit"),
      });
    }

    return columns;
  }, []);

  const dpsColumns = React.useMemo<ColumnDef<HeroAbilityRow>[]>(() => {
    const columns: ColumnDef<HeroAbilityRow>[] = [];

    for (let index = 0; index < MAX_DAMAGE_TYPES; index += 1) {
      const label = `DPS Damage ${index + 1}`;
      columns.push({
        id: `dps-damage-${index}-base`,
        header: `${label} L0`,
        accessorFn: (row) => getDamageValue(row, row.dpsDamageComponentOrder, index, "damageBase"),
        cell: (info) => renderDamageCell(info, info.row.original.dpsDamageComponentOrder, index, "damageBase"),
      });
      columns.push({
        id: `dps-damage-${index}-max`,
        header: `${label} Max`,
        accessorFn: (row) => getDamageValue(row, row.dpsDamageComponentOrder, index, "damageMax"),
        cell: (info) => renderDamageCell(info, info.row.original.dpsDamageComponentOrder, index, "damageMax"),
      });
      columns.push({
        id: `dps-damage-${index}-scale-base`,
        header: `${label} Scaling L0`,
        accessorFn: (row) => getDamageValue(row, row.dpsDamageComponentOrder, index, "scalingBase"),
        cell: (info) =>
          renderDamageCell(info, info.row.original.dpsDamageComponentOrder, index, "scalingBase", " / Spirit"),
      });
      columns.push({
        id: `dps-damage-${index}-scale-max`,
        header: `${label} Scaling Max`,
        accessorFn: (row) => getDamageValue(row, row.dpsDamageComponentOrder, index, "scalingMax"),
        cell: (info) =>
          renderDamageCell(info, info.row.original.dpsDamageComponentOrder, index, "scalingMax", " / Spirit"),
      });
    }

    return columns;
  }, []);

  const columns = React.useMemo(
    () => [...BASE_COLUMNS, ...burstColumns, ...dpsColumns, ...TRAILING_COLUMNS],
    [burstColumns, dpsColumns],
  );

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      initialPageSize={50}
      toolbar={(context) => (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <input
              value={context.globalFilter}
              onChange={(event) => context.setGlobalFilter(event.target.value)}
              placeholder="Search abilities..."
              className="w-full sm:w-60 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
            />
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
      )}
      footer={(context) => (
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row">
          <span>
            Showing {context.table.getRowModel().rows.length} abilities (page {context.table.getState().pagination.pageIndex + 1})
          </span>
          <div className="flex items-center gap-2">
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
      )}
    />
  );
}


