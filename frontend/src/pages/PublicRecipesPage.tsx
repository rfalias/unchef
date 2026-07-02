import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import publicClient from "../api/publicClient";
import RecipeCard from "../components/recipes/RecipeCard";
import Spinner from "../components/ui/Spinner";
import type { RecipeListResponse } from "../types";

export default function PublicRecipesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, error } = useQuery<RecipeListResponse>({
    queryKey: ["public-recipes", debounced],
    queryFn: async () => {
      const { data } = await publicClient.get("/public/recipes", {
        params: debounced ? { q: debounced } : {},
      });
      return data;
    },
  });

  if (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="text-lg font-semibold text-gray-300 mb-1">
          {status === 403 ? "Recipe browsing is private" : "Something went wrong"}
        </h2>
        <p className="text-sm text-gray-500">
          {status === 403
            ? "The owner hasn't enabled public access yet."
            : "Could not load recipes."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative mb-6 max-w-md">
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
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <span className="text-4xl mb-4">{debounced ? "🔍" : "📖"}</span>
          <p className="text-gray-500">
            {debounced ? `No results for "${debounced}"` : "No recipes yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.items.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} basePath="/public" />
          ))}
        </div>
      )}
    </div>
  );
}
