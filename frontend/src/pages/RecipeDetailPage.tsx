import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useRecipe, useDeleteRecipe } from "../hooks/useRecipes";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../components/ui/Spinner";
import AddToListModal from "../components/shopping/AddToListModal";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: recipe, isLoading } = useRecipe(Number(id));
  const deleteMut = useDeleteRecipe();
  const [showListModal, setShowListModal] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this recipe?")) return;
    await deleteMut.mutateAsync(Number(id));
    toast.success("Recipe deleted");
    navigate("/recipes");
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!recipe) return <div className="p-6 text-gray-500">Recipe not found.</div>;

  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {recipe.image_url && (
        <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">{recipe.title}</h1>
        {recipe.description && <p className="text-gray-400 mb-3">{recipe.description}</p>}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowListModal(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            🛒 Add to List
          </button>
          <Link to={`/recipes/${id}/edit`}
            className="border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Edit
          </Link>
          {isAdmin && (
            <button onClick={handleDelete}
              className="border border-red-900 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-900/20 transition-colors">
              Delete
            </button>
          )}
        </div>
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

      {showListModal && (
        <AddToListModal
          recipeId={Number(id)}
          recipeName={recipe.title}
          onClose={() => setShowListModal(false)}
        />
      )}
    </div>
  );
}
