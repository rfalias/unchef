import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useRecipes } from "../hooks/useRecipes";
import RecipeCard from "../components/recipes/RecipeCard";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

export default function RecipesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isFetching } = useRecipes(debounced || undefined);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Recipes</h1>
        <Link
          to="/recipes/import"
          className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 hover:text-gray-100 transition-colors"
        >
          🔗 Import URL
        </Link>
      </div>

      <div className="relative mb-6">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search recipes…"
          className="w-full border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={debounced ? "🔍" : "📖"}
          title={debounced ? `No results for "${debounced}"` : "No recipes yet"}
          body={debounced ? "Try a different search term." : "Import from a URL or create one manually."}
          action={
            !debounced && (
              <Link
                to="/recipes/import"
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Import a Recipe
              </Link>
            )
          }
        />
      ) : (
        <>
          {isFetching && !isLoading && (
            <p className="text-xs text-gray-600 mb-3">Updating…</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data.items.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        </>
      )}
    </div>
  );
}
