import { NextResponse } from "next/server";

const SHEET_ID = "1m_2tJytEOxThocixJnNHMFDaR8Auvz1nPkNSSrzD4JY";
const SHEET_NAME = "UTM"; // Change this if your sheet tab has a different name
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8W72TFl_hpSGgyCF-W1BEndVgg_KEOAC6T-Vlq-tVFwwIPtvUV3L-yX1j7EbUYcqrbUSpUxOh2jQ-/pub?gid=0&single=true&output=csv";
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

  const pemToArrayBuffer = (pem: string): ArrayBuffer => {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  };

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

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export async function GET() {
  try {
    // Fetch from public CSV URL (no auth needed) with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(CSV_URL, {
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${res.status}` }, { status: 500 });
    }

    const csvText = await res.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ headers: [], rows: [], uniqueValues: {} });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).map((row: string[], idx: number) => {
      const obj: Record<string, string> = { _rowIndex: String(idx + 2) }; // +2 for 1-indexed and header
      headers.forEach((h: string, i: number) => {
        obj[h] = row[i] || "";
      });
      return obj;
    });

    // Get unique values for each column (for dropdowns)
    const uniqueValues: Record<string, string[]> = {};
    headers.forEach((h: string, colIdx: number) => {
      const values = new Set<string>();
      rows.slice(1).forEach((row: string[]) => {
        if (row[colIdx]) values.add(row[colIdx]);
      });
      uniqueValues[h] = Array.from(values).sort();
    });

    return NextResponse.json({ headers, rows: dataRows, uniqueValues });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Failed to get access token. Check service account credentials." }, { status: 500 });
    }

    const { action, rowIndex, rowData, headers } = await request.json();

    if (action === "update") {
      // Update existing row
      const values = headers.map((h: string) => rowData[h] || "");
      const res = await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:Z${rowIndex}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [values] }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: `Update failed: ${err.error?.message || res.status}. Make sure the service account has edit access to the sheet.` }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "add") {
      // Add new row
      const values = headers.map((h: string) => rowData[h] || "");
      const res = await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/${SHEET_NAME}!A:Z:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [values] }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: `Add failed: ${err.error?.message || res.status}. Make sure the service account has edit access to the sheet.` }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      // Clear row (can't delete via Sheets API easily, so we clear it)
      const emptyRow = headers.map(() => "");
      const res = await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:Z${rowIndex}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [emptyRow] }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: `Delete failed: ${err.error?.message || res.status}. Make sure the service account has edit access to the sheet.` }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
