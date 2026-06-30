import { useState } from "react";
import { parseInspect, type ParseInspectResult } from "../api/admin";
import { useAuth } from "../auth/AuthContext";

type StatusDot = "ok" | "warn" | "error" | "idle";

function Dot({ status }: { status: StatusDot }) {
  const cls = {
    ok: "bg-green-500",
    warn: "bg-yellow-500",
    error: "bg-red-500",
    idle: "bg-gray-700",
  }[status];
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} shrink-0`} />;
}

function Section({ title, status, children }: { title: string; status: StatusDot; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Dot status={status} />
        <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono = false, warn = false }: { label: string; value: React.ReactNode; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-600 w-36 shrink-0">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${warn ? "text-yellow-400" : "text-gray-300"} break-all`}>
        {value}
      </span>
    </div>
  );
}

function outcomeLabel(outcome: string): { text: string; status: StatusDot } {
  if (outcome === "scraper_success") return { text: "Scraper succeeded", status: "ok" };
  if (outcome === "json_ld_available") return { text: "Will import via JSON-LD fallback (scraper doesn't support this site)", status: "ok" };
  if (outcome === "no_recipe_found") return { text: "No recipe data found — import will fail", status: "error" };
  if (outcome.startsWith("http_error")) return { text: `HTTP error (${outcome})`, status: "error" };
  if (outcome === "fetch_failed") return { text: "Fetch failed", status: "error" };
  return { text: outcome, status: "idle" };
}

export default function AdminDebugPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseInspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await parseInspect(url.trim(), useAi);
      setResult(r);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Parse Debugger</h1>
      <p className="text-sm text-gray-500 mb-6">Inspect what the recipe importer finds at any URL.</p>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.somesite.com/recipe/..."
            type="url"
            required
            className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            {loading ? "Inspecting…" : "Inspect"}
          </button>
        </div>
        {user?.has_claude_key && (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="rounded accent-green-500"
            />
            <span className="text-sm text-gray-400">
              <span className="text-green-400">✨</span> Also run AI parse
            </span>
            <span className="text-xs text-gray-600">— uses Claude credits</span>
          </label>
        )}
      </form>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {result && (() => {
        const oc = outcomeLabel(result.outcome);
        return (
          <div className="space-y-4">
            {/* Outcome banner */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              oc.status === "ok" ? "bg-green-950 border-green-800 text-green-300" :
              oc.status === "warn" ? "bg-yellow-950 border-yellow-800 text-yellow-300" :
              "bg-red-950 border-red-800 text-red-300"
            }`}>
              <Dot status={oc.status} />
              {oc.text}
            </div>

            {/* Fetch */}
            <Section title="1. HTTP Fetch" status={result.fetch.ok ? "ok" : "error"}>
              {result.fetch.error ? (
                <Row label="Error" value={result.fetch.error} warn />
              ) : (
                <>
                  <Row label="Status" value={String(result.fetch.status_code)} warn={!!(result.fetch.status_code && result.fetch.status_code >= 400)} />
                  <Row label="Final URL" value={result.fetch.final_url ?? "—"} mono />
                  <Row label="Content-Type" value={result.fetch.content_type ?? "—"} mono />
                  <Row label="Size" value={`${result.fetch.content_length_kb} KB`} />
                  {result.fetch.looks_binary && (
                    <Row label="Warning" value="Response looks binary — decompression may have failed" warn />
                  )}
                </>
              )}
            </Section>

            {/* JSON-LD */}
            <Section
              title="2. JSON-LD Structured Data"
              status={result.json_ld.recipe_found ? "ok" : result.json_ld.scripts_found > 0 ? "warn" : "error"}
            >
              <Row label="Scripts found" value={String(result.json_ld.scripts_found)} />
              <Row
                label="Types present"
                value={result.json_ld.all_types.length ? result.json_ld.all_types.join(", ") : "none"}
                mono
              />
              <Row label="Recipe node" value={result.json_ld.recipe_found ? "Found" : "Not found"} warn={!result.json_ld.recipe_found} />
              {result.json_ld.recipe_found && (
                <>
                  <Row label="Recipe name" value={result.json_ld.recipe_name ?? "—"} />
                  <Row label="Has ingredients" value={result.json_ld.has_ingredients ? "Yes" : "No"} warn={!result.json_ld.has_ingredients} />
                  <Row label="Has instructions" value={result.json_ld.has_instructions ? "Yes" : "No"} warn={!result.json_ld.has_instructions} />
                  <Row label="Keys" value={result.json_ld.recipe_keys.join(", ")} mono />
                </>
              )}
            </Section>

            {/* Scraper */}
            <Section
              title="3. recipe-scrapers"
              status={result.scraper.ok && !!result.scraper.title ? "ok" : !result.scraper.ok && result.json_ld.recipe_found ? "warn" : result.scraper.ok ? "warn" : "error"}
            >
              {result.scraper.error ? (
                <Row label="Error" value={result.scraper.error} warn />
              ) : (
                <>
                  <Row label="Title" value={result.scraper.title || "(empty)"} warn={!result.scraper.title} />
                  <Row label="Ingredients" value={`${result.scraper.ingredients_count} found`} warn={result.scraper.ingredients_count === 0} />
                  <Row label="Instructions" value={`${result.scraper.instructions_count} steps`} warn={result.scraper.instructions_count === 0} />
                </>
              )}
            </Section>

            {/* AI */}
            {result.ai && (
              <Section
                title="4. AI parse ✨"
                status={!result.ai.ran ? "idle" : result.ai.ok ? "ok" : "error"}
              >
                {!result.ai.ran ? (
                  <Row label="Status" value={result.ai.error ?? "Not run"} warn={!!result.ai.error} />
                ) : result.ai.error ? (
                  <Row label="Error" value={result.ai.error} warn />
                ) : (
                  <>
                    <Row label="Input to Claude" value={result.ai.content_source === "json_ld" ? "JSON-LD structured data" : "Page text"} mono />
                    <Row label="Title" value={result.ai.title || "(empty)"} warn={!result.ai.title} />
                    <Row label="Ingredients" value={`${result.ai.ingredients_count} found`} warn={result.ai.ingredients_count === 0} />
                    <Row label="Instructions" value={`${result.ai.instructions_count} steps`} warn={result.ai.instructions_count === 0} />
                  </>
                )}
              </Section>
            )}
          </div>
        );
      })()}
    </div>
  );
}
