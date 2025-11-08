import { NextResponse } from "next/server";

type CounterApiResponse = {
  count?: number;
  value?: number;
};

const COUNTER_API_BASE = "https://api.counterapi.dev/v1";
const COUNTER_NAMESPACE = process.env.COUNTERAPI_NAMESPACE ?? "deadlocknumbers";
const COUNTER_NAME = process.env.COUNTERAPI_COUNTER ?? "home";

export async function GET() {
  try {
    const incrementUrl = `${COUNTER_API_BASE}/${COUNTER_NAMESPACE}/${COUNTER_NAME}/up`;
    const incrementResponse = await fetch(incrementUrl, {
      cache: "no-store",
    });

    if (!incrementResponse.ok) {
      const body = await incrementResponse.text();
      throw new Error(`CounterAPI increment failed (${incrementResponse.status}): ${body || "No body"}`);
    }

    const counterData = (await incrementResponse.json()) as CounterApiResponse;
    const count = typeof counterData.count === "number" ? counterData.count : counterData.value ?? null;

    return NextResponse.json({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to update CounterAPI view count:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

