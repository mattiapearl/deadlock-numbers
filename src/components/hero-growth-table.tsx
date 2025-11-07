"use client";

import * as React from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";

import { HeroGrowthRow } from "@/lib/hero-growth";

type HeroGrowthTableProps = {
  data: HeroGrowthRow[];
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function wrapWithNote(value: React.ReactNode, note: string | null) {
  if (!note) {
    return value;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="cursor-help underline decoration-dotted underline-offset-4"
        title={note}
      >
        {value}
      </span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold text-zinc-500 dark:border-zinc-600 dark:text-zinc-300"
        title={note}
        aria-label={note}
        role="img"
      >
        ?
      </span>
    </span>
  );
}

function renderSpiritPills(details: HeroGrowthRow["spiritDetails"]) {
  if (!details.length) {
    return "—";
  }

  return (
    <div className="flex flex-wrap gap-1">
      {details.map((detail) => (
        <span
          key={detail.statKey}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {detail.displayName}
        </span>
      ))}
    </div>
  );
}

function renderSpiritList(
  details: HeroGrowthRow["spiritDetails"],
  getValue: (detail: HeroGrowthRow["spiritDetails"][number]) => React.ReactNode,
) {
  if (!details.length) {
    return "—";
  }

  return (
    <ul className="space-y-1">
      {details.map((detail) => (
        <li key={detail.statKey} className="flex items-center gap-1">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {detail.displayName}
          </span>
          <span className="text-sm text-zinc-800 dark:text-zinc-100">
            {getValue(detail)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const columns: ColumnDef<HeroGrowthRow>[] = [
  {
    accessorKey: "heroName",
    header: "Hero Name",
    cell: (info) => {
      const row = info.row.original;
      const heroName = info.getValue<string>();

      return (
        <div className="flex items-center gap-3">
          {row.heroImage ? (
            <Image
              src={row.heroImage}
              alt={heroName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {heroName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{heroName}</span>
            {row.isDisabled && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-rose-500 dark:text-rose-300">
                Disabled
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "baseBulletDamage",
    header: "Base Bullet Dmg",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "pellets",
    header: "Pellets",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    id: "altFire",
    header: "Alt Fire Type/Dmg",
    accessorFn: (row) =>
      row.altFireName ? `${row.altFireName} (${numberFormatter.format(row.altFireDamage ?? 0)})` : null,
    cell: (info) => info.getValue<string | null>() ?? "—",
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "altFirePellets",
    header: "Alt Fire Pellets",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseAmmo",
    header: "Base Ammo",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseFireRate",
    header: "Base Fire Rate",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseDps",
    header: "Base DPS",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseSpinDps",
    header: "Base DPS (Max Spin)",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "dpm",
    header: "DPM",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "falloffRangeMin",
    header: "Falloff Range Min",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "falloffRangeMax",
    header: "Falloff Range Max",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseHp",
    header: "Base HP",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseRegen",
    header: "Base Regen",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseMoveSpeed",
    header: "Base Move Speed",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseSprint",
    header: "Base Sprint",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "baseStamina",
    header: "Base Stamina",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "dmgGain",
    header: "Dmg Gain",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "hpGain",
    header: "HP Gain",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "spiritGain",
    header: "Spirit Gain",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxLevelHp",
    header: "Max Level HP",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxGunDamage",
    header: "Max Gun Damage",
    cell: (info) => formatNumber(info.getValue<number | null>()),
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxGunDps",
    header: "Max Gun DPS",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxSpinGunDps",
    header: "Max Gun DPS (Max Spin)",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxSpinGunDpsWithSpirit",
    header: "Max Gun DPS (Spin + Spirit)",
    cell: (info) => {
      const row = info.row.original;
      const formatted = formatNumber(info.getValue<number | null>());
      const spiritParts: string[] = [];

      if (row.spiritBulletDamageBonus && Math.abs(row.spiritBulletDamageBonus) > 1e-6) {
        spiritParts.push(`Bullet Damage +${numberFormatter.format(row.spiritBulletDamageBonus)}`);
      }

      if (row.spiritRoundsPerSecondBonus && Math.abs(row.spiritRoundsPerSecondBonus) > 1e-6) {
        spiritParts.push(`RPS +${numberFormatter.format(row.spiritRoundsPerSecondBonus)}`);
      }

      const tooltip = [
        row.pelletExceptionNote,
        spiritParts.length ? `Spirit Boon Bonuses: ${spiritParts.join(" | ")}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      return wrapWithNote(formatted, tooltip.length ? tooltip : null);
    },
    enableColumnFilter: false,
  },
  {
    accessorKey: "maxDpm",
    header: "Max DPM",
    cell: (info) => wrapWithNote(formatNumber(info.getValue<number | null>()), info.row.original.pelletExceptionNote),
    enableColumnFilter: false,
  },
  {
    accessorKey: "dpsGrowthPercent",
    header: "dps % growth increase",
    cell: (info) => {
      const value = info.getValue<number | null>();
      const formatted = value === null || value === undefined ? "—" : `${numberFormatter.format(value)}%`;
      return wrapWithNote(formatted, info.row.original.pelletExceptionNote);
    },
    enableColumnFilter: false,
  },
  {
    accessorKey: "hpGrowthPercent",
    header: "hp % growth increase",
    cell: (info) => {
      const value = info.getValue<number | null>();
      return value === null || value === undefined ? "—" : `${numberFormatter.format(value)}%`;
    },
    enableColumnFilter: false,
  },
  {
    accessorKey: "spiritDetails",
    header: "Spirit Scaling",
    cell: (info) => renderSpiritPills(info.getValue<HeroGrowthRow["spiritDetails"]>() ?? info.row.original.spiritDetails),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    id: "spiritRatio",
    header: "Spirit Ratio",
    cell: (info) =>
      renderSpiritList(info.row.original.spiritDetails, (detail) => formatNumber(detail.ratioPerSpirit)),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "maxSpiritBonus",
    header: "Max Spirit Infused Bonus",
    cell: (info) =>
      renderSpiritList(info.row.original.spiritDetails, (detail) => formatNumber(detail.maxBonusAtMaxLevel)),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    accessorKey: "spiritScaling2",
    header: "Spirit Scaling 2",
    cell: () => "—",
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    accessorKey: "spiritRatio2",
    header: "Spirit Ratio 2",
    cell: () => "—",
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    accessorKey: "spiritBonus2",
    header: "Spirit Bonus 2",
    cell: () => "—",
    enableColumnFilter: false,
    enableSorting: false,
  },
];

export function HeroGrowthTable({ data }: HeroGrowthTableProps) {
  const [showDisabled, setShowDisabled] = React.useState(false);

  const filteredData = React.useMemo(
    () => (showDisabled ? data : data.filter((row) => !row.isDisabled)),
    [data, showDisabled],
  );

  const totalRowCount = data.length;
  const visibleRowCount = filteredData.length;

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      toolbar={(context) => (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={context.globalFilter}
              onChange={(event) => context.setGlobalFilter(event.target.value)}
              placeholder="Search heroes..."
              className="w-full sm:max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600"
            />
            <button
              type="button"
              onClick={() => context.exportToCsv({ filename: "hero-growth.csv" })}
              className="w-full sm:w-auto rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Export CSV
            </button>

            <button
              type="button"
              className="w-full sm:w-auto rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={() => setShowDisabled((prev) => !prev)}
            >
              {showDisabled ? "Hide disabled heroes" : "Show disabled heroes"}
            </button>
          </div>

          <div className="flex items-center gap-2 self-end text-xs text-zinc-500 dark:text-zinc-400 sm:self-auto">
            <button
              type="button"
              className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              onClick={() => context.table.resetSorting()}
            >
              Reset sorting
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              onClick={() => {
                context.setGlobalFilter("");
                context.table.resetColumnFilters();
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
      footer={(context) => (
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row">
          <span>
            Showing {context.table.getRowModel().rows.length} of {visibleRowCount} visible heroes (total roster: {totalRowCount})
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

