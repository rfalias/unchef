import { useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore, useUpdateStore, useCreateAisle, useUpdateAisle, useDeleteAisle, useReorderAisles } from "../hooks/useStores";
import { aiSuggestKeywords } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import KeywordEditor from "../components/stores/KeywordEditor";
import Spinner from "../components/ui/Spinner";
import type { Aisle } from "../types";

function SortableAisleRow({ aisle, storeId, storeName, onDelete }: { aisle: Aisle; storeId: number; storeName: string; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: aisle.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(aisle.name);
  const [keywords, setKeywords] = useState<string[]>(aisle.keywords);
  const [expanded, setExpanded] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const updateMut = useUpdateAisle(storeId);

  const save = async () => {
    await updateMut.mutateAsync({ aisleId: aisle.id, body: { name, keywords } });
    setEditing(false);
    toast.success("Aisle updated.");
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    setSuggestions(null);
    setExpanded(true);
    try {
      const kws = await aiSuggestKeywords(aisle.name, storeName);
      setSuggestions(kws.filter(k => !keywords.includes(k)));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Failed to get suggestions.");
    } finally {
      setSuggesting(false);
    }
  };

  const addSuggestion = (kw: string) => {
    const next = [...keywords, kw];
    setKeywords(next);
    setSuggestions(s => s?.filter(k => k !== kw) ?? null);
    updateMut.mutate({ aisleId: aisle.id, body: { keywords: next } });
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-800 border border-gray-700 rounded-lg mb-2">
      <div className="flex items-center gap-2 p-3">
        <button {...attributes} {...listeners}
          className="text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing px-1 text-lg">
          ⠿
        </button>
        <span className="text-xs text-gray-600 w-6 text-center font-mono">{aisle.position}</span>
        {editing ? (
          <input value={name} onChange={e => setName(e.target.value)}
            className="flex-1 border border-gray-600 bg-gray-900 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        ) : (
          <span className="flex-1 font-medium text-gray-200 text-sm">{aisle.name}</span>
        )}
        <span className="text-xs text-gray-600">{aisle.keywords.length} kw</span>
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors">
          {expanded ? "▲" : "▼"}
        </button>
        {editing ? (
          <>
            <button onClick={save} className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded transition-colors">Save</button>
            <button onClick={() => { setEditing(false); setName(aisle.name); setKeywords(aisle.keywords); }}
              className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Cancel</button>
          </>
        ) : (
          <>
            {user?.has_claude_key && (
              <button onClick={handleSuggest} disabled={suggesting}
                title="Suggest keywords with AI"
                className="text-xs text-green-500 hover:text-green-400 px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-40 transition-colors">
                {suggesting ? "…" : "✨"}
              </button>
            )}
            <button onClick={() => { setEditing(true); setExpanded(true); }}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Edit</button>
            <button onClick={() => onDelete(aisle.id)}
              className="text-xs text-red-600 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">Delete</button>
          </>
        )}
      </div>
      {expanded && (
        <div className="px-10 pb-3 space-y-2">
          <p className="text-xs text-gray-500">Keywords — items matched to this aisle:</p>
          <KeywordEditor
            keywords={keywords}
            onChange={kws => {
              setKeywords(kws);
              if (!editing) updateMut.mutate({ aisleId: aisle.id, body: { keywords: kws } });
            }}
          />
          {suggestions !== null && suggestions.length > 0 && (
            <div>
              <p className="text-xs text-green-500 mb-1.5">✨ AI suggestions — click to add:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(kw => (
                  <button key={kw} onClick={() => addSuggestion(kw)}
                    className="text-xs px-2 py-0.5 rounded-full border border-green-800 text-green-400 hover:bg-green-900/40 transition-colors">
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions !== null && suggestions.length === 0 && (
            <p className="text-xs text-gray-600">All suggestions already added.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const storeId = Number(id);
  const { data: store, isLoading } = useStore(storeId);
  const storeName = store?.name ?? "";
  const updateStoreMut = useUpdateStore(storeId);
  const createAisleMut = useCreateAisle(storeId);
  const deleteAisleMut = useDeleteAisle(storeId);
  const reorderMut = useReorderAisles(storeId);
  const [newAisleName, setNewAisleName] = useState("");
  const [editingStore, setEditingStore] = useState(false);
  const [draftStoreName, setDraftStoreName] = useState("");
  const [draftStoreDesc, setDraftStoreDesc] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !store) return;
    const aisles = [...store.aisles];
    const oldIndex = aisles.findIndex(a => a.id === active.id);
    const newIndex = aisles.findIndex(a => a.id === over.id);
    const reordered = arrayMove(aisles, oldIndex, newIndex);
    await reorderMut.mutateAsync(reordered.map((a, i) => ({ id: a.id, position: i })));
  };

  const handleAddAisle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAisleName.trim()) return;
    await createAisleMut.mutateAsync({ name: newAisleName.trim(), keywords: [] });
    setNewAisleName("");
    toast.success("Aisle added.");
  };

  const handleDeleteAisle = async (aisleId: number) => {
    if (!confirm("Delete this aisle? Items assigned to it will become uncategorized.")) return;
    await deleteAisleMut.mutateAsync(aisleId);
    toast.success("Aisle deleted.");
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!store) return <div className="p-6 text-gray-500">Store not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {editingStore ? (
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (draftStoreName.trim()) {
              await updateStoreMut.mutateAsync({ name: draftStoreName.trim(), description: draftStoreDesc || undefined });
              toast.success("Store updated.");
            }
            setEditingStore(false);
          }}
          className="mb-6 space-y-2"
        >
          <input
            autoFocus
            value={draftStoreName}
            onChange={e => setDraftStoreName(e.target.value)}
            onKeyDown={e => e.key === "Escape" && setEditingStore(false)}
            placeholder="Store name"
            className="w-full text-2xl font-bold bg-transparent border-b-2 border-green-500 text-gray-100 focus:outline-none"
          />
          <input
            value={draftStoreDesc}
            onChange={e => setDraftStoreDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-sm bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors">Save</button>
            <button type="button" onClick={() => setEditingStore(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mb-6 group flex items-start gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{store.name}</h1>
            {store.description && <p className="text-gray-500 text-sm mt-0.5">{store.description}</p>}
          </div>
          <button
            onClick={() => { setDraftStoreName(store.name); setDraftStoreDesc(store.description ?? ""); setEditingStore(true); }}
            className="mt-1 text-xs text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-gray-700"
          >
            Edit
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-200">Aisles</h2>
        <p className="text-xs text-gray-600">Drag to reorder</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={store.aisles.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {store.aisles.map(aisle => (
            <SortableAisleRow key={aisle.id} aisle={aisle} storeId={storeId} storeName={storeName} onDelete={handleDeleteAisle} />
          ))}
        </SortableContext>
      </DndContext>

      {store.aisles.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-4">No aisles yet. Add your first aisle below.</p>
      )}

      <form onSubmit={handleAddAisle} className="flex gap-2 mt-4">
        <input
          value={newAisleName}
          onChange={e => setNewAisleName(e.target.value)}
          placeholder="New aisle name (e.g. Produce)"
          className="flex-1 border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button type="submit" disabled={createAisleMut.isPending}
          className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Add Aisle
        </button>
      </form>
    </div>
  );
}
