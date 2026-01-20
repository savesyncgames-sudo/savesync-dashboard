"use client";

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
import { useEffect, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

interface SalesResult {
    date: string;
    country_code: string;
    gross_units_sold?: number;
    gross_units_returned?: number;
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

type TimePeriod = "latest" | "yesterday" | "week" | "2weeks" | "month" | "all" | "custom";

export default function FinancialsPage() {
    const [allDates, setAllDates] = useState<string[]>([]);
    const [period, setPeriod] = useState<TimePeriod>("latest");
    const [data, setData] = useState<FinancialData>({ results: [], country_info: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [stats, setStats] = useState({ cached: 0, fetched: 0 });
    const [showRefreshDialog, setShowRefreshDialog] = useState(false);
    const [usdToInr, setUsdToInr] = useState<number | null>(null);
    const [customFrom, setCustomFrom] = useState<string>("");
    const [customTo, setCustomTo] = useState<string>("");

    useEffect(() => {
        fetch("https://api.frankfurter.app/latest?from=USD&to=INR")
            .then((res) => res.json())
            .then((data) => setUsdToInr(data.rates?.INR || null))
            .catch(() => setUsdToInr(null));
    }, []);

    const filteredDates = useMemo(() => {
        if (!allDates.length) return [];
        const latestDate = allDates[allDates.length - 1];
        const yesterdayDate = allDates[allDates.length - 2];

        if (period === "latest") {
            return [latestDate];
        }

        if (period === "yesterday") {
            return yesterdayDate ? [yesterdayDate] : [];
        }

        if (period === "all") {
            return allDates;
        }

        if (period === "custom") {
            if (!customFrom || !customTo) return [];
            const fromStr = customFrom.replace(/-/g, "/");
            const toStr = customTo.replace(/-/g, "/");
            return allDates.filter((d) => d >= fromStr && d <= toStr);
        }

        // For week/2weeks/month - take last N dates excluding the latest (incomplete) date
        const count = period === "week" ? 7 : period === "2weeks" ? 14 : 31;
        const datesWithoutLatest = allDates.slice(0, -1);
        return datesWithoutLatest.slice(-count);
    }, [allDates, period, customFrom, customTo]);

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

    const summary = useMemo(() => {
        const base = data.results.reduce(
            (acc, r) => ({
                grossSales: acc.grossSales + parseFloat(r.gross_sales_usd || "0"),
                netSales: acc.netSales + parseFloat(r.net_sales_usd || "0"),
                returns: acc.returns + parseFloat(r.gross_returns_usd || "0"),
                tax: acc.tax + parseFloat(r.net_tax_usd || "0"),
                unitsSold: acc.unitsSold + (r.gross_units_sold || 0),
                unitsReturned: acc.unitsReturned + (r.gross_units_returned || 0),
                activations: acc.activations + (r.gross_units_activated || 0),
            }),
            { grossSales: 0, netSales: 0, returns: 0, tax: 0, unitsSold: 0, unitsReturned: 0, activations: 0 }
        );

        // Calculate flow (exclude free key activations from count)
        const totalUnits = base.unitsSold;
        const netUnits = totalUnits - Math.abs(base.unitsReturned);

        const afterTax = base.grossSales - base.tax - Math.abs(base.returns);
        const steamCut = afterTax * 0.3;
        const developerCut = afterTax * 0.7;
        const usWithholding = developerCut * 0.15;
        const finalPayout = developerCut - usWithholding;

        const days = filteredDates.length;
        const dailyAverage = days > 0 ? finalPayout / days : 0;

        return {
            ...base,
            totalUnits,
            netUnits,
            afterTax,
            steamCut,
            developerCut,
            usWithholding,
            finalPayout,
            dailyAverage,
        };
    }, [data.results, filteredDates.length]);

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

    // Aggregate data by date for chart
    const chartData = useMemo(() => {
        const dateMap = new Map<string, { gross: number; tax: number; returns: number }>();
        data.results.forEach((r) => {
            const existing = dateMap.get(r.date) || { gross: 0, tax: 0, returns: 0 };
            dateMap.set(r.date, {
                gross: existing.gross + parseFloat(r.gross_sales_usd || "0"),
                tax: existing.tax + parseFloat(r.net_tax_usd || "0"),
                returns: existing.returns + parseFloat(r.gross_returns_usd || "0"),
            });
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const sorted = Array.from(dateMap.entries())
            .map(([date, d]) => {
                const afterTax = d.gross - d.tax - Math.abs(d.returns);
                const developerCut = afterTax * 0.7;
                const finalPayout = developerCut * 0.85; // After 15% US withholding
                const parts = date.split("/");

                let month: number, day: number, year: number;
                // Check if first part is a 4-digit year (YYYY/MM/DD)
                if (parts[0].length === 4) {
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1;
                    day = parseInt(parts[2], 10);
                } else {
                    // Assume MM/DD/YYYY
                    month = parseInt(parts[0], 10) - 1;
                    day = parseInt(parts[1], 10);
                    year = parseInt(parts[2], 10);
                }

                const monthName = months[month] || "???";
                const shortYear = String(year).slice(-2);

                return {
                    fullDate: date,
                    timestamp: new Date(year, month, day).getTime(),
                    payout: parseFloat(finalPayout.toFixed(2)),
                    date: `${monthName} ${day} '${shortYear}`,
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        // Add index for chart positioning
        return sorted.map((item, index) => ({
            ...item,
            index,
        }));
    }, [data.results]);

    const periods: { key: TimePeriod; label: string }[] = [
        { key: "latest", label: "Latest" },
        { key: "yesterday", label: "Yesterday" },
        { key: "week", label: "Week" },
        { key: "2weeks", label: "2 Weeks" },
        { key: "month", label: "Month" },
        { key: "all", label: "All Time" },
        { key: "custom", label: "Custom" },
    ];

    const dayCount = filteredDates.length;

    const formatDateRange = () => {
        if (!data.dateRange) return "";
        const { from, to } = data.dateRange;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Convert date to "Mon DD, YYYY"
        const convertDate = (d: string) => {
            const parts = d.split("/");
            if (parts.length === 3) {
                let month: number, day: number, year: string;
                // Check if first part is a 4-digit year (YYYY/MM/DD)
                if (parts[0].length === 4) {
                    year = parts[0];
                    month = parseInt(parts[1], 10) - 1;
                    day = parseInt(parts[2], 10);
                } else {
                    // Assume MM/DD/YYYY
                    month = parseInt(parts[0], 10) - 1;
                    day = parseInt(parts[1], 10);
                    year = parts[2];
                }
                const monthName = months[month] || "???";
                return `${monthName} ${day}, ${year}`;
            }
            return d;
        };
        const fromFormatted = convertDate(from);
        const toFormatted = convertDate(to);
        if (from === to) return fromFormatted;
        return `${fromFormatted} - ${toFormatted}`;
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Financials</h1>
                        {formatDateRange() && (
                            <p className="text-sm sm:text-base text-muted-foreground">{formatDateRange()}</p>
                        )}
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowRefreshDialog(true)}
                        disabled={loading}
                        className="gap-1 sm:gap-2"
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
                        <span className="hidden sm:inline">Hard</span> Refresh
                    </Button>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                    {dayCount > 0 && `${dayCount} day${dayCount !== 1 ? "s" : ""}`}
                    {stats.fetched > 0 && ` • ${stats.fetched} fetched`}
                    {stats.cached > 0 && ` • ${stats.cached} cached`}
                </p>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
                    {periods.map((p) => (
                        <Button
                            key={p.key}
                            variant={period === p.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPeriod(p.key)}
                            disabled={loading}
                            className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
                {period === "custom" && (
                    <div className="flex gap-2 items-center flex-wrap">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1 min-w-[130px]"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1 min-w-[130px]"
                        />
                    </div>
                )}
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
                    {/* Revenue Flow Infographic */}
                    <Card>
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg">Revenue Flow</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                            <div className="flex flex-col gap-2 sm:gap-3">
                                {/* Step 1: Gross Sales */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground">Customer Pays <span className="text-foreground font-medium">(100.00%)</span></p>
                                                <p className="text-base sm:text-xl font-bold">${summary.grossSales.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground">Units</p>
                                                <p className="text-sm sm:text-lg font-semibold">{summary.totalUnits}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block text-xs text-muted-foreground text-center w-24">
                                        Gross Sales<br />(incl. tax)
                                    </div>
                                </div>

                                {/* Arrow + Deduction: Sales Tax */}
                                <div className="flex items-center gap-2 pl-2 sm:pl-4">
                                    <div className="flex items-center gap-1 sm:gap-2 text-yellow-400">
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <span className="text-xs sm:text-sm font-medium">-${summary.tax.toFixed(2)} <span className="opacity-70">({((summary.tax / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></span>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">Tax → Govt</span>
                                </div>

                                {/* Arrow + Deduction: Returns */}
                                {(summary.returns !== 0 || summary.unitsReturned > 0) && (
                                    <div className="flex items-center gap-2 pl-2 sm:pl-4">
                                        <div className="flex items-center gap-1 sm:gap-2 text-red-400">
                                            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-medium">-${Math.abs(summary.returns).toFixed(2)} <span className="opacity-70">({((Math.abs(summary.returns) / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></span>
                                            <span className="text-[10px] sm:text-xs opacity-70">{summary.unitsReturned}u</span>
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-muted-foreground">Refunds</span>
                                    </div>
                                )}

                                {/* Step 2: After Tax */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">After Tax & Returns <span className="text-foreground font-medium">({((summary.afterTax / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></p>
                                        <p className="text-base sm:text-xl font-bold">${summary.afterTax.toFixed(2)}</p>
                                    </div>
                                    <div className="hidden sm:block text-xs text-muted-foreground text-center w-24">
                                        Base Revenue
                                    </div>
                                </div>

                                {/* Arrow + Deduction: Steam Cut */}
                                <div className="flex items-center gap-2 pl-2 sm:pl-4">
                                    <div className="flex items-center gap-1 sm:gap-2 text-orange-400">
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <span className="text-xs sm:text-sm font-medium">-${summary.steamCut.toFixed(2)} <span className="opacity-70">({((summary.steamCut / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></span>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">Steam 30% → Valve</span>
                                </div>

                                {/* Step 3: Developer Cut */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">Your 70% Cut <span className="text-foreground font-medium">({((summary.developerCut / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></p>
                                        <p className="text-base sm:text-xl font-bold">${summary.developerCut.toFixed(2)}</p>
                                    </div>
                                    <div className="hidden sm:block text-xs text-muted-foreground text-center w-24">
                                        Before<br />Withholding
                                    </div>
                                </div>

                                {/* Arrow + Deduction: US Withholding */}
                                <div className="flex items-center gap-2 pl-2 sm:pl-4">
                                    <div className="flex items-center gap-1 sm:gap-2 text-purple-400">
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                        <span className="text-xs sm:text-sm font-medium">-${summary.usWithholding.toFixed(2)} <span className="opacity-70">({((summary.usWithholding / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></span>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">US 15% → IRS <span className="hidden sm:inline">(foreign tax credit)</span></span>
                                </div>

                                {/* Step 4: Final Payout */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex-1 rounded-lg border-2 border-green-500/50 bg-green-500/10 p-2 sm:p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-green-400">You Receive <span className="font-medium">({((summary.finalPayout / summary.grossSales) * 100 || 0).toFixed(2)}%)</span></p>
                                                <p className="text-lg sm:text-2xl font-bold text-green-400">${summary.finalPayout.toFixed(2)}</p>
                                                {usdToInr && (
                                                    <p className="text-xs sm:text-sm text-green-400/70">
                                                        ₹{(summary.finalPayout * usdToInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] sm:text-xs text-green-400">Net</p>
                                                <p className="text-sm sm:text-lg font-semibold text-green-400">{summary.netUnits}u</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block text-xs text-muted-foreground text-center w-24">
                                        To Your Bank<br />(if &gt;$100)
                                        {usdToInr && <><br /><span className="text-[10px]">@₹{usdToInr.toFixed(2)}</span></>}
                                    </div>
                                </div>

                                {/* Effective Rate */}
                                <div className="mt-2 pt-2 sm:pt-3 border-t border-border">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                                        Take-home: <span className="font-medium text-foreground">{((summary.finalPayout / summary.grossSales) * 100 || 0).toFixed(2)}%</span>
                                        <span className="hidden sm:inline"> of gross • Steam net_sales: <span className="font-medium text-foreground">${summary.netSales.toFixed(2)}</span></span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Average Card */}
                    <Card>
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg">Daily Average</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                            <div className="flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-2xl sm:text-3xl font-bold text-green-400">
                                        ${summary.dailyAverage.toFixed(2)}
                                    </p>
                                    {usdToInr && (
                                        <p className="text-sm sm:text-base text-green-400/70">
                                            ₹{(summary.dailyAverage * usdToInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                        </p>
                                    )}
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        per day ({filteredDates.length} day{filteredDates.length !== 1 ? "s" : ""})
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings Chart */}
                    {chartData.length > 1 && (() => {
                        const avgPayout = chartData.reduce((sum, d) => sum + d.payout, 0) / chartData.length;
                        return (
                        <Card>
                            <CardHeader className="pb-3 sm:pb-6">
                                <CardTitle className="text-base sm:text-lg">Earnings Over Time</CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 sm:px-6">
                                <div className="h-64 sm:h-80 overflow-x-auto sm:overflow-x-visible">
                                    <div
                                        className="h-full sm:!min-w-full"
                                        style={{ minWidth: chartData.length > 7 ? `${chartData.length * 50}px` : "100%" }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis
                                                dataKey="index"
                                                type="number"
                                                domain={[0, "dataMax"]}
                                                tick={{ fill: "#ffffff", fontSize: 11 }}
                                                tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
                                                tickFormatter={(index) => {
                                                    const item = chartData[index];
                                                    return item?.date || "";
                                                }}
                                            />
                                            <YAxis
                                                tick={{ fill: "#ffffff", fontSize: 11 }}
                                                tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                                                axisLine={{ stroke: "rgba(255,255,255,0.3)" }}
                                                tickFormatter={(value) => `$${value}`}
                                            />
                                            <Tooltip
                                                isAnimationActive={false}
                                                cursor={{ stroke: "rgba(255,255,255,0.5)", strokeWidth: 1 }}
                                                contentStyle={{
                                                    backgroundColor: "#18181b",
                                                    border: "1px solid #3f3f46",
                                                    borderRadius: "8px",
                                                    padding: "8px 12px",
                                                }}
                                                labelStyle={{ color: "#ffffff", fontWeight: 500, marginBottom: 4 }}
                                                itemStyle={{ color: "#4ade80", fontWeight: 700, fontSize: 16 }}
                                                labelFormatter={(index) => {
                                                    const item = chartData[Number(index)];
                                                    return item?.date || "";
                                                }}
                                                formatter={(value) => {
                                                    const num = Number(value) || 0;
                                                    const inrVal = usdToInr ? ` (₹${(num * usdToInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })})` : "";
                                                    return [`$${num.toFixed(2)}${inrVal}`, "Payout"];
                                                }}
                                            />
                                            <ReferenceLine
                                                y={avgPayout}
                                                stroke="#f59e0b"
                                                strokeDasharray="5 5"
                                                strokeWidth={2}
                                                label={{
                                                    value: `Avg: $${avgPayout.toFixed(2)}${usdToInr ? ` (₹${(avgPayout * usdToInr).toLocaleString("en-IN", { maximumFractionDigits: 0 })})` : ""}`,
                                                    position: "insideTopLeft",
                                                    fill: "#f59e0b",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="payout"
                                                stroke="#4ade80"
                                                strokeWidth={2}
                                                dot={{ fill: "#4ade80", strokeWidth: 0, r: 4 }}
                                                activeDot={{ r: 6, fill: "#4ade80", stroke: "#ffffff", strokeWidth: 2 }}
                                            />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        );
                    })()}

                    <Card>
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg">Sales by Country</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                            {countryBreakdown.length === 0 && (
                                <p className="text-center text-muted-foreground py-8 text-sm">No data available</p>
                            )}
                            {countryBreakdown.map((country) => (
                                <div key={country.code} className="flex items-center gap-2 sm:gap-4">
                                    <div className="w-20 sm:w-32 text-xs sm:text-sm font-medium truncate">{country.name}</div>
                                    <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{
                                                width: `${(country.gross / (countryBreakdown[0]?.gross || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="w-16 sm:w-24 text-right text-xs sm:text-sm">${country.gross.toFixed(2)}</div>
                                    <div className="hidden sm:block w-16 text-right text-sm text-muted-foreground">{country.units}u</div>
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
