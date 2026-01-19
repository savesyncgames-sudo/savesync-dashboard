import { NextResponse } from "next/server";

const SHEET_ID = "1m_2tJytEOxThocixJnNHMFDaR8Auvz1nPkNSSrzD4JY";
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

export async function GET() {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }

    const res = await fetch(
      `${SHEETS_API}/${SHEET_ID}/values/Sheet1!A:Z`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch sheet" }, { status: 500 });
    }

    const data = await res.json();
    const rows = data.values || [];

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
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }

    const { action, rowIndex, rowData, headers } = await request.json();

    if (action === "update") {
      // Update existing row
      const values = headers.map((h: string) => rowData[h] || "");
      await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/Sheet1!A${rowIndex}:Z${rowIndex}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [values] }),
        }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "add") {
      // Add new row
      const values = headers.map((h: string) => rowData[h] || "");
      await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/Sheet1!A:Z:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [values] }),
        }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      // Clear row (can't delete via Sheets API easily, so we clear it)
      const emptyRow = headers.map(() => "");
      await fetch(
        `${SHEETS_API}/${SHEET_ID}/values/Sheet1!A${rowIndex}:Z${rowIndex}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [emptyRow] }),
        }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
