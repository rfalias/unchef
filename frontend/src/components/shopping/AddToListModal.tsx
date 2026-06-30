import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Spinner from "../ui/Spinner";
import { useShoppingLists, useCreateShoppingList } from "../../hooks/useShoppingLists";
import { addRecipes } from "../../api/shoppingLists";
import { useStores } from "../../hooks/useStores";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  recipeId: number;
  recipeName: string;
  onClose: () => void;
}

const input = "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const lbl = "block text-sm font-medium text-gray-300 mb-1";

export default function AddToListModal({ recipeId, recipeName, onClose }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const { data: lists, isLoading } = useShoppingLists(false);
  const { data: stores } = useStores();
  const createMut = useCreateShoppingList();
  const [addingId, setAddingId] = useState<number | null>(null);
  const [name, setName] = useState("Shopping List");
  const [storeId, setStoreId] = useState<number | "">("");

  const handleAddToExisting = async (listId: number) => {
    setAddingId(listId);
    try {
      const updated = await addRecipes(listId, [recipeId]);
      qc.setQueryData(["shopping-list", listId], updated);
      toast.success("Recipe added to list!");
      onClose();
      navigate(`/shopping-lists/${listId}`);
    } catch {
      toast.error("Failed to add recipe.");
    } finally {
      setAddingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const list = await createMut.mutateAsync({
        name,
        store_id: storeId || null,
        recipe_ids: [recipeId],
      });
      toast.success("Shopping list created!");
      onClose();
      navigate(`/shopping-lists/${list.id}`);
    } catch {
      toast.error("Failed to create list.");
    }
  };

  return (
    <Modal title={`Add to Shopping List`} onClose={onClose}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800 border border-gray-700 rounded-lg mb-4">
        {(["existing", "new"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t ? "bg-gray-600 text-gray-100" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "existing" ? "Existing List" : "Create New"}
          </button>
        ))}
      </div>

      {tab === "existing" ? (
        isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !lists?.length ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p className="mb-3">No active shopping lists yet.</p>
            <button type="button" onClick={() => setTab("new")} className="text-green-500 hover:text-green-400">
              Create one →
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {lists.map(list => {
              const pct = list.total_items > 0
                ? Math.round((list.checked_items / list.total_items) * 100)
                : 0;
              return (
                <button
                  key={list.id}
                  type="button"
                  disabled={addingId !== null}
                  onClick={() => handleAddToExisting(list.id)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-xl p-3 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-gray-200 text-sm">{list.name}</span>
                    {addingId === list.id
                      ? <Spinner className="h-4 w-4" />
                      : <span className="text-xs text-green-500 font-medium">Add →</span>
                    }
                  </div>
                  {list.store && <p className="text-xs text-gray-600 mb-1.5">🏪 {list.store.name}</p>}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-600">{list.checked_items}/{list.total_items}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={lbl}>List Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className={input} />
          </div>
          <div>
            <label className={lbl}>Store <span className="text-gray-600 font-normal">(for aisle sorting)</span></label>
            <select value={storeId} onChange={e => setStoreId(e.target.value ? Number(e.target.value) : "")} className={input}>
              <option value="">No store</option>
              {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-600">
            <span className="text-gray-400 font-medium">{recipeName}</span> will be added automatically.
          </p>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
          >
            {createMut.isPending ? "Creating…" : "Create & Add Recipe"}
          </button>
        </form>
      )}
    </Modal>
  );
}
