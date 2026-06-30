import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useShoppingList, usePatchItem, useAddItem, useDeleteItem, useArchiveShoppingList, useUpdateShoppingList } from "../hooks/useShoppingLists";
import { useStore } from "../hooks/useStores";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import type { AisleGroup, ShoppingListItem, Aisle } from "../types";

function ItemRow({ item, listId, aisles, isAdmin }: { item: ShoppingListItem; listId: number; aisles: Aisle[]; isAdmin: boolean }) {
  const patchMut = usePatchItem(listId);
  const deleteMut = useDeleteItem(listId);
  const [showOverride, setShowOverride] = useState(false);

  const toggle = () => patchMut.mutate({ itemId: item.id, body: { is_checked: !item.is_checked } });
  const setAisle = (aisleId: number | null) => {
    patchMut.mutate({ itemId: item.id, body: { aisle_override_id: aisleId } });
    setShowOverride(false);
    toast.success("Aisle updated.");
  };

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/60 group transition-colors ${item.is_checked ? "opacity-40" : ""}`}>
      <input type="checkbox" checked={item.is_checked} onChange={toggle}
        className="w-4 h-4 rounded accent-green-500 cursor-pointer shrink-0" />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.is_checked ? "line-through text-gray-600" : "text-gray-200"}`}>
          {item.name}
        </span>
        {(item.amount || item.unit) && (
          <span className="text-xs text-gray-600 ml-2">
            {[item.amount, item.unit].filter(Boolean).join(" ")}
          </span>
        )}
        {item.notes && <span className="text-xs text-gray-700 italic ml-1">({item.notes})</span>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {aisles.length > 0 && (
          <button
            onClick={() => setShowOverride(true)}
            className="text-xs text-gray-600 hover:text-gray-400 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
          >
            {item.aisle_override_id ? "📍" : "aisle"}
          </button>
        )}
        {isAdmin && (
          <button onClick={() => deleteMut.mutate(item.id)}
            className="text-xs text-gray-700 hover:text-red-400 px-1 transition-colors">✕</button>
        )}
      </div>

      {showOverride && (
        <Modal title={`Move "${item.name}"`} onClose={() => setShowOverride(false)}>
          <div className="space-y-1">
            <button
              onClick={() => setAisle(null)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                !item.aisle_override_id
                  ? "bg-green-900/30 text-green-400 border border-green-800"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              <span className="font-medium">Auto-match</span>
              <span className="text-xs text-gray-600 ml-2">let the system decide</span>
            </button>
            <div className="border-t border-gray-800 my-2" />
            {aisles.map(a => (
              <button
                key={a.id}
                onClick={() => setAisle(a.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  item.aisle_override_id === a.id
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function AisleGroupSection({ group, listId, aisles, isAdmin }: { group: AisleGroup; listId: number; aisles: Aisle[]; isAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const checkedCount = group.items.filter(i => i.is_checked).length;
  const allDone = checkedCount === group.items.length;

  return (
    <div className="mb-4">
      <button onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 w-full text-left mb-1 py-1 group">
        <span className={`text-xs font-semibold uppercase tracking-wider ${allDone ? "text-gray-600 line-through" : "text-gray-400"}`}>
          {group.aisle ? group.aisle.name : "Uncategorized"}
        </span>
        <span className="text-xs text-gray-700">{checkedCount}/{group.items.length}</span>
        <span className="ml-auto text-gray-700 text-xs">{collapsed ? "▶" : "▼"}</span>
      </button>
      {!collapsed && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {group.items.map(item => <ItemRow key={item.id} item={item} listId={listId} aisles={aisles} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

export default function ShoppingListDetailPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const navigate = useNavigate();
  const { data: list, isLoading } = useShoppingList(listId);
  const { data: storeData } = useStore(list?.store?.id ?? 0);
  const archiveMut = useArchiveShoppingList();
  const updateMut = useUpdateShoppingList(listId);
  const addItemMut = useAddItem(listId);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addItemMut.mutateAsync({ name: newName.trim(), amount: newAmount || undefined, unit: newUnit || undefined });
    setNewName("");
    setNewAmount("");
    setNewUnit("");
    setShowAddItem(false);
  };

  const handleArchive = async () => {
    await archiveMut.mutateAsync(listId);
    toast.success(list?.is_archived ? "List unarchived." : "List archived.");
    navigate("/shopping-lists");
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!list) return <div className="p-6 text-gray-500">List not found.</div>;

  const allAisles: Aisle[] = storeData?.aisles ?? [];
  const pct = list.total_items > 0 ? Math.round((list.checked_items / list.total_items) * 100) : 0;

  const inputCls = "border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          {editingName ? (
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (draftName.trim()) await updateMut.mutateAsync({ name: draftName.trim() });
                setEditingName(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => e.key === "Escape" && setEditingName(false)}
                className="text-2xl font-bold bg-transparent border-b-2 border-green-500 text-gray-100 focus:outline-none w-full"
              />
              <button type="submit" className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded">Save</button>
              <button type="button" onClick={() => setEditingName(false)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700">Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => { setDraftName(list.name); setEditingName(true); }}
              className="text-2xl font-bold text-gray-100 hover:text-gray-300 text-left transition-colors"
              title="Click to rename"
            >
              {list.name}
            </button>
          )}
          {list.store && <p className="text-sm text-gray-500 mt-0.5">🏪 {list.store.name}</p>}
          {list.recipes.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              From: {list.recipes.map(r => r.title).join(", ")}
            </p>
          )}
        </div>
        <button onClick={handleArchive}
          className="border border-gray-700 text-gray-400 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800 transition-colors">
          {list.is_archived ? "Unarchive" : "Archive"}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-gray-300">{list.checked_items}/{list.total_items} items</span>
        <span className="text-sm text-gray-600">{pct}%</span>
      </div>

      {list.aisle_groups.map((group) => (
        <AisleGroupSection key={group.aisle?.id ?? "null"} group={group} listId={listId} aisles={allAisles} isAdmin={isAdmin} />
      ))}

      <div className="mt-4">
        {showAddItem ? (
          <form onSubmit={handleAddItem} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-2">
            <input required value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Item name" className={"w-full " + inputCls} />
            <div className="flex gap-2">
              <input value={newAmount} onChange={e => setNewAmount(e.target.value)}
                placeholder="Amount" className={"w-24 " + inputCls} />
              <input value={newUnit} onChange={e => setNewUnit(e.target.value)}
                placeholder="Unit" className={"w-24 " + inputCls} />
              <button type="submit"
                className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
                Add
              </button>
              <button type="button" onClick={() => setShowAddItem(false)}
                className="border border-gray-700 text-gray-400 px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddItem(true)}
            className="w-full border border-dashed border-gray-700 text-gray-600 py-3 rounded-xl text-sm hover:border-green-700 hover:text-green-500 transition-colors">
            + Add item
          </button>
        )}
      </div>
    </div>
  );
}
