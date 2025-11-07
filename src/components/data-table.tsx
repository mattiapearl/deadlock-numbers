"use client";

import * as React from "react";
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  SortingState,
  Table,
  TableOptions,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

function getPinnedStyles<TData>(column: Column<TData>, type: "header" | "cell"): React.CSSProperties {
  const position = column.getIsPinned();
  if (!position) {
    return {};
  }

  const offset = column.getStart?.(position) ?? 0;
  const style: React.CSSProperties = {
    position: "sticky",
    zIndex: type === "header" ? 5 : 3,
  };

  if (position === "left") {
    style.left = `${offset}px`;
    style.boxShadow = "2px 0 8px rgba(15, 23, 42, 0.08)";
  } else if (position === "right") {
    style.right = `${offset}px`;
    style.boxShadow = "-2px 0 8px rgba(15, 23, 42, 0.08)";
  }

  return style;
}

function getColumnSizeStyle<TData>(column: Column<TData>): React.CSSProperties {
  if (!column.getSize) {
    return {};
  }

  const size = column.getSize();
  if (!size || Number.isNaN(size)) {
    return {};
  }

  const style: React.CSSProperties = {
    width: size,
    minWidth: size,
  };

  if (column.columnDef.maxSize) {
    style.maxWidth = column.columnDef.maxSize;
  }

  return style;
}

export type DataTableContext<TData> = {
  table: Table<TData>;
  data: TData[];
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  globalFilter: string;
  setGlobalFilter: React.Dispatch<React.SetStateAction<string>>;
  columnPinning: ColumnPinningState;
  setColumnPinning: React.Dispatch<React.SetStateAction<ColumnPinningState>>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  toolbar?: (context: DataTableContext<TData>) => React.ReactNode;
  footer?: (context: DataTableContext<TData>) => React.ReactNode;
  getRowId?: TableOptions<TData>["getRowId"];
  className?: string;
  initialPageSize?: number;
};

export function DataTable<TData>({
  data,
  columns,
  toolbar,
  footer,
  getRowId,
  className,
  initialPageSize,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({ left: [], right: [] });
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [hoverScrollDirection, setHoverScrollDirection] = React.useState(0);

  const contentRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    getRowId,
  });

  const updateScrollState = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const defaultSize = initialPageSize ?? Math.max(100, data.length);
    const pageSize = data.length === 0
      ? (initialPageSize ?? 100)
      : initialPageSize
        ? Math.min(initialPageSize, data.length)
        : Math.max(100, data.length);
    table.setPageSize(pageSize === 0 ? defaultSize : pageSize);
  }, [data.length, table, initialPageSize]);

  React.useEffect(() => {
    updateScrollState();
  }, [updateScrollState, data.length]);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateScrollState();
    };

    el.addEventListener("scroll", handleScroll);
    updateScrollState();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [updateScrollState]);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateScrollState();
    });

    observer.observe(el);
    const tableEl = el.firstElementChild as HTMLElement | null;
    if (tableEl) {
      observer.observe(tableEl);
    }

    updateScrollState();

    return () => {
      observer.disconnect();
    };
  }, [updateScrollState, data.length]);

  React.useEffect(() => {
    if (hoverScrollDirection === 0) return;
    let frameId: number;

    const step = () => {
      const el = contentRef.current;
      if (!el) return;
      const scrollAmount = hoverScrollDirection * 16;
      el.scrollLeft += scrollAmount;
      updateScrollState();
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [hoverScrollDirection, updateScrollState]);

  React.useEffect(() => {
    if (hoverScrollDirection < 0 && !canScrollLeft) {
      setHoverScrollDirection(0);
    } else if (hoverScrollDirection > 0 && !canScrollRight) {
      setHoverScrollDirection(0);
    }
  }, [hoverScrollDirection, canScrollLeft, canScrollRight]);

  const context: DataTableContext<TData> = React.useMemo(
    () => ({
      table,
      data,
      sorting,
      setSorting,
      columnFilters,
      setColumnFilters,
      globalFilter,
      setGlobalFilter,
      columnPinning,
      setColumnPinning,
      canScrollLeft,
      canScrollRight,
    }),
    [
      table,
      data,
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
      canScrollLeft,
      canScrollRight,
    ],
  );

  return (
    <div className={className ?? "space-y-4"}>
      {toolbar ? toolbar(context) : null}

      <div
        ref={containerRef}
        className="relative"
        onPointerLeave={() => setHoverScrollDirection(0)}
        onPointerMove={(event) => {
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const edgeThreshold = Math.min(96, rect.width / 4);
          if (x < edgeThreshold && canScrollLeft) {
            setHoverScrollDirection(-1);
          } else if (rect.width - x < edgeThreshold && canScrollRight) {
            setHoverScrollDirection(1);
          } else {
            setHoverScrollDirection(0);
          }
        }}
      >
        <div
          ref={contentRef}
          className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-900 dark:divide-zinc-800 dark:text-zinc-100">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) {
                      return null;
                    }

                    const column = header.column;
                    const isSortable = column.getCanSort();
                    const sortingState = column.getIsSorted();
                    const isPinned = Boolean(column.getIsPinned());

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={`px-4 py-3 align-bottom ${isPinned ? "bg-zinc-50 dark:bg-zinc-800" : ""}`}
                        style={{
                          ...getColumnSizeStyle(column),
                          ...getPinnedStyles(column, "header"),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => column.pin(isPinned ? false : "left")}
                            className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title={isPinned ? "Unlock column" : "Lock column"}
                          >
                            {isPinned ? "Unlock" : "Lock"}
                          </button>
                          <button
                            type="button"
                            className={`flex w-full items-center gap-1 text-left ${
                              isSortable ? "cursor-pointer select-none" : "cursor-default"
                            }`}
                            onClick={isSortable ? column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(column.columnDef.header, header.getContext())}
                            {sortingState ? (
                              <span className="text-[10px] text-zinc-400">{sortingState === "asc" ? "▲" : "▼"}</span>
                            ) : null}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  {row.getVisibleCells().map((cell) => {
                    const column = cell.column;
                    const isPinned = Boolean(column.getIsPinned());
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 align-top text-xs text-zinc-700 dark:text-zinc-200 ${
                          isPinned ? "bg-white dark:bg-zinc-900" : ""
                        }`}
                        style={{
                          ...getColumnSizeStyle(column),
                          ...getPinnedStyles(column, "cell"),
                        }}
                      >
                        {flexRender(column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canScrollLeft && (
          <button
            type="button"
            className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md ring-1 ring-zinc-200 transition hover:bg-white dark:bg-zinc-900/90 dark:ring-zinc-700"
            onClick={() => {
              const el = contentRef.current;
              if (!el) return;
              el.scrollBy({ left: -el.clientWidth * 0.6, behavior: "smooth" });
            }}
          >
            <span className="text-lg font-semibold text-zinc-600 dark:text-zinc-200">◀</span>
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md ring-1 ring-zinc-200 transition hover:bg-white dark:bg-zinc-900/90 dark:ring-zinc-700"
            onClick={() => {
              const el = contentRef.current;
              if (!el) return;
              el.scrollBy({ left: el.clientWidth * 0.6, behavior: "smooth" });
            }}
          >
            <span className="text-lg font-semibold text-zinc-600 dark:text-zinc-200">▶</span>
          </button>
        )}
      </div>

      {footer ? footer(context) : null}
    </div>
  );
}


