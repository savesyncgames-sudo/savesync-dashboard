"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SalesResult {
  date: string;
  country_code: string;
  gross_units_sold?: number;
  gross_sales_usd?: string;
  net_sales_usd?: string;
  gross_returns_usd?: string;
  net_tax_usd?: string;
  gross_units_activated?: number;
}

interface FinancialData {
  results: SalesResult[];
  country_info: { country_code: string; country_name: string; region: string }[];
  dateRange?: { from: string; to: string };
}

type TimePeriod = "latest" | "week" | "2weeks" | "month" | "all";

export default function FinancialsPage() {
  const [allDates, setAllDates] = useState<string[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("month");
  const [data, setData] = useState<FinancialData>({ results: [], country_info: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ cached: 0, fetched: 0 });
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  const filteredDates = useMemo(() => {
    if (!allDates.length) return [];
    const latestDate = allDates[allDates.length - 1];

    if (period === "latest") {
      return [latestDate];
    }

    if (period === "all") {
      return allDates;
    }

    // Calculate cutoff date string (YYYY/MM/DD format)
    const days = period === "week" ? 7 : period === "2weeks" ? 14 : 31;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0].replace(/-/g, "/");

    // For week/2weeks/month - exclude the latest date (incomplete data)
    return allDates.filter((d) => {
      if (d === latestDate) return false;
      return d >= cutoffStr; // String comparison works for YYYY/MM/DD
    });
  }, [allDates, period]);

  async function fetchDates() {
    try {
      const res = await fetch("/api/financials?action=dates");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAllDates(json.dates || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function fetchSales(refresh = false) {
    if (!filteredDates.length) {
      setData({ results: [], country_info: [] });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `/api/financials?action=range&dates=${filteredDates.join(",")}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData({
        results: json.results || [],
        country_info: json.country_info || [],
        dateRange: json.dateRange,
      });
      setStats({ cached: json.cached || 0, fetched: json.fetched || 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDates();
  }, []);

  useEffect(() => {
    if (allDates.length) fetchSales();
  }, [filteredDates]);

  const getCountryName = (code: string) =>
    data.country_info.find((c) => c.country_code === code)?.country_name || code;

  const summary = useMemo(
    () =>
      data.results.reduce(
        (acc, r) => ({
          grossSales: acc.grossSales + parseFloat(r.gross_sales_usd || "0"),
          netSales: acc.netSales + parseFloat(r.net_sales_usd || "0"),
          returns: acc.returns + parseFloat(r.gross_returns_usd || "0"),
          tax: acc.tax + parseFloat(r.net_tax_usd || "0"),
          unitsSold: acc.unitsSold + (r.gross_units_sold || 0),
          activations: acc.activations + (r.gross_units_activated || 0),
        }),
        { grossSales: 0, netSales: 0, returns: 0, tax: 0, unitsSold: 0, activations: 0 }
      ),
    [data.results]
  );

  const countryBreakdown = useMemo(() => {
    const map = new Map<string, { gross: number; net: number; units: number }>();
    data.results.forEach((r) => {
      const existing = map.get(r.country_code) || { gross: 0, net: 0, units: 0 };
      map.set(r.country_code, {
        gross: existing.gross + parseFloat(r.gross_sales_usd || "0"),
        net: existing.net + parseFloat(r.net_sales_usd || "0"),
        units: existing.units + (r.gross_units_sold || 0) + (r.gross_units_activated || 0),
      });
    });
    return Array.from(map.entries())
      .map(([code, d]) => ({ code, name: getCountryName(code), ...d }))
      .sort((a, b) => b.gross - a.gross);
  }, [data]);

  const periods: { key: TimePeriod; label: string }[] = [
    { key: "latest", label: "Latest" },
    { key: "week", label: "Week" },
    { key: "2weeks", label: "2 Weeks" },
    { key: "month", label: "Month" },
    { key: "all", label: "All Time" },
  ];

  const formatDateRange = () => {
    if (!data.dateRange) return "";
    const { from, to } = data.dateRange;
    if (from === to) return from;
    return `${from} - ${to}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Financials</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateRange()}
            {stats.fetched > 0 && ` • ${stats.fetched} fetched`}
            {stats.cached > 0 && ` • ${stats.cached} cached`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.key)}
              disabled={loading}
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRefreshDialog(true)}
            disabled={loading}
            className="gap-2"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Hard Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gross Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${summary.grossSales.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">${summary.netSales.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-400">${summary.tax.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-400">${Math.abs(summary.returns).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Units</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.unitsSold + summary.activations}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Country</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {countryBreakdown.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
              {countryBreakdown.map((country) => (
                <div key={country.code} className="flex items-center gap-4">
                  <div className="w-32 font-medium truncate">{country.name}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${(country.gross / (countryBreakdown[0]?.gross || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm">${country.gross.toFixed(2)}</div>
                  <div className="w-16 text-right text-sm text-muted-foreground">{country.units} units</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hard Refresh</DialogTitle>
            <DialogDescription>
              This will clear all cached financial data and re-fetch everything from Steam. This may take a while depending on how much data you have.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefreshDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRefreshDialog(false);
                fetchSales(true);
              }}
            >
              Yes, Hard Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
