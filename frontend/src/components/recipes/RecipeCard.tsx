import { Link } from "react-router-dom";
import type { Recipe } from "../../types";

function timeLabel(mins: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}`.trim();
}

export default function RecipeCard({ recipe, basePath = "/recipes" }: { recipe: Recipe; basePath?: string }) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  return (
    <Link to={`${basePath}/${recipe.id}`} className="block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-500 hover:shadow-lg hover:shadow-black/30 transition-all">
      <div className="h-40 bg-gray-700 overflow-hidden">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-100 text-sm line-clamp-2 mb-1">{recipe.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {recipe.servings && <span>👤 {recipe.servings}</span>}
          {totalTime > 0 && <span>⏱ {timeLabel(totalTime)}</span>}
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
