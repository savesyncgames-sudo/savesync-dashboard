"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSheetConfig } from "@/config/sheets";

interface QuickLink {
  name: string;
  url: string;
  tag: string;
}

// Pure function to generate consistent color based on tag name
function getTagColor(tag: string): string {
  const colors = [
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "bg-red-500/20 text-red-400 border-red-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    "bg-teal-500/20 text-teal-400 border-teal-500/30",
    "bg-rose-500/20 text-rose-400 border-rose-500/30",
    "bg-sky-500/20 text-sky-400 border-sky-500/30",
  ];

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export default function QuickLinksPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  const sheetConfig = getSheetConfig("/dashboard/quick-links");

  async function fetchLinks(forceRefresh = false) {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/quick-links?refresh=true" : "/api/quick-links";
      const response = await fetch(url);
      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error("Failed to fetch quick links:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLinks();
  }, []);

  const tags = useMemo(() => {
    return [...new Set(links.map((link) => link.tag))].sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch =
        link.name.toLowerCase().includes(search.toLowerCase()) ||
        link.url.toLowerCase().includes(search.toLowerCase()) ||
        link.tag.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !selectedTag || link.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [links, search, selectedTag]);

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
          <h1 className="text-2xl font-bold">Quick Links</h1>
          <p className="text-sm text-muted-foreground">
            All resources in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLinks(true)}
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
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
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={`cursor-pointer ${!selectedTag ? "bg-primary text-primary-foreground border-primary" : ""}`}
            onClick={() => setSelectedTag(null)}
          >
            All ({links.length})
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`cursor-pointer ${selectedTag === tag ? getTagColor(tag) : ""}`}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Name
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                URL
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground sm:table-cell">
                Tag
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLinks.map((link) => (
              <tr
                key={link.name}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{link.name}</span>
                    <span className="md:hidden">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 underline hover:text-blue-300 break-all"
                      >
                        {link.url.length > 40 ? link.url.slice(0, 40) + "..." : link.url}
                      </a>
                    </span>
                    <span className="sm:hidden">
                      <Badge variant="outline" className={`text-xs ${getTagColor(link.tag)}`}>
                        {link.tag}
                      </Badge>
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 underline hover:text-blue-300"
                  >
                    {link.url.length > 60 ? link.url.slice(0, 60) + "..." : link.url}
                  </a>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge variant="outline" className={getTagColor(link.tag)}>
                    {link.tag}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLinks.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No links found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
