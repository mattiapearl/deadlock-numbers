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

const deriveColumnId = <TData,>(column: ColumnDef<TData, unknown>, index: number): string => {
  if (typeof column.id === "string" && column.id.length > 0) {
    return column.id;
  }

  if ("accessorKey" in column) {
    const accessorKey = column.accessorKey;
    if (typeof accessorKey === "string" && accessorKey.length > 0) {
      return accessorKey;
    }
  }

  return `column_${index}`;
};

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
  columnOrder: string[];
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>;
  pinColumn: (columnId: string, position: "left" | "right" | "none") => void;
  openColumnManager: () => void;
  exportToCsv: (options?: { filename?: string }) => void;
  pageSizeOptions: number[];
};

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  toolbar?: (context: DataTableContext<TData>) => React.ReactNode;
  footer?: (context: DataTableContext<TData>) => React.ReactNode;
  getRowId?: TableOptions<TData>["getRowId"];
  className?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export function DataTable<TData>({
  data,
  columns,
  toolbar,
  footer,
  getRowId,
  className,
  initialPageSize,
  pageSizeOptions,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({ left: [], right: [] });
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const initialColumnOrder = React.useMemo(
    () => columns.map((column, index) => deriveColumnId(column, index)),
    [columns],
  );
  const [columnOrder, setColumnOrder] = React.useState<string[]>(initialColumnOrder);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = React.useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = React.useState("");
  const [lastPinnedColumnId, setLastPinnedColumnId] = React.useState<string | null>(null);
  const lastPinnedTimeoutRef = React.useRef<number | null>(null);

  const contentRef = React.useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    getRowId,
  });

  React.useEffect(() => {
    const leafIds = table.getAllLeafColumns().map((column) => column.id);
    if (!leafIds.length) {
      return;
    }
    setColumnOrder((prev) => {
      if (prev.length === leafIds.length && prev.every((id, index) => id === leafIds[index])) {
        return prev;
      }
      return leafIds;
    });
  }, [table, columns]);

  React.useEffect(
    () => () => {
      if (lastPinnedTimeoutRef.current !== null) {
        window.clearTimeout(lastPinnedTimeoutRef.current);
      }
    },
    [],
  );

  const openColumnManager = React.useCallback(() => {
    setIsColumnManagerOpen(true);
  }, []);

  const closeColumnManager = React.useCallback(() => {
    setIsColumnManagerOpen(false);
    setColumnSearchTerm("");
  }, []);

  const getColumnDisplayName = React.useCallback((column: Column<TData>) => {
    const header = column.columnDef.header;
    if (typeof header === "string" || typeof header === "number") {
      return String(header);
    }

    const meta = column.columnDef.meta as { label?: string } | undefined;
    if (meta?.label) {
      return meta.label;
    }

    if ("accessorKey" in column.columnDef) {
      const accessorKey = column.columnDef.accessorKey;
      if (typeof accessorKey === "string" && accessorKey.length > 0) {
        return accessorKey;
      }
    }

    return column.id;
  }, []);

  const pinColumn = React.useCallback(
    (columnId: string, position: "left" | "right" | "none") => {
      setColumnPinning((prev) => {
        const prevLeft = Array.isArray(prev.left) ? prev.left : [];
        const prevRight = Array.isArray(prev.right) ? prev.right : [];
        const nextLeft = prevLeft.filter((id) => id !== columnId);
        const nextRight = prevRight.filter((id) => id !== columnId);

        if (position === "left") {
          return {
            left: [...nextLeft, columnId],
            right: nextRight,
          };
        }

        if (position === "right") {
          return {
            left: nextLeft,
            right: [...nextRight, columnId],
          };
        }

        return {
          left: nextLeft,
          right: nextRight,
        };
      });

      if (position === "left") {
        setColumnOrder((prev) => {
          if (!prev.includes(columnId)) {
            return prev;
          }
          const filtered = prev.filter((id) => id !== columnId);
          return [columnId, ...filtered];
        });
      } else if (position === "right") {
        setColumnOrder((prev) => {
          if (!prev.includes(columnId)) {
            return prev;
          }
          const filtered = prev.filter((id) => id !== columnId);
          return [...filtered, columnId];
        });
      }
    },
    [],
  );

  const movePinnedColumn = React.useCallback((columnId: string, direction: number) => {
    if (direction === 0) return;
    setColumnPinning((prev) => {
      const prevLeft = Array.isArray(prev.left) ? prev.left : [];
      const prevRight = Array.isArray(prev.right) ? prev.right : [];

      if (prevLeft.includes(columnId)) {
        const updatedLeft = [...prevLeft];
        const index = updatedLeft.indexOf(columnId);
        const target = index + direction;
        if (target < 0 || target >= updatedLeft.length) {
          return prev;
        }
        [updatedLeft[index], updatedLeft[target]] = [updatedLeft[target], updatedLeft[index]];
        return { ...prev, left: updatedLeft };
      }
      if (prevRight.includes(columnId)) {
        const updatedRight = [...prevRight];
        const index = updatedRight.indexOf(columnId);
        const target = index + direction;
        if (target < 0 || target >= updatedRight.length) {
          return prev;
        }
        [updatedRight[index], updatedRight[target]] = [updatedRight[target], updatedRight[index]];
        return { ...prev, right: updatedRight };
      }
      return prev;
    });
  }, []);

  const moveColumnOrder = React.useCallback((columnId: string, direction: number) => {
    if (direction === 0) return;
    setColumnOrder((prev) => {
      const index = prev.indexOf(columnId);
      if (index === -1) {
        return prev;
      }
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const effectivePageSizeOptions = React.useMemo(() => {
    const defaults = pageSizeOptions && pageSizeOptions.length ? pageSizeOptions : [25, 50, 75, 100];
    const set = new Set<number>(defaults.filter((value) => Number.isFinite(value) && value > 0));
    if (data.length > 0) {
      set.add(data.length);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [data.length, pageSizeOptions]);

  const performColumnSearch = React.useCallback(
    (rawTerm: string) => {
      const normalized = rawTerm.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      const candidates = table.getAllLeafColumns();
      const match = candidates.find((column) => {
        const label = getColumnDisplayName(column).toLowerCase();
        return column.id.toLowerCase().includes(normalized) || label.includes(normalized);
      });

      if (!match) {
        return;
      }

      pinColumn(match.id, "left");
      setColumnOrder((prev) => {
        if (!prev.includes(match.id)) {
          return prev;
        }
        const filtered = prev.filter((id) => id !== match.id);
        return [match.id, ...filtered];
      });

      if (lastPinnedTimeoutRef.current !== null) {
        window.clearTimeout(lastPinnedTimeoutRef.current);
      }
      setLastPinnedColumnId(match.id);
      lastPinnedTimeoutRef.current = window.setTimeout(() => {
        setLastPinnedColumnId(null);
        lastPinnedTimeoutRef.current = null;
      }, 1500);
    },
    [getColumnDisplayName, pinColumn, table],
  );

  const handleColumnSearchInput = React.useCallback(
    (value: string) => {
      if (value.endsWith(",")) {
        performColumnSearch(value.slice(0, -1));
        setColumnSearchTerm("");
      } else {
        setColumnSearchTerm(value);
      }
    },
    [performColumnSearch],
  );

  const handleColumnSearchSubmit = React.useCallback(() => {
    if (!columnSearchTerm.trim()) {
      return;
    }
    performColumnSearch(columnSearchTerm);
    setColumnSearchTerm("");
  }, [columnSearchTerm, performColumnSearch]);

  const filteredColumns = React.useMemo(() => {
    const leafColumns = table.getAllLeafColumns();
    const search = columnSearchTerm.trim().toLowerCase();
    const leftPinned = Array.isArray(columnPinning.left) ? columnPinning.left : [];
    const rightPinned = Array.isArray(columnPinning.right) ? columnPinning.right : [];

    const result = search
      ? leafColumns.filter((column) => {
          const label = getColumnDisplayName(column).toLowerCase();
          const baseMatch = column.id.toLowerCase().includes(search) || label.includes(search);
          if (baseMatch) {
            return true;
          }
          if ("accessorKey" in column.columnDef) {
            const accessorKey = column.columnDef.accessorKey;
            if (typeof accessorKey === "string" && accessorKey.toLowerCase().includes(search)) {
              return true;
            }
          }
          return false;
        })
      : leafColumns;

    return [...result].sort((a, b) => {
      const aPinned = leftPinned.includes(a.id) ? 0 : rightPinned.includes(a.id) ? 1 : 2;
      const bPinned = leftPinned.includes(b.id) ? 0 : rightPinned.includes(b.id) ? 1 : 2;
      if (aPinned !== bPinned) {
        return aPinned - bPinned;
      }
      const orderA = columnOrder.indexOf(a.id);
      const orderB = columnOrder.indexOf(b.id);
      if (orderA !== orderB) {
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id);
    });
  }, [columnOrder, columnPinning.left, columnPinning.right, columnSearchTerm, getColumnDisplayName, table]);

  const resetColumnManager = React.useCallback(() => {
    setColumnPinning({ left: [], right: [] });
    const ids = table.getAllLeafColumns().map((column) => column.id);
    setColumnOrder(ids);
    setLastPinnedColumnId(null);
    setColumnSearchTerm("");
  }, [table]);

  React.useEffect(() => {
    if (!isColumnManagerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeColumnManager();
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleColumnSearchSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeColumnManager, handleColumnSearchSubmit, isColumnManagerOpen]);

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
    table.setPageIndex(0);
  }, [table, globalFilter, columnFilters, data.length]);

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

  const handleScrollByPage = React.useCallback(
    (direction: -1 | 1) => {
      const el = contentRef.current;
      if (!el) return;
      const offset = el.clientWidth * 0.6 * direction;
      el.scrollBy({ left: offset, behavior: "smooth" });
    },
    [],
  );

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
      columnOrder,
      setColumnOrder,
      pinColumn,
      openColumnManager,
      exportToCsv: ({ filename = "table-export.csv" } = {}) => {
        const columnsForExport = table.getVisibleLeafColumns();
        if (!columnsForExport.length) {
          return;
        }

        const escapeValue = (value: unknown): string => {
          if (value === null || value === undefined) {
            return "";
          }
          let text: string;
          if (typeof value === "object") {
            if (value instanceof Date) {
              text = value.toISOString();
            } else {
              try {
                text = JSON.stringify(value);
              } catch {
                text = String(value);
              }
            }
          } else {
            text = String(value);
          }

          if (text.includes("\"")) {
            text = text.replace(/"/g, "\"\"");
          }
          if (/[",\n]/.test(text)) {
            text = `"${text}"`;
          }
          return text;
        };

        const headerRow = columnsForExport
          .map((column) => {
            const header = column.columnDef.header;
            if (typeof header === "string") {
              return escapeValue(header);
            }
            if (typeof header === "number") {
              return escapeValue(String(header));
            }
            if (typeof header === "function") {
              return escapeValue(column.id);
            }
            if (React.isValidElement(header)) {
              return escapeValue(column.id);
            }
            return escapeValue(column.id);
          })
          .join(",");

        const rowLines = table.getRowModel().rows.map((row) => {
          const values = columnsForExport.map((column) => {
            const cellValue = row.getValue(column.id);
            return escapeValue(cellValue);
          });
          return values.join(",");
        });

        const csvContent = [headerRow, ...rowLines].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      pageSizeOptions: effectivePageSizeOptions,
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
      columnOrder,
      pinColumn,
      openColumnManager,
      effectivePageSizeOptions,
    ],
  );

  return (
    <div className={className ?? "space-y-4"}>
      {toolbar ? toolbar(context) : null}

      <div className="relative">
        <div
          ref={contentRef}
          className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-900 dark:divide-zinc-800 dark:text-zinc-100">
            <thead className="sticky top-0 z-20 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
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
                          top: 0,
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
            aria-label="Scroll table left"
            className="pointer-events-auto absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-l-2xl bg-gradient-to-r from-white via-white/95 to-white/0 text-lg font-semibold text-zinc-500 transition hover:via-white dark:from-zinc-900 dark:via-zinc-900/95 dark:text-zinc-200 dark:hover:via-zinc-900"
            onClick={() => handleScrollByPage(-1)}
          >
            <span aria-hidden>◀</span>
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll table right"
            className="pointer-events-auto absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl bg-gradient-to-l from-white via-white/95 to-white/0 text-lg font-semibold text-zinc-500 transition hover:via-white dark:from-zinc-900 dark:via-zinc-900/95 dark:text-zinc-200 dark:hover:via-zinc-900"
            onClick={() => handleScrollByPage(1)}
          >
            <span aria-hidden>▶</span>
          </button>
        )}
      </div>

      {footer ? footer(context) : null}

      {isColumnManagerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeColumnManager();
            }
          }}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">Manage Columns</h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                onClick={closeColumnManager}
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-2 sm:max-w-md">
                  <input
                    value={columnSearchTerm}
                    onChange={(event) => handleColumnSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleColumnSearchSubmit();
                      }
                    }}
                    placeholder="Search columns… (type a term and press comma to pin it)"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-blue-900"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Type part of a column name and press <span className="font-semibold">,</span> to pin the best match to
                    the left. Use the controls below to reorder or unpin columns.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleColumnSearchSubmit}
                    disabled={!columnSearchTerm.trim()}
                    className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                  >
                    Pin current search
                  </button>
                  <button
                    type="button"
                    onClick={resetColumnManager}
                    className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Reset columns
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto pr-1">
                {filteredColumns.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredColumns.map((column) => {
                      const leftPinned = Array.isArray(columnPinning.left) ? columnPinning.left : [];
                      const rightPinned = Array.isArray(columnPinning.right) ? columnPinning.right : [];
                      const isPinnedLeft = leftPinned.includes(column.id);
                      const isPinnedRight = rightPinned.includes(column.id);
                      const pinLabel = isPinnedLeft ? "Pinned Left" : isPinnedRight ? "Pinned Right" : "Not Pinned";
                      const orderIndex = columnOrder.indexOf(column.id);
                      const canMoveEarlier = orderIndex > 0;
                      const canMoveLater = orderIndex !== -1 && orderIndex < columnOrder.length - 1;
                      const leftIndex = leftPinned.indexOf(column.id);
                      const rightIndex = rightPinned.indexOf(column.id);
                      const canMovePinnedUp = isPinnedLeft && leftIndex > 0;
                      const canMovePinnedDown = isPinnedLeft && leftIndex < leftPinned.length - 1;
                      const canMovePinnedRightUp = isPinnedRight && rightIndex > 0;
                      const canMovePinnedRightDown = isPinnedRight && rightIndex < rightPinned.length - 1;

                      return (
                        <div
                          key={column.id}
                          className={`flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 shadow-sm transition dark:border-zinc-700 ${
                            lastPinnedColumnId === column.id
                              ? "ring-2 ring-blue-400 ring-offset-2 dark:ring-blue-600 dark:ring-offset-zinc-900"
                              : ""
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {getColumnDisplayName(column)}
                            </span>
                            <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              {column.id}
                            </span>
                          </div>
                          <span
                            className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              isPinnedLeft
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                : isPinnedRight
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {pinLabel}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {!isPinnedLeft && (
                              <button
                                type="button"
                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                onClick={() => pinColumn(column.id, "left")}
                              >
                                Pin left
                              </button>
                            )}
                            {!isPinnedRight && (
                              <button
                                type="button"
                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                onClick={() => pinColumn(column.id, "right")}
                              >
                                Pin right
                              </button>
                            )}
                            {(isPinnedLeft || isPinnedRight) && (
                              <button
                                type="button"
                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                                onClick={() => pinColumn(column.id, "none")}
                              >
                                Unpin
                              </button>
                            )}
                            {isPinnedLeft && (
                              <>
                                <button
                                  type="button"
                                  disabled={!canMovePinnedUp}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => movePinnedColumn(column.id, -1)}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMovePinnedDown}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => movePinnedColumn(column.id, 1)}
                                >
                                  Move down
                                </button>
                              </>
                            )}
                            {isPinnedRight && (
                              <>
                                <button
                                  type="button"
                                  disabled={!canMovePinnedRightUp}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => movePinnedColumn(column.id, -1)}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMovePinnedRightDown}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => movePinnedColumn(column.id, 1)}
                                >
                                  Move down
                                </button>
                              </>
                            )}
                            {!isPinnedLeft && !isPinnedRight && (
                              <>
                                <button
                                  type="button"
                                  disabled={!canMoveEarlier}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => moveColumnOrder(column.id, -1)}
                                >
                                  Move earlier
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMoveLater}
                                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
                                  onClick={() => moveColumnOrder(column.id, 1)}
                                >
                                  Move later
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No columns match “{columnSearchTerm}”.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  onClick={closeColumnManager}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


