import { NextResponse } from "next/server";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface LocalizationRow {
  source: string;
  key: string;
  [lang: string]: string;
}

interface LocalizationSource {
  name: string;
  csvUrl: string;
  editUrl: string;
}

const SOURCES: LocalizationSource[] = [
  {
    name: "Backend",
    csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo67XX-JghaiypmOfz0uhz4nC61EuLtSKfC-LaNqhAQFecg2Nv-sYD25K4Zhn8Q5JDUXRraT485y0X/pub?gid=0&single=true&output=csv",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=0#gid=0",
  },
  {
    name: "Frontend",
    csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo67XX-JghaiypmOfz0uhz4nC61EuLtSKfC-LaNqhAQFecg2Nv-sYD25K4Zhn8Q5JDUXRraT485y0X/pub?gid=1171289766&single=true&output=csv",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=1171289766#gid=1171289766",
  },
  {
    name: "Games",
    csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo67XX-JghaiypmOfz0uhz4nC61EuLtSKfC-LaNqhAQFecg2Nv-sYD25K4Zhn8Q5JDUXRraT485y0X/pub?gid=455501543&single=true&output=csv",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=455501543#gid=455501543",
  },
];

let cachedData: { rows: LocalizationRow[]; sources: LocalizationSource[] } | null = null;
let cacheTimestamp: number = 0;

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

async function fetchLocalizationData(forceRefresh = false): Promise<{ rows: LocalizationRow[]; sources: LocalizationSource[] }> {
  const now = Date.now();

  if (!forceRefresh && cachedData && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedData;
  }

  const allRows: LocalizationRow[] = [];

  for (const source of SOURCES) {
    try {
      const response = await fetch(source.csvUrl, {
        cache: forceRefresh ? "no-store" : "default",
      });

      if (!response.ok) continue;

      const csv = await response.text();
      const rows = parseCSV(csv);

      // Filter rows that have "placeholder" (case-insensitive) in at least one cell (excluding key column)
      const placeholderRows = rows.filter((row) => {
        const keys = Object.keys(row);
        const keyColumn = keys[0]; // First column is the key
        return Object.entries(row).some(([col, value]) =>
          col !== keyColumn && value.toLowerCase().includes("placeholder")
        );
      });

      // Add source info and key to each row
      placeholderRows.forEach((row) => {
        const keys = Object.keys(row);
        const keyColumn = keys[0]; // First column is usually the key
        allRows.push({
          source: source.name,
          key: row[keyColumn] || "",
          ...row,
        });
      });
    } catch (error) {
      console.error(`Failed to fetch ${source.name} localization:`, error);
    }
  }

  cachedData = { rows: allRows, sources: SOURCES };
  cacheTimestamp = now;

  return cachedData;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const data = await fetchLocalizationData(forceRefresh);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch localization data", rows: [], sources: [] },
      { status: 500 }
    );
  }
}
