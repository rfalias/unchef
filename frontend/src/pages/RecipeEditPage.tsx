import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useRecipe, useUpdateRecipe } from "../hooks/useRecipes";
import RecipeForm from "../components/recipes/RecipeForm";
import Spinner from "../components/ui/Spinner";
import type { RecipeCreate } from "../types";

export default function RecipeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading } = useRecipe(Number(id));
  const updateMut = useUpdateRecipe(Number(id));

  const handleSave = async (data: RecipeCreate) => {
    try {
      await updateMut.mutateAsync(data);
      toast.success("Recipe updated!");
      navigate(`/recipes/${id}`);
    } catch {
      toast.error("Failed to update recipe.");
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!recipe) return <div className="p-6 text-gray-500">Recipe not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Edit Recipe</h1>
      <RecipeForm initial={recipe} onSubmit={handleSave} isPending={updateMut.isPending} submitLabel="Update Recipe" />
    </div>
  );
}
