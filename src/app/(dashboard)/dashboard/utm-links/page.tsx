"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UtmRow {
  _rowIndex: string;
  [key: string]: string;
}

export default function UtmLinksPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [newRow, setNewRow] = useState<Record<string, string> | null>(null);

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

  async function saveRow(rowIndex: string, data: Record<string, string>) {
    setSaving(rowIndex);
    try {
      await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", rowIndex, rowData: data, headers }),
      });
      await fetchData();
      setEditingRow(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function addRow() {
    if (!newRow) return;
    setSaving("new");
    try {
      await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", rowData: newRow, headers }),
      });
      await fetchData();
      setNewRow(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function deleteRow(rowIndex: string) {
    if (!confirm("Delete this row?")) return;
    setSaving(rowIndex);
    try {
      await fetch("/api/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", rowIndex, headers }),
      });
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  function startEdit(row: UtmRow) {
    setEditingRow(row._rowIndex);
    setEditData({ ...row });
  }

  function EditableCell({ column, value, onChange }: { column: string; value: string; onChange: (v: string) => void }) {
    const [isCustom, setIsCustom] = useState(false);
    const options = uniqueValues[column] || [];

    if (isCustom || !options.length) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-7 px-2 text-xs border border-input bg-background rounded"
          placeholder="Enter value..."
        />
      );
    }

    return (
      <div className="flex gap-1">
        <select
          value={options.includes(value) ? value : ""}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setIsCustom(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="flex-1 h-7 px-1 text-xs border border-input bg-background rounded"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="__custom__">+ Add new...</option>
        </select>
      </div>
    );
  }

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const emptyRow: Record<string, string> = {};
              headers.forEach((h) => (emptyRow[h] = ""));
              setNewRow(emptyRow);
            }}
            disabled={!!newRow}
          >
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
                  {headers.map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 text-xs whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="text-left font-medium px-3 py-2 text-xs w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* New Row */}
                {newRow && (
                  <tr className="bg-green-500/5">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-2">
                        <EditableCell
                          column={h}
                          value={newRow[h] || ""}
                          onChange={(v) => setNewRow({ ...newRow, [h]: v })}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 px-2 text-xs" onClick={addRow} disabled={saving === "new"}>
                          {saving === "new" ? "..." : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setNewRow(null)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Existing Rows */}
                {rows.filter((r) => headers.some((h) => r[h])).map((row) => (
                  <tr key={row._rowIndex} className="hover:bg-muted/30">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-2">
                        {editingRow === row._rowIndex ? (
                          <EditableCell
                            column={h}
                            value={editData[h] || ""}
                            onChange={(v) => setEditData({ ...editData, [h]: v })}
                          />
                        ) : (
                          <span className="text-xs truncate block max-w-[150px]" title={row[h]}>
                            {row[h] || "-"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      {editingRow === row._rowIndex ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => saveRow(row._rowIndex, editData)}
                            disabled={saving === row._rowIndex}
                          >
                            {saving === row._rowIndex ? "..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingRow(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => startEdit(row)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-red-400"
                            onClick={() => deleteRow(row._rowIndex)}
                            disabled={saving === row._rowIndex}
                          >
                            Del
                          </Button>
                        </div>
                      )}
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
    </div>
  );
}
