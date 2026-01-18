import { NextResponse } from "next/server";

const ALLOWED_EMAILS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs97lkXWXvI68aD_cW1dTGOkiV1z2IBZweYe1B5g6vOxP1bpKK7v8qIkR1yj411BUOHVwZn8iklU1a/pub?gid=0&single=true&output=csv";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

let cachedEmails: string[] | null = null;
let cacheTimestamp: number = 0;

async function fetchAllowedEmails(): Promise<string[]> {
  const now = Date.now();

  if (cachedEmails && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedEmails;
  }

  try {
    const response = await fetch(ALLOWED_EMAILS_CSV_URL, {
      next: { revalidate: 1800 }, // 30 minutes
    });

    if (!response.ok) {
      throw new Error("Failed to fetch allowed emails");
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");

    // Skip header row and extract emails (assuming email is in second column)
    const emails = lines
      .slice(1)
      .map((line) => {
        const columns = line.split(",");
        return columns[1]?.trim().toLowerCase();
      })
      .filter((email): email is string => !!email && email.includes("@"));

    cachedEmails = emails;
    cacheTimestamp = now;

    return emails;
  } catch (error) {
    console.error("Error fetching allowed emails:", error);
    // Return cached emails if available, even if expired
    if (cachedEmails) {
      return cachedEmails;
    }
    throw error;
  }
}

export async function GET() {
  try {
    const emails = await fetchAllowedEmails();
    return NextResponse.json({ emails });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch allowed emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ allowed: false }, { status: 400 });
    }

    const allowedEmails = await fetchAllowedEmails();
    const isAllowed = allowedEmails.includes(email.toLowerCase());

    return NextResponse.json({ allowed: isAllowed });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify email", allowed: false },
      { status: 500 }
    );
  }
}
