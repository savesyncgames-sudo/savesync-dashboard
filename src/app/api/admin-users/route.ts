import { NextResponse } from "next/server";

const ADMIN_USERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSs97lkXWXvI68aD_cW1dTGOkiV1z2IBZweYe1B5g6vOxP1bpKK7v8qIkR1yj411BUOHVwZn8iklU1a/pub?gid=0&single=true&output=csv";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface AdminUser {
  name: string;
  email: string;
}

let cachedUsers: AdminUser[] | null = null;
let cacheTimestamp: number = 0;

async function fetchAdminUsers(forceRefresh = false): Promise<AdminUser[]> {
  const now = Date.now();

  if (!forceRefresh && cachedUsers && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedUsers;
  }

  try {
    const response = await fetch(ADMIN_USERS_CSV_URL, {
      cache: forceRefresh ? "no-store" : "default",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch admin users");
    }

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    // Skip header row and parse CSV
    const users: AdminUser[] = lines
      .slice(1)
      .map((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        const commaIndex = trimmedLine.indexOf(",");
        if (commaIndex === -1) return null;

        const name = trimmedLine.substring(0, commaIndex).trim();
        const email = trimmedLine.substring(commaIndex + 1).trim();

        return { name, email };
      })
      .filter((user): user is AdminUser =>
        user !== null && user.name !== "" && user.email !== ""
      );

    cachedUsers = users;
    cacheTimestamp = now;

    return users;
  } catch (error) {
    console.error("Error fetching admin users:", error);
    if (cachedUsers) {
      return cachedUsers;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const users = await fetchAdminUsers(forceRefresh);
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch admin users", users: [] },
      { status: 500 }
    );
  }
}
