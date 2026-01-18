import { NextResponse } from "next/server";

const QUICK_LINKS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs97lkXWXvI68aD_cW1dTGOkiV1z2IBZweYe1B5g6vOxP1bpKK7v8qIkR1yj411BUOHVwZn8iklU1a/pub?gid=873922646&single=true&output=csv";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface QuickLink {
  name: string;
  url: string;
  tag: string;
}

let cachedLinks: QuickLink[] | null = null;
let cacheTimestamp: number = 0;

async function fetchQuickLinks(): Promise<QuickLink[]> {
  const now = Date.now();

  if (cachedLinks && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedLinks;
  }

  try {
    const response = await fetch(QUICK_LINKS_CSV_URL, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch quick links");
    }

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    // Skip header row and parse CSV
    const links: QuickLink[] = lines
      .slice(1)
      .map((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        // Split by comma, but only first and last comma (name, url, tag)
        const firstComma = trimmedLine.indexOf(",");
        const lastComma = trimmedLine.lastIndexOf(",");

        if (firstComma === -1 || lastComma === -1 || firstComma === lastComma) {
          return null;
        }

        const name = trimmedLine.substring(0, firstComma).trim();
        const url = trimmedLine.substring(firstComma + 1, lastComma).trim();
        const tag = trimmedLine.substring(lastComma + 1).trim();

        return { name, url, tag };
      })
      .filter((link): link is QuickLink =>
        link !== null && link.name !== "" && link.url !== ""
      );

    cachedLinks = links;
    cacheTimestamp = now;

    return links;
  } catch (error) {
    console.error("Error fetching quick links:", error);
    if (cachedLinks) {
      return cachedLinks;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (forceRefresh) {
      // Clear cache to force fresh fetch
      cachedLinks = null;
      cacheTimestamp = 0;
    }

    const links = await fetchQuickLinks();
    return NextResponse.json({ links, cached: !forceRefresh && cachedLinks !== null });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quick links", links: [] },
      { status: 500 }
    );
  }
}
