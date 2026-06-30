import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Spinner from "../ui/Spinner";
import { useRecipes } from "../../hooks/useRecipes";
import { useStores } from "../../hooks/useStores";
import { useCreateShoppingList } from "../../hooks/useShoppingLists";

interface Props {
  preselectedRecipeId?: number;
  onClose: () => void;
}

const input = "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const label = "block text-sm font-medium text-gray-300 mb-1";

export default function CreateListModal({ preselectedRecipeId, onClose }: Props) {
  const navigate = useNavigate();
  const { data: recipesData, isLoading: loadingRecipes } = useRecipes();
  const { data: stores } = useStores();
  const createMut = useCreateShoppingList();

  const [name, setName] = useState("Shopping List");
  const [storeId, setStoreId] = useState<number | "">("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    preselectedRecipeId ? new Set([preselectedRecipeId]) : new Set()
  );
  const [recipeSearch, setRecipeSearch] = useState("");

  const toggleRecipe = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const list = await createMut.mutateAsync({
        name,
        store_id: storeId || null,
        recipe_ids: Array.from(selectedIds),
      });
      toast.success("Shopping list created!");
      onClose();
      navigate(`/shopping-lists/${list.id}`);
    } catch {
      toast.error("Failed to create list.");
    }
  };

  const filtered = (recipesData?.items ?? []).filter(r =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <Modal title="New Shopping List" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={label}>List Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required className={input} />
        </div>

        <div>
          <label className={label}>Store (for aisle sorting)</label>
          <select value={storeId} onChange={e => setStoreId(e.target.value ? Number(e.target.value) : "")}
            className={input}>
            <option value="">No store (unsorted)</option>
            {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>Recipes ({selectedIds.size} selected)</label>
          <input value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
            placeholder="Search recipes..."
            className={input + " mb-2"} />
          <div className="border border-gray-700 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-800">
            {loadingRecipes ? (
              <div className="flex justify-center p-4"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 p-3 text-center">No recipes found.</p>
            ) : filtered.map(recipe => (
              <label key={recipe.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-800 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(recipe.id)} onChange={() => toggleRecipe(recipe.id)}
                  className="rounded text-green-600" />
                <span className="text-sm text-gray-200">{recipe.title}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={createMut.isPending}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white py-2.5 rounded-lg text-sm font-medium">
          {createMut.isPending ? "Creating..." : "Create Shopping List"}
        </button>
      </form>
    </Modal>
  );
}
