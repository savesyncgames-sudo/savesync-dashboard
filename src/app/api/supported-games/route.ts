import { NextResponse } from "next/server";

const SUPPORTED_GAMES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhYOhQ1fBAYHGdcsX8UgYI69pkmBI6LmzOgoA3EqwpNNkhwFsF0puv5kadYAcR3-b6DTbvZE3AlW1l/pub?gid=335410452&single=true&output=csv";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface SupportedGame {
  name: string;
  headerUrl: string;
  buyLink: string;
  gameId: string;
  guideUrl: string;
  redditPosts: string;
  website: string;
  twitterAccounts: string;
  subreddit: string;
  redditUser: string;
  discord: string;
}

let cachedGames: SupportedGame[] | null = null;
let cacheTimestamp: number = 0;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchSupportedGames(forceRefresh = false): Promise<SupportedGame[]> {
  const now = Date.now();

  if (!forceRefresh && cachedGames && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedGames;
  }

  try {
    const response = await fetch(SUPPORTED_GAMES_CSV_URL, {
      cache: forceRefresh ? "no-store" : "default",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch supported games");
    }

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    // Skip header row and parse CSV
    const games: SupportedGame[] = lines
      .slice(1)
      .map((line) => {
        const columns = parseCSVLine(line);
        if (columns.length < 11) return null;

        return {
          name: columns[0] || "",
          headerUrl: columns[1] || "",
          buyLink: columns[2] || "",
          gameId: columns[3] || "",
          guideUrl: columns[4] || "",
          redditPosts: columns[5] || "",
          website: columns[6] || "",
          twitterAccounts: columns[7] || "",
          subreddit: columns[8] || "",
          redditUser: columns[9] || "",
          discord: columns[10] || "",
        };
      })
      .filter((game): game is SupportedGame => game !== null && game.name !== "");

    cachedGames = games;
    cacheTimestamp = now;

    return games;
  } catch (error) {
    console.error("Error fetching supported games:", error);
    if (cachedGames) {
      return cachedGames;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const games = await fetchSupportedGames(forceRefresh);
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch supported games", games: [] },
      { status: 500 }
    );
  }
}
