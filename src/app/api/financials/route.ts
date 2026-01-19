import { NextResponse } from "next/server";

const STEAM_API_BASE = "https://partner.steam-api.com/IPartnerFinancialsService";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) return null;

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const toBase64 = (obj: object) =>
    btoa(String.fromCharCode(...encoder.encode(JSON.stringify(obj))))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsignedToken = `${toBase64(header)}.${toBase64(claim)}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getSheetData(sheetId: string, range: string, token: string) {
  const res = await fetch(
    `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.values || [];
}

async function clearSheet(sheetId: string, range: string, token: string) {
  await fetch(
    `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );
}

async function appendToSheet(sheetId: string, range: string, values: any[][], token: string) {
  await fetch(
    `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
}

async function fetchSteamSales(apiKey: string, date: string) {
  const url = `${STEAM_API_BASE}/GetDetailedSales/v001/?key=${apiKey}&date=${date}&highwatermark_id=0`;
  const res = await fetch(url);
  if (res.status === 403) throw new Error("Invalid Financial API key");
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  return res.json();
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "/");
}

function dateNeedsFetch(dataDate: string, lastFetched: string): boolean {
  // If last_fetched is after the data date, data is finalized
  const dataD = new Date(dataDate.replace(/\//g, "-"));
  const fetchD = new Date(lastFetched.replace(/\//g, "-"));
  return fetchD <= dataD; // Need to fetch if fetched on same day or before
}

export async function GET(request: Request) {
  const apiKey = process.env.STEAM_FINANCIAL_API_KEY;
  const sheetId = process.env.FINANCIAL_CACHE_SHEET_ID;

  if (!apiKey) {
    return NextResponse.json({ error: "STEAM_FINANCIAL_API_KEY not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "dates";
  const refresh = searchParams.get("refresh") === "true";

  try {
    // Get available dates
    if (action === "dates") {
      const res = await fetch(
        `${STEAM_API_BASE}/GetChangedDatesForPartner/v001/?key=${apiKey}&highwatermark=0`
      );
      if (res.status === 403) {
        return NextResponse.json({ error: "Invalid Financial API key" }, { status: 403 });
      }
      const data = await res.json();
      return NextResponse.json(data.response || {});
    }

    // Get sales for date range
    if (action === "range") {
      const datesParam = searchParams.get("dates");
      if (!datesParam) {
        return NextResponse.json({ error: "dates parameter required" }, { status: 400 });
      }

      const dates = datesParam.split(",");
      const token = await getAccessToken();
      const useCache = token && sheetId;
      const today = getTodayDate();

      let cachedData = new Map<string, { rows: any[]; lastFetched: string }>();

      // Hard refresh - clear the sheet first
      if (refresh && useCache) {
        try {
          await clearSheet(sheetId, "financials!A:I", token);
          console.log("Cleared sheet for hard refresh");
        } catch (e) {
          console.error("Failed to clear sheet:", e);
        }
      }

      // Check cache (skip if hard refresh)
      if (useCache && !refresh) {
        try {
          const sheetData = await getSheetData(sheetId, "financials!A:I", token);
          if (sheetData && sheetData.length > 1) {
            const headers = sheetData[0];
            for (let i = 1; i < sheetData.length; i++) {
              const row: any = {};
              headers.forEach((h: string, idx: number) => {
                row[h] = sheetData[i][idx] || "";
              });
              const date = row.date;
              const lastFetched = row.last_fetched || today;

              if (!cachedData.has(date)) {
                cachedData.set(date, { rows: [], lastFetched });
              }
              cachedData.get(date)!.rows.push(row);
            }
          }
        } catch (e) {
          console.error("Failed to read cache:", e);
        }
      }

      // Determine which dates need fetching
      const datesToFetch = dates.filter((date) => {
        const cached = cachedData.get(date);
        if (!cached) return true; // Not in cache
        return dateNeedsFetch(date, cached.lastFetched); // Check if data is finalized
      });

      console.log(`Dates to fetch: ${datesToFetch.length}/${dates.length}`);

      const newRows: any[] = [];
      const countryInfo: any[] = [];

      // Fetch missing/stale dates from Steam (in parallel, max 5 at a time)
      for (let i = 0; i < datesToFetch.length; i += 5) {
        const batch = datesToFetch.slice(i, i + 5);
        const results = await Promise.all(
          batch.map((date) => fetchSteamSales(apiKey, date).catch(() => null))
        );

        results.forEach((data, idx) => {
          const date = batch[idx];
          if (data?.response?.results) {
            data.response.results.forEach((r: any) => {
              newRows.push({ ...r, date, last_fetched: today });
            });
          }
          if (data?.response?.country_info) {
            countryInfo.push(...data.response.country_info);
          }
        });
      }

      // Write new data to cache
      if (useCache && newRows.length > 0) {
        try {
          const headers = ["date", "country_code", "gross_sales_usd", "net_sales_usd", "gross_returns_usd", "net_tax_usd", "gross_units_sold", "gross_units_activated", "last_fetched"];

          // Check if sheet has headers
          const existingData = await getSheetData(sheetId, "financials!A1:A1", token);
          if (!existingData || existingData.length === 0) {
            await appendToSheet(sheetId, "financials!A1", [headers], token);
          }

          const rowsToWrite = newRows.map((r) => [
            r.date || "",
            r.country_code || "",
            r.gross_sales_usd || "0",
            r.net_sales_usd || "0",
            r.gross_returns_usd || "0",
            r.net_tax_usd || "0",
            String(r.gross_units_sold || 0),
            String(r.gross_units_activated || 0),
            r.last_fetched || today,
          ]);
          await appendToSheet(sheetId, "financials!A:I", rowsToWrite, token);
        } catch (e) {
          console.error("Failed to write cache:", e);
        }
      }

      // Combine cached + new data for requested dates
      const requestedDatesSet = new Set(dates);
      const allResults: any[] = [];

      // Add cached rows (for dates not re-fetched)
      cachedData.forEach((data, date) => {
        if (requestedDatesSet.has(date) && !datesToFetch.includes(date)) {
          allResults.push(...data.rows);
        }
      });

      // Add newly fetched rows
      allResults.push(...newRows.filter((r) => requestedDatesSet.has(r.date)));

      // Normalize results
      const normalizedResults = allResults.map((r) => ({
        date: r.date,
        country_code: r.country_code,
        gross_sales_usd: r.gross_sales_usd,
        net_sales_usd: r.net_sales_usd,
        gross_returns_usd: r.gross_returns_usd,
        net_tax_usd: r.net_tax_usd,
        gross_units_sold: parseInt(r.gross_units_sold) || 0,
        gross_units_activated: parseInt(r.gross_units_activated) || 0,
      }));

      // Dedupe country info
      const countryMap = new Map();
      countryInfo.forEach((c) => countryMap.set(c.country_code, c));

      // Get date range
      const sortedDates = [...requestedDatesSet].sort();

      return NextResponse.json({
        results: normalizedResults,
        country_info: Array.from(countryMap.values()),
        fetched: datesToFetch.length,
        cached: dates.length - datesToFetch.length,
        dateRange: {
          from: sortedDates[0],
          to: sortedDates[sortedDates.length - 1],
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Financial API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}
