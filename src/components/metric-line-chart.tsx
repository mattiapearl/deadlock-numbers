"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { chartColorPalette } from "@/lib/chart-colors";

const ParentSize = dynamic(() => import("@visx/responsive").then((mod) => mod.ParentSize), { ssr: false });
const XYChart = dynamic(() => import("@visx/xychart").then((mod) => mod.XYChart), { ssr: false });
const AnimatedAxis = dynamic(() => import("@visx/xychart").then((mod) => mod.AnimatedAxis), { ssr: false });
const AnimatedGrid = dynamic(() => import("@visx/xychart").then((mod) => mod.AnimatedGrid), { ssr: false });
const AnimatedLineSeries = dynamic(() => import("@visx/xychart").then((mod) => mod.AnimatedLineSeries), {
  ssr: false,
});
const Tooltip = dynamic(() => import("@visx/xychart").then((mod) => mod.Tooltip), { ssr: false });

export type MetricLineChartDatum = {
  x: number;
  y: number;
};

export type MetricLineChartSeries = {
  id: string | number;
  label: string;
  data: MetricLineChartDatum[];
  colorIndex?: number;
  strokeDasharray?: string;
};

export type MetricLineChartProps = {
  series: MetricLineChartSeries[];
  xLabel: string;
  yLabel: string;
  height?: number;
  emptyMessage?: string;
  header?: React.ReactNode;
  valueFormatter?: (value: number) => string;
  xValueFormatter?: (value: number) => string;
  tooltipOptions?: {
    primaryColumnLimit?: number;
    primaryColumnClassName?: string;
    secondaryColumnClassName?: string;
  };
  invertY?: boolean;
};

type TooltipRenderArgs = {
  tooltipData:
    | {
        datumByKey?: Record<string, { datum?: MetricLineChartDatum }>;
        nearestDatum?: { datum?: MetricLineChartDatum };
      }
    | null;
  colorScale?: (key: string) => string;
};

const defaultNumberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function defaultValueFormatter(value: number): string {
  if (Number.isNaN(value)) {
    return "—";
  }
  return defaultNumberFormatter.format(value);
}

export function MetricLineChart({
  series,
  xLabel,
  yLabel,
  height = 360,
  emptyMessage,
  header,
  valueFormatter = defaultValueFormatter,
  xValueFormatter,
  tooltipOptions,
  invertY = false,
}: MetricLineChartProps) {
  const primaryColumnLimit = tooltipOptions?.primaryColumnLimit ?? 10;
  const [legendHeader, setLegendHeader] = React.useState<string | null>(null);
  const [legendEntries, setLegendEntries] = React.useState<
    Array<{ key: string; color: string; value: number }>
  >([]);
  const legendDataRef = React.useRef<{
    header: string | null;
    entries: Array<{ key: string; color: string; value: number }>;
  } | null>(null);
  const rafRef = React.useRef<number | undefined>(undefined);

  const scheduleLegendSync = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (rafRef.current !== undefined) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = undefined;
      const data = legendDataRef.current;
      if (!data) {
        setLegendHeader(null);
        setLegendEntries([]);
        return;
      }

      setLegendHeader(data.header);
      setLegendEntries(data.entries);
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (rafRef.current !== undefined && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const transformedSeries = React.useMemo(() => {
    if (!invertY) {
      return series;
    }
    return series.map((item) => ({
      ...item,
      data: item.data.map((datum) => ({ x: datum.x, y: -datum.y })),
    }));
  }, [invertY, series]);

  const mapValueForDisplay = React.useCallback(
    (value: number) => (invertY ? -value : value),
    [invertY],
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {header ? <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">{header}</div> : null}
      <div className="w-full" style={{ height }}>
        <ParentSize>
          {({ width, height: parentHeight }) => {
            if (!width || !parentHeight) {
              return null;
            }

            return (
              <XYChart height={parentHeight} width={width} xScale={{ type: "linear" }} yScale={{ type: "linear" }}>
                <AnimatedAxis orientation="bottom" label={xLabel} />
                <AnimatedAxis
                  orientation="left"
                  label={yLabel}
                  tickFormat={(value) => valueFormatter(mapValueForDisplay(value as number))}
                />
                <AnimatedGrid columns={false} />

                {transformedSeries.map((item, index) => (
                  <AnimatedLineSeries
                    key={item.id}
                    dataKey={item.label}
                    data={item.data}
                    xAccessor={(datum: MetricLineChartDatum) => datum.x}
                    yAccessor={(datum: MetricLineChartDatum) => datum.y}
                    stroke={chartColorPalette[(item.colorIndex ?? index) % chartColorPalette.length]}
                    strokeDasharray={item.strokeDasharray}
                  />
                ))}

                <Tooltip
                  snapTooltipToDatumX
                  snapTooltipToDatumY
                  renderTooltip={({ tooltipData, colorScale }: TooltipRenderArgs) => {
                    if (!tooltipData || !tooltipData.datumByKey) {
                      legendDataRef.current = null;
                      scheduleLegendSync();
                      return null;
                    }

                    const colorByName = new Map(
                      transformedSeries.map((item, index) => [
                        item.label,
                        chartColorPalette[(item.colorIndex ?? index) % chartColorPalette.length],
                      ]),
                    );

                    const entries = Object.entries(tooltipData.datumByKey)
                      .map(([key, datum]) => ({
                        key,
                        color: colorByName.get(key) ?? colorScale?.(key) ?? "#2563EB",
                        value: mapValueForDisplay(datum?.datum?.y ?? 0),
                      }))
                      .sort((a, b) => (invertY ? a.value - b.value : b.value - a.value));

                    const headerValue = tooltipData.nearestDatum?.datum?.x;
                    const headerLabel =
                      headerValue === undefined || headerValue === null
                        ? xLabel
                        : xValueFormatter
                          ? xValueFormatter(headerValue)
                          : `${xLabel} ${defaultNumberFormatter.format(headerValue)}`;

                    legendDataRef.current = {
                      header: headerLabel,
                      entries,
                    };
                    scheduleLegendSync();

                    return <></>;
                  }}
                />
              </XYChart>
            );
          }}
        </ParentSize>
      </div>

      <div className="mt-4 space-y-2">
        {legendEntries.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{legendHeader}</p>
            <div
              className={`grid gap-x-4 gap-y-1 ${
                tooltipOptions?.primaryColumnClassName ?? "grid-cols-2"
              }`}
            >
              {legendEntries.slice(0, primaryColumnLimit).map(({ key, color, value }) => (
                <div key={key} className="flex items-center gap-2 truncate text-zinc-700 dark:text-zinc-200">
                  <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate">{`${key}: ${valueFormatter(value)}`}</span>
                </div>
              ))}
            </div>
            {legendEntries.length > primaryColumnLimit ? (
              <div
                className={`grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 ${
                  tooltipOptions?.secondaryColumnClassName ?? ""
                }`}
              >
                {legendEntries.slice(primaryColumnLimit).map(({ key, color, value }) => (
                  <div key={key} className="flex items-center gap-2 truncate">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{`${key}: ${valueFormatter(value)}`}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Hover over the chart to inspect series values.</p>
        )}
      </div>

      {!transformedSeries.length && emptyMessage ? (
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
      ) : null}
    </div>
  );
}


