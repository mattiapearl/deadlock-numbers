import { DeadlockItem, Hero } from "@/lib/types";

const DEADLOCK_API_BASE = "https://assets.deadlock-api.com";

async function fetchFromApi<T>(path: string): Promise<T> {
  const response = await fetch(`${DEADLOCK_API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Deadlock API request failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return response.json();
}

export async function getHeroes(): Promise<Hero[]> {
  return fetchFromApi<Hero[]>("/v2/heroes");
}

export async function getItems(): Promise<DeadlockItem[]> {
  return fetchFromApi<DeadlockItem[]>("/v2/items");
}

