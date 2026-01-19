"use client";

import { Button } from "@/components/ui/button";

interface Spreadsheet {
  name: string;
  description: string;
  editUrl: string;
  category: string;
}

const SPREADSHEETS: Spreadsheet[] = [
  {
    name: "Quick Links",
    description: "Dashboard quick links and resources",
    editUrl: "https://docs.google.com/spreadsheets/d/1CyxLqzN-dsOE7P3jliaT2xSw0-zb9hBImWlve7dUF0U/edit?gid=873922646#gid=873922646",
    category: "Dashboard",
  },
  {
    name: "Admin Users",
    description: "List of admin users and their roles",
    editUrl: "https://docs.google.com/spreadsheets/d/1CyxLqzN-dsOE7P3jliaT2xSw0-zb9hBImWlve7dUF0U/edit?gid=0#gid=0",
    category: "Dashboard",
  },
  {
    name: "Supported Games",
    description: "All games supported by SaveSync",
    editUrl: "https://docs.google.com/spreadsheets/d/1NKitYr1OHQmJQ1XC57HTyd8w2Da9PSkVSYgHWhLTu1Q/edit?gid=335410452#gid=335410452",
    category: "Dashboard",
  },
  {
    name: "Backend Localization",
    description: "Backend translation strings",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=0#gid=0",
    category: "Localization",
  },
  {
    name: "Frontend Localization",
    description: "Frontend UI translation strings",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=1171289766#gid=1171289766",
    category: "Localization",
  },
  {
    name: "Games Localization",
    description: "Game-specific translation strings",
    editUrl: "https://docs.google.com/spreadsheets/d/12pha4I93gcVfSmwhfhOEDsUx3AZ7ZfyIVyWboPoef10/edit?gid=455501543#gid=455501543",
    category: "Localization",
  },
];

export default function SpreadsheetsPage() {
  const categories = [...new Set(SPREADSHEETS.map((s) => s.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spreadsheets</h1>
        <p className="text-sm text-muted-foreground">
          All Google Sheets used in the SaveSync project
        </p>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPREADSHEETS.filter((s) => s.category === category).map((sheet) => (
              <div
                key={sheet.name}
                className="rounded-lg border border-border p-4 space-y-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-500/20 p-2">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                      <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{sheet.name}</h3>
                    <p className="text-xs text-muted-foreground">{sheet.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href={sheet.editUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in Google Sheets
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
