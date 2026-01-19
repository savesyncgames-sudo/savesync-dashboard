"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface UtmRow {
  _rowIndex: string;
  [key: string]: string;
}

export default function UtmLinksPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editingRowIndex, setEditingRowIndex] = useState<string | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<string, boolean>>({});

  // Hide specific columns from display in table
  const hiddenColumns = ["utm_term", "status", "baseurl", "dashboard link", "link where this is posted", "url"];
  const displayHeaders = headers.filter((h) => !hiddenColumns.includes(h.toLowerCase()));

  // Find the URL column for copy functionality
  const urlColumn = headers.find((h) => h.toLowerCase() === "url") || headers.find((h) => h.toLowerCase().includes("url"));

  // Columns that should always be text input (not dropdown)
  const textInputColumns = ["title"];

  // Columns to exclude from dialog (auto-generated or not needed)
  const excludeFromDialog = ["url", "baseurl", "dashboard link", "link where this is posted", "status"];

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("URL copied to clipboard");
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/utm-links");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHeaders(data.headers || []);
      setRows(data.rows || []);
      setUniqueValues(data.uniqueValues || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openAddDialog() {
    const emptyRow: Record<string, string> = {};
    headers.forEach((h) => (emptyRow[h] = ""));
    setEditData(emptyRow);
    setEditingRowIndex(null);
    setCustomInputs({});
    setDialogOpen(true);
  }

  function openEditDialog(row: UtmRow) {
    setEditData({ ...row });
    setEditingRowIndex(row._rowIndex);
    setCustomInputs({});
    setDialogOpen(true);
  }

  async function saveRow() {
    setSaving(true);
    try {
      const action = editingRowIndex ? "update" : "add";
      // Always set BaseURL to the Steam store page
      const rowData = {
        ...editData,
        BaseURL: "https://store.steampowered.com/app/3832010"
      };
      const res = await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rowIndex: editingRowIndex,
          rowData,
          headers
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      await fetchData();
      setDialogOpen(false);
      toast.success(editingRowIndex ? "Row updated" : "Row added");
    } catch (e: any) {
      toast.error(e.message);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(rowIndex: string) {
    if (!confirm("Delete this row?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", rowIndex, headers }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      await fetchData();
      toast.success("Row deleted");
    } catch (e: any) {
      toast.error(e.message);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function isTextInput(column: string) {
    return textInputColumns.some((c) => column.toLowerCase() === c.toLowerCase());
  }

  function handleFieldChange(column: string, value: string) {
    setEditData(prev => ({ ...prev, [column]: value }));
  }

  function toggleCustomInput(column: string) {
    setCustomInputs(prev => ({ ...prev, [column]: !prev[column] }));
  }

  // Get editable headers for dialog (exclude auto-generated fields)
  const editableHeaders = headers.filter((h) =>
    !excludeFromDialog.some(ex => h.toLowerCase() === ex.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">UTM Links</h1>
          <a
            href="https://docs.google.com/spreadsheets/d/1m_2tJytEOxThocixJnNHMFDaR8Auvz1nPkNSSrzD4JY/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            Edit in Google Sheets
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            + Add Row
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading && !rows.length && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && headers.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {displayHeaders.map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 text-xs whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="text-left font-medium px-3 py-2 text-xs w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.filter((r) => displayHeaders.some((h) => r[h])).map((row) => (
                  <tr key={row._rowIndex} className="hover:bg-muted/30">
                    {displayHeaders.map((h) => (
                      <td key={h} className="px-3 py-2">
                        <span className="text-xs truncate block max-w-[200px]" title={row[h]}>
                          {row[h] || "-"}
                        </span>
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        {urlColumn && row[urlColumn] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(row[urlColumn])}
                            title="Copy URL"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditDialog(row)} title="Edit">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400"
                          onClick={() => deleteRow(row._rowIndex)}
                          disabled={saving}
                          title="Delete"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && headers.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">No data found. Make sure the sheet has headers in row 1.</p>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRowIndex ? "Edit UTM Link" : "Add UTM Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {editableHeaders.map((h) => {
              const options = uniqueValues[h] || [];
              const showCustom = customInputs[h] || isTextInput(h);

              return (
                <div key={h} className="space-y-1.5">
                  <label className="text-sm font-medium">{h}</label>

                  {showCustom ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editData[h] || ""}
                        onChange={(e) => handleFieldChange(h, e.target.value)}
                        className="flex-1 h-9 px-3 text-sm border border-input bg-background rounded-md"
                        placeholder={`Enter ${h}...`}
                      />
                      {!isTextInput(h) && options.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-2"
                          onClick={() => toggleCustomInput(h)}
                          title="Switch to dropdown"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={options.includes(editData[h]) ? editData[h] : ""}
                        onChange={(e) => handleFieldChange(h, e.target.value)}
                        className="flex-1 h-9 px-3 text-sm border border-input bg-background rounded-md"
                      >
                        <option value="">Select...</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-2"
                        onClick={() => toggleCustomInput(h)}
                        title="Enter custom value"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRow} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
