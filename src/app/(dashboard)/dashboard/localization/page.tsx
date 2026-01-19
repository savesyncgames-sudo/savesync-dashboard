"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocalizationRow {
  source: string;
  key: string;
  [lang: string]: string;
}

interface LocalizationSource {
  name: string;
  editUrl: string;
}

export default function LocalizationPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LocalizationRow[]>([]);
  const [sources, setSources] = useState<LocalizationSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>("all");

  async function fetchData(forceRefresh = false) {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/localization?refresh=true" : "/api/localization";
      const response = await fetch(url);
      const data = await response.json();
      setRows(data.rows || []);
      setSources(data.sources || []);
    } catch (error) {
      console.error("Failed to fetch localization data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = Object.values(row).some((value) =>
        value.toLowerCase().includes(search.toLowerCase())
      );
      const matchesSource = selectedSource === "all" || row.source === selectedSource;
      return matchesSearch && matchesSource;
    });
  }, [rows, search, selectedSource]);

  // Get all unique columns across all rows (excluding source)
  const columns = useMemo(() => {
    const colSet = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== "source") colSet.add(key);
      });
    });
    return Array.from(colSet);
  }, [rows]);

  const getSourceEditUrl = (sourceName: string) => {
    return sources.find((s) => s.name === sourceName)?.editUrl || "#";
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Localization Placeholders</h1>
          <p className="text-sm text-muted-foreground">
            {filteredRows.length} rows with placeholders found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={loading}
          className="gap-2"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative max-w-sm flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedSource === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSource("all")}
          >
            All
          </Button>
          {sources.map((source) => (
            <Button
              key={source.name}
              variant={selectedSource === source.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSource(source.name)}
            >
              {source.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left font-medium px-4 py-3">Source</th>
                {columns.map((col) => (
                  <th key={col} className="text-left font-medium px-4 py-3 min-w-[150px]">
                    {col}
                  </th>
                ))}
                <th className="text-left font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row, idx) => (
                <tr key={`${row.source}-${row.key}-${idx}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      row.source === "Backend"
                        ? "bg-purple-500/20 text-purple-400"
                        : row.source === "Frontend"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      {row.source}
                    </span>
                  </td>
                  {columns.map((col, colIdx) => (
                    <td key={col} className="px-4 py-3">
                      <span className={
                        colIdx !== 0 && row[col]?.toLowerCase().includes("placeholder")
                          ? "bg-yellow-500/20 text-yellow-300 px-1 rounded"
                          : "text-muted-foreground"
                      }>
                        {row[col] || "-"}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <a
                      href={getSourceEditUrl(row.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300 text-xs"
                    >
                      Edit Sheet
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRows.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No placeholders found - all translations complete!" : "No matching rows found."}
        </div>
      )}
    </div>
  );
}
