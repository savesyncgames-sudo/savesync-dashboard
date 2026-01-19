"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SteamStats {
  appId: string;
  currentPlayers: number | null;
  reviews: {
    total: number;
    positive: number;
    negative: number;
    score: number;
    scoreDesc: string;
  };
  name: string;
  headerImage: string | null;
  price: string | null;
  fetchedAt: string;
}

interface Review {
  id: string;
  positive: boolean;
  text: string;
  hoursPlayed: number;
  hoursAtReview: number;
  posted: number;
  updated: number;
  votesUp: number;
  votesFunny: number;
  steamDeck: boolean;
  earlyAccess: boolean;
  language: string;
}

export default function SteamStatsPage() {
  const [stats, setStats] = useState<SteamStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cursor, setCursor] = useState<string>("*");
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState("");

  async function fetchStats() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/steam-stats");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews(cursorVal: string, append = false) {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/steam-stats?action=reviews&cursor=${encodeURIComponent(cursorVal)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReviews(append ? [...reviews, ...data.reviews] : data.reviews);
      setCursor(data.cursor || "");
      setHasMore(data.hasMore);
    } catch (e: any) {
      console.error("Failed to fetch reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    fetchStats();
    fetchReviews("*");
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const reviewPercent = stats?.reviews.total
    ? ((stats.reviews.positive / stats.reviews.total) * 100).toFixed(0)
    : 0;

  const getScoreColor = (desc: string) => {
    if (desc.includes("Overwhelmingly Positive")) return "text-green-400";
    if (desc.includes("Very Positive")) return "text-green-400";
    if (desc.includes("Positive")) return "text-green-500";
    if (desc.includes("Mostly Positive")) return "text-lime-400";
    if (desc.includes("Mixed")) return "text-yellow-400";
    if (desc.includes("Negative")) return "text-red-400";
    return "text-muted-foreground";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {stats?.headerImage && (
            <img
              src={stats.headerImage}
              alt={stats.name}
              className="h-10 sm:h-12 w-auto rounded"
            />
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Steam Stats</h1>
            {stats && (
              <p className="text-xs text-muted-foreground">
                Updated {new Date(stats.fetchedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { fetchStats(); fetchReviews("*"); }}
          disabled={loading}
          className="gap-1"
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
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading && !stats && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {stats && (
        <>
          {/* Steam Links */}
          <div className="flex gap-2 flex-wrap text-xs sm:text-sm">
            <a
              href={`https://store.steampowered.com/app/${stats.appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Store Page
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href={`https://steamdb.info/app/${stats.appId}/charts/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              SteamDB
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href={`https://steamcharts.com/app/${stats.appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              SteamCharts
            </a>
          </div>

          {/* Key Stats Grid */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                  Playing Now
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <p className="text-lg sm:text-2xl font-bold text-green-400">
                  {stats.currentPlayers?.toLocaleString() ?? "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                  Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <p className={`text-lg sm:text-2xl font-bold ${getScoreColor(stats.reviews.scoreDesc)}`}>
                  {stats.reviews.total.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{reviewPercent}% positive</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                  Rating
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <p className={`text-sm sm:text-lg font-bold ${getScoreColor(stats.reviews.scoreDesc)}`}>
                  {stats.reviews.scoreDesc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <p className="text-lg sm:text-2xl font-bold">
                  {stats.price || "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reviews Breakdown */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Reviews Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground">Positive</div>
                <div className="flex-1 h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${reviewPercent}%` }}
                  />
                </div>
                <div className="w-14 sm:w-20 text-right text-xs sm:text-sm font-medium text-green-400">
                  {stats.reviews.positive.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground">Negative</div>
                <div className="flex-1 h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${100 - Number(reviewPercent)}%` }}
                  />
                </div>
                <div className="w-14 sm:w-20 text-right text-xs sm:text-sm font-medium text-red-400">
                  {stats.reviews.negative.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`p-3 rounded-lg border ${
                    review.positive ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        review.positive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {review.positive ? "Recommended" : "Not Recommended"}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {review.hoursPlayed}h played
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDate(review.posted)}
                    </span>
                    {review.steamDeck && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Steam Deck</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap">
                    {review.text}
                  </p>
                  {(review.votesUp > 0 || review.votesFunny > 0) && (
                    <div className="flex gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      {review.votesUp > 0 && <span>{review.votesUp} helpful</span>}
                      {review.votesFunny > 0 && <span>{review.votesFunny} funny</span>}
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReviews(cursor, true)}
                  disabled={loadingReviews}
                  className="w-full"
                >
                  {loadingReviews ? "Loading..." : "Load More Reviews"}
                </Button>
              )}

              {reviews.length === 0 && !loadingReviews && (
                <p className="text-center text-muted-foreground py-4 text-sm">No reviews found</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
