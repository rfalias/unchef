import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useStores, useCreateStore, useDeleteStore } from "../hooks/useStores";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";

const input = "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const label = "block text-sm font-medium text-gray-300 mb-1";

export default function StoresPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: stores, isLoading } = useStores();
  const createMut = useCreateStore();
  const deleteMut = useDeleteStore();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ name, description: description || undefined });
      toast.success("Store created!");
      setShowModal(false);
      setName("");
      setDescription("");
    } catch {
      toast.error("Failed to create store.");
    }
  };

  const handleDelete = async (id: number, storeName: string) => {
    if (!confirm(`Delete "${storeName}"?`)) return;
    await deleteMut.mutateAsync(id);
    toast.success("Store deleted.");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Stores</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Store
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !stores?.length ? (
        <EmptyState icon="🏪" title="No stores yet" body="Add your grocery store to configure aisles." />
      ) : (
        <div className="space-y-3">
          {stores.map(store => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="block bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-750 rounded-xl p-4 flex items-center justify-between transition-colors group"
            >
              <div>
                <span className="font-semibold text-gray-100 group-hover:text-green-400 transition-colors">
                  {store.name}
                </span>
                {store.description && <p className="text-sm text-gray-500 mt-0.5">{store.description}</p>}
                <p className="text-xs text-gray-600 mt-1">{store.aisle_count} aisles</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">Manage Aisles →</span>
                {isAdmin && (
                  <button
                    onClick={e => { e.preventDefault(); handleDelete(store.id, store.name); }}
                    className="border border-red-900 text-red-400 px-3 py-1.5 rounded-lg text-sm hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Store" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className={label}>Store Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                className={input} placeholder="Whole Foods, Costco..." />
            </div>
            <div>
              <label className={label}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className={input} placeholder="Optional notes..." />
            </div>
            <button type="submit" disabled={createMut.isPending}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {createMut.isPending ? "Creating..." : "Create Store"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
