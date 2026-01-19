"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSheetConfig } from "@/config/sheets";

interface SupportedGame {
  name: string;
  headerUrl: string;
  buyLink: string;
  gameId: string;
  guideUrl: string;
  redditPosts: string;
  website: string;
  twitterAccounts: string;
  subreddit: string;
  redditUser: string;
  discord: string;
}

export default function SupportedGamesPage() {
  const [search, setSearch] = useState("");
  const [games, setGames] = useState<SupportedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<SupportedGame | null>(null);

  const sheetConfig = getSheetConfig("/dashboard/supported-games");

  async function fetchGames(forceRefresh = false) {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/supported-games?refresh=true" : "/api/supported-games";
      const response = await fetch(url);
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error("Failed to fetch supported games:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      return game.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [games, search]);

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
          <h1 className="text-2xl font-bold">Supported Games</h1>
          <p className="text-sm text-muted-foreground">
            {games.length} games supported
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGames(true)}
            disabled={loading}
            className="gap-2"
          >
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          {sheetConfig && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={sheetConfig.editUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.385 2.615a2.1 2.1 0 00-2.97 0L4.797 14.233a1 1 0 00-.263.464l-1.5 6a1 1 0 001.214 1.214l6-1.5a1 1 0 00.464-.263L22.33 8.53a2.1 2.1 0 000-2.97l-2.945-2.945zM17.828 4.03l2.142 2.142-1.414 1.414-2.142-2.142 1.414-1.414zM6.21 15.604l9.192-9.192 2.142 2.142-9.192 9.192-2.856.714.714-2.856z"/>
                </svg>
                Edit Sheet
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
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
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left font-medium px-4 py-3">Game</th>
                <th className="text-left font-medium px-4 py-3">Steam ID</th>
                <th className="text-left font-medium px-4 py-3">Store</th>
                <th className="text-left font-medium px-4 py-3">Guide</th>
                <th className="text-left font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGames.map((game) => (
                <tr key={game.name} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {game.headerUrl && (
                        <img
                          src={game.headerUrl}
                          alt={game.name}
                          className="h-8 w-14 object-cover rounded"
                        />
                      )}
                      <span className="font-medium">{game.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {game.gameId && game.gameId !== "-1" ? game.gameId : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {game.buyLink ? (
                      <a
                        href={game.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {game.guideUrl ? (
                      <a
                        href={game.guideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedGame(game)}
                    >
                      More Info
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredGames.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No games found.
        </div>
      )}

      <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedGame && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedGame.name}</DialogTitle>
              </DialogHeader>

              {selectedGame.headerUrl && (
                <div className="aspect-[460/215] w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={selectedGame.headerUrl}
                    alt={selectedGame.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {selectedGame.gameId && selectedGame.gameId !== "-1" && (
                  <InfoItem label="Steam ID" value={selectedGame.gameId} />
                )}

                {selectedGame.buyLink && (
                  <InfoLink label="Store Page" url={selectedGame.buyLink} />
                )}

                {selectedGame.guideUrl && (
                  <InfoLink label="SaveSync Guide" url={selectedGame.guideUrl} />
                )}

                {selectedGame.website && (
                  <InfoLink label="Official Website" url={selectedGame.website} />
                )}

                {selectedGame.discord && (
                  <InfoLink label="Discord" url={selectedGame.discord} />
                )}

                {selectedGame.subreddit && (
                  <InfoLink
                    label="Subreddit"
                    url={`https://reddit.com/${selectedGame.subreddit}`}
                    display={selectedGame.subreddit}
                  />
                )}

                {selectedGame.redditUser && (
                  <InfoLink
                    label="Reddit User"
                    url={`https://reddit.com/${selectedGame.redditUser}`}
                    display={selectedGame.redditUser}
                  />
                )}

                {selectedGame.twitterAccounts && (
                  <TwitterLinks label="Twitter" accounts={selectedGame.twitterAccounts} />
                )}

                {selectedGame.redditPosts && (
                  <InfoLink label="Reddit Posts" url={selectedGame.redditPosts} />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {selectedGame.buyLink && (
                  <Button asChild>
                    <a href={selectedGame.buyLink} target="_blank" rel="noopener noreferrer">
                      View on Store
                    </a>
                  </Button>
                )}
                {selectedGame.guideUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedGame.guideUrl} target="_blank" rel="noopener noreferrer">
                      Open Guide
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function InfoLink({ label, url, display }: { label: string; url: string; display?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-400 underline hover:text-blue-300 break-all"
      >
        {display || url}
      </a>
    </div>
  );
}

function TwitterLinks({ label, accounts }: { label: string; accounts: string }) {
  const handles = accounts.split(",").map((h) => h.trim()).filter(Boolean);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">
        {handles.map((handle) => {
          const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
          return (
            <a
              key={handle}
              href={`https://twitter.com/${cleanHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 underline hover:text-blue-300"
            >
              {handle.startsWith("@") ? handle : `@${handle}`}
            </a>
          );
        })}
      </div>
    </div>
  );
}
