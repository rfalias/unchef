import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicClient from "../api/publicClient";
import Spinner from "../components/ui/Spinner";
import type { Recipe } from "../types";

export default function PublicRecipeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: recipe, isLoading, error } = useQuery<Recipe>({
    queryKey: ["public-recipe", id],
    queryFn: async () => {
      const { data } = await publicClient.get(`/public/recipes/${id}`);
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (error || !recipe) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Recipe not found.</p>
        <Link to="/public" className="text-sm text-green-500 hover:text-green-400 mt-4 inline-block">
          ← Back to recipes
        </Link>
      </div>
    );
  }

  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/public" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
        ← All recipes
      </Link>

      {recipe.image_url && (
        <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">{recipe.title}</h1>
        {recipe.description && <p className="text-gray-400 mb-3">{recipe.description}</p>}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
        {recipe.servings && <span>👤 {recipe.servings} servings</span>}
        {recipe.prep_time_minutes && <span>⏱ Prep: {recipe.prep_time_minutes}m</span>}
        {recipe.cook_time_minutes && <span>🔥 Cook: {recipe.cook_time_minutes}m</span>}
        {totalTime > 0 && <span>⏳ Total: {totalTime}m</span>}
      </div>

      {recipe.source_url && (
        <div className="mb-6">
          <a href={recipe.source_url} target="_blank" rel="noreferrer"
            className="text-sm text-green-500 hover:text-green-400 break-all">
            {recipe.source_url} ↗
          </a>
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {recipe.tags.map(tag => (
            <span key={tag} className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Ingredients</h2>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) => {
              const prevSection = i > 0 ? recipe.ingredients[i - 1].section : undefined;
              const showHeader = ing.section && ing.section !== prevSection;
              return (
                <>
                  {showHeader && (
                    <li key={`sec-${i}`} className="pt-3 pb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {ing.section}
                      </span>
                    </li>
                  )}
                  <li key={i} className="flex gap-2 text-sm text-gray-300 py-1.5 border-b border-gray-800 last:border-0">
                    <span className="text-gray-600 shrink-0">
                      {[ing.amount, ing.unit].filter(Boolean).join(" ")}
                    </span>
                    <span className="font-medium">{ing.name}</span>
                    {ing.notes && <span className="text-gray-600 italic">({ing.notes})</span>}
                  </li>
                </>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Instructions</h2>
          <ol className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="shrink-0 w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
