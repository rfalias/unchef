import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCreateRecipe } from "../hooks/useRecipes";
import RecipeForm from "../components/recipes/RecipeForm";
import type { RecipeCreate } from "../types";

export default function RecipeNewPage() {
  const navigate = useNavigate();
  const createMut = useCreateRecipe();

  const handleSave = async (data: RecipeCreate) => {
    try {
      const recipe = await createMut.mutateAsync(data);
      toast.success("Recipe saved!");
      navigate(`/recipes/${recipe.id}`);
    } catch {
      toast.error("Failed to save recipe.");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">New Recipe</h1>
      <RecipeForm onSubmit={handleSave} isPending={createMut.isPending} submitLabel="Save Recipe" />
    </div>
  );
}
