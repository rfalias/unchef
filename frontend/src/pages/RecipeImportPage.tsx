import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useImportRecipe, useCreateRecipe } from "../hooks/useRecipes";
import { aiParseRecipe } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import RecipeForm from "../components/recipes/RecipeForm";
import Spinner from "../components/ui/Spinner";
import type { Recipe, RecipeCreate } from "../types";

export default function RecipeImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<Recipe | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Importing…");
  const [parseMethod, setParseMethod] = useState<"standard" | "ai" | null>(null);
  const importMut = useImportRecipe();
  const createMut = useCreateRecipe();

  const runAI = async () => {
    setLoadingMsg("AI parsing…");
    const recipe = await aiParseRecipe(url);
    setParsed(recipe as Recipe);
    setParseMethod("ai");
    toast.success("Recipe parsed with AI! Review and save below.");
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setParsed(null);
    setLoading(true);

    try {
      if (useAI) {
        await runAI();
      } else {
        setLoadingMsg("Importing…");
        try {
          const recipe = await importMut.mutateAsync(url);
          setParsed(recipe);
          setParseMethod("standard");
          toast.success("Recipe parsed! Review and save below.");
        } catch (scraperErr: unknown) {
          const detail = (scraperErr as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          toast.error(detail ?? "Failed to import recipe.");
        }
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: RecipeCreate) => {
    try {
      const saved = await createMut.mutateAsync(data);
      toast.success("Recipe saved!");
      navigate(`/recipes/${saved.id}`);
    } catch {
      toast.error("Failed to save recipe.");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Import Recipe from URL</h1>

      <form onSubmit={handleImport} className="space-y-3 mb-8">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.allrecipes.com/recipe/..."
            type="url"
            required
            className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shrink-0"
          >
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? loadingMsg : "Import"}
          </button>
        </div>

        {user?.has_claude_key && (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="rounded accent-green-500"
            />
            <span className="text-sm text-gray-400">
              <span className="text-green-400">✨</span> Use AI directly
            </span>
          </label>
        )}
      </form>

      {parsed && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Review &amp; Save</h2>
            {parseMethod === "ai" && (
              <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full font-medium">✨ AI</span>
            )}
            {parseMethod === "standard" && (
              <span className="text-xs bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">Standard import</span>
            )}
          </div>
          <RecipeForm initial={parsed} onSubmit={handleSave} isPending={createMut.isPending} />
        </div>
      )}
    </div>
  );
}
