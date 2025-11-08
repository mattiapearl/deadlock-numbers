"use client";

import { useEffect, useState } from "react";

type ViewResponse = {
  count?: number;
  value?: number;
};

export function PageViewCounter() {
  const [views, setViews] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function trackView() {
      try {
        const response = await fetch("/api/page-views", {
          cache: "no-store",
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(
            `Failed to fetch view counter: ${response.status} ${response.statusText}${
              bodyText ? ` - ${bodyText}` : ""
            }`,
          );
        }

        const data = (await response.json()) as ViewResponse;
        if (!ignore) {
          const count = typeof data.count === "number" ? data.count : data.value;
          setViews(typeof count === "number" ? count : null);
          setError(false);
          setErrorDetails(null);
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorDetails(message);
          setError(true);
        }
      }
    }

    trackView();

    return () => {
      ignore = true;
    };
  }, []);

  if (error) {
    return (
      <span className="text-sm text-red-600 dark:text-red-400">
        View counter unavailable{errorDetails ? `: ${errorDetails}` : ""}
      </span>
    );
  }

  if (views === null) {
    return <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading views…</span>;
  }

  return <span className="text-sm text-zinc-600 dark:text-zinc-300">{views.toLocaleString()} visits</span>;
}

