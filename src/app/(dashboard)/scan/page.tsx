"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scanEmails } from "@/actions/scan";
import { organizeEmails } from "@/actions/organize";
import type { ScanResult } from "@/actions/scan";
import { Search, Play, Loader2 } from "lucide-react";

export default function ScanPage() {
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [scanning, setScanning] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [organizeResult, setOrganizeResult] = useState<{
    totalMoved: number;
    totalFailed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setOrganizeResult(null);

    const result = await scanEmails({
      yearFrom: yearFrom ? Number(yearFrom) : undefined,
      yearTo: yearTo ? Number(yearTo) : undefined,
      preview: true,
    });

    setScanning(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setScanResult(result.data);
  }

  async function handleOrganize() {
    setOrganizing(true);
    setError(null);

    const result = await organizeEmails({
      yearFrom: yearFrom ? Number(yearFrom) : undefined,
      yearTo: yearTo ? Number(yearTo) : undefined,
      dryRun: false,
    });

    setOrganizing(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOrganizeResult({
      totalMoved: result.data.totalMoved,
      totalFailed: result.data.totalFailed,
    });
    setScanResult(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan & Organize</h1>
        <p className="text-sm text-gray-500">
          Preview matching emails then run organize to move them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year from</Label>
              <Input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="2020"
                min={2000}
                max={2100}
              />
            </div>
            <div className="space-y-2">
              <Label>Year to</Label>
              <Input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder={String(new Date().getFullYear())}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleScan} disabled={scanning || organizing}>
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Preview Matches
            </Button>
            <Button
              variant="outline"
              onClick={handleOrganize}
              disabled={scanning || organizing}
            >
              {organizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Organize
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {organizeResult && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-lg font-semibold text-gray-900">
              Organize complete!
            </p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-green-700">
                ✓ {organizeResult.totalMoved} moved
              </span>
              {organizeResult.totalFailed > 0 && (
                <span className="text-red-700">
                  ✗ {organizeResult.totalFailed} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {scanResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Preview: {scanResult.total} match
              {scanResult.total !== 1 ? "es" : ""}
            </h2>
          </div>

          {scanResult.matches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No emails matched your enabled rules.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {scanResult.matches.slice(0, 100).map((match, i) => (
                <Card key={`${match.message.id}-${i}`}>
                  <CardContent className="flex items-start justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {match.message.subject ?? "(no subject)"}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {match.message.from?.emailAddress?.address}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-3 shrink-0 text-xs">
                      {match.rule.name}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {scanResult.matches.length > 100 && (
                <p className="text-center text-sm text-gray-400">
                  Showing first 100 of {scanResult.matches.length} matches
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
