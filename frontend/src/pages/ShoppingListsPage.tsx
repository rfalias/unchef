import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useShoppingLists, useDeleteShoppingList } from "../hooks/useShoppingLists";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import CreateListModal from "../components/shopping/CreateListModal";
import type { ShoppingListSummary } from "../types";

function ListCard({ list, onDelete, isAdmin }: { list: ShoppingListSummary; onDelete: (id: number) => void; isAdmin: boolean }) {
  const pct = list.total_items > 0 ? Math.round((list.checked_items / list.total_items) * 100) : 0;
  return (
    <Link
      to={`/shopping-lists/${list.id}`}
      className="block bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-semibold text-gray-100 group-hover:text-green-400 transition-colors">{list.name}</span>
          {list.store && <p className="text-xs text-gray-500 mt-0.5">🏪 {list.store.name}</p>}
        </div>
        {isAdmin && (
          <button
            onClick={e => { e.preventDefault(); onDelete(list.id); }}
            className="text-gray-700 hover:text-red-400 text-sm transition-colors"
          >✕</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-500">{list.checked_items}/{list.total_items}</span>
      </div>
    </Link>
  );
}

export default function ShoppingListsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: active, isLoading } = useShoppingLists(false);
  const { data: archived } = useShoppingLists(true);
  const deleteMut = useDeleteShoppingList();
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this shopping list?")) return;
    await deleteMut.mutateAsync(id);
    toast.success("List deleted.");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Shopping Lists</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New List
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !active?.length ? (
        <EmptyState icon="🛒" title="No shopping lists" body="Create a list from your saved recipes."
          action={
            <button onClick={() => setShowModal(true)}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              New Shopping List
            </button>
          }
        />
      ) : (
        <div className="space-y-3 mb-8">
          {active.map(list => <ListCard key={list.id} list={list} onDelete={handleDelete} isAdmin={isAdmin} />)}
        </div>
      )}

      {!!archived?.length && (
        <div>
          <h2 className="text-lg font-semibold text-gray-600 mb-3">Archived</h2>
          <div className="space-y-3 opacity-50">
            {archived.map(list => <ListCard key={list.id} list={list} onDelete={handleDelete} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}

      {showModal && <CreateListModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
