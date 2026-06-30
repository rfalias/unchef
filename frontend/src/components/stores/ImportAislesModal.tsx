import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import { parseAislesAI, createAisle, type AisleSuggestion } from "../../api/stores";
import KeywordEditor from "./KeywordEditor";

type Tab = "text" | "image";

interface Props {
  storeId: number;
  onClose: () => void;
}

function SuggestionRow({
  s,
  onChange,
  onRemove,
}: {
  s: AisleSuggestion;
  onChange: (s: AisleSuggestion) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-gray-700 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={s.name}
          onChange={e => onChange({ ...s, name: e.target.value })}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Aisle name"
        />
        <button
          onClick={onRemove}
          className="text-gray-700 hover:text-red-400 text-sm px-1 transition-colors"
          title="Remove this aisle"
        >✕</button>
      </div>
      <KeywordEditor keywords={s.keywords} onChange={kws => onChange({ ...s, keywords: kws })} />
    </div>
  );
}

export default function ImportAislesModal({ storeId, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [parseProgress, setParseProgress] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AisleSuggestion[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseMut = useMutation({
    mutationFn: async () => {
      const h = hint.trim() || undefined;
      if (tab === "text") {
        if (!text.trim()) throw new Error("Enter some aisle information.");
        return parseAislesAI(storeId, { text: text.trim(), hint: h });
      } else {
        if (imageFiles.length === 0) throw new Error("Select at least one image.");
        setParseProgress(`Parsing 0 / ${imageFiles.length}…`);
        let completed = 0;
        const results = await Promise.all(
          imageFiles.map(async file => {
            const b64 = await fileToBase64(file);
            const aisles = await parseAislesAI(storeId, {
              image_b64: b64,
              image_media_type: "image/jpeg",
              hint: h,
            });
            completed++;
            setParseProgress(`Parsing ${completed} / ${imageFiles.length}…`);
            return aisles;
          })
        );
        setParseProgress(null);
        return results.flat();
      }
    },
    onSuccess: data => setSuggestions(data),
    onError: (e: { response?: { data?: { detail?: string } }; message?: string }) => {
      setParseProgress(null);
      toast.error(e.response?.data?.detail ?? e.message ?? "Parse failed.");
    },
  });

  const createMut = useMutation({
    mutationFn: async (aisles: AisleSuggestion[]) => {
      for (const a of aisles) {
        if (a.name.trim()) {
          await createAisle(storeId, { name: a.name.trim(), keywords: a.keywords });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store", storeId] });
      toast.success(`${suggestions?.filter(s => s.name.trim()).length ?? 0} aisles created.`);
      onClose();
    },
    onError: () => toast.error("Failed to create some aisles."),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  };

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, j) => j !== i));
    setImagePreviews(prev => prev.filter((_, j) => j !== i));
  };

  const updateSuggestion = (i: number, s: AisleSuggestion) =>
    setSuggestions(prev => prev ? prev.map((x, j) => j === i ? s : x) : prev);

  const removeSuggestion = (i: number) =>
    setSuggestions(prev => prev ? prev.filter((_, j) => j !== i) : prev);

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      tab === t
        ? "bg-gray-800 text-gray-100 border-b-2 border-green-500"
        : "text-gray-500 hover:text-gray-300"
    }`;

  const canParse = tab === "text" ? text.trim().length > 0 : imageFiles.length > 0;

  return (
    <Modal title="Import Aisles with AI" onClose={onClose}>
      {suggestions === null ? (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-700">
            <button className={tabCls("text")} onClick={() => setTab("text")}>Paste Text</button>
            <button className={tabCls("image")} onClick={() => setTab("image")}>Upload Images</button>
          </div>

          {tab === "text" ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Paste aisle names, a store directory, signage text, or anything describing your store's layout.
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={8}
                placeholder={`Example:\nAisle 1 – Produce: fruits, vegetables\nAisle 2 – Dairy: milk, cheese, yogurt\nAisle 3 – Bread & Bakery`}
                className="w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Upload photos of aisle signs. All images are parsed in parallel and merged into one list.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt={`Image ${i + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-900/80 text-gray-400 hover:text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="h-24 border-2 border-dashed border-gray-700 hover:border-green-700 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center"
                  >
                    + Add more
                  </button>
                </div>
              )}
              {imagePreviews.length === 0 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-700 hover:border-green-700 rounded-xl py-8 text-sm text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Click to select images
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Additional context <span className="text-gray-700">(optional)</span>
            </label>
            <textarea
              value={hint}
              onChange={e => setHint(e.target.value)}
              rows={2}
              placeholder={`e.g. "Each sign shows aisle number and category. Ignore the sale banners."`}
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <button
            onClick={() => parseMut.mutate()}
            disabled={parseMut.isPending || !canParse}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:text-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {parseMut.isPending
              ? (parseProgress ?? "Parsing with AI…")
              : imageFiles.length > 1
                ? `Parse ${imageFiles.length} Images`
                : "Parse Aisles"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {suggestions.length} aisle{suggestions.length !== 1 ? "s" : ""} found — edit before creating.
            </p>
            <button onClick={() => setSuggestions(null)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ← Back
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {suggestions.map((s, i) => (
              <SuggestionRow
                key={i}
                s={s}
                onChange={updated => updateSuggestion(i, updated)}
                onRemove={() => removeSuggestion(i)}
              />
            ))}
          </div>

          {suggestions.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-4">All aisles removed.</p>
          )}

          <button
            onClick={() => createMut.mutate(suggestions)}
            disabled={createMut.isPending || suggestions.filter(s => s.name.trim()).length === 0}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:text-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {createMut.isPending
              ? "Creating…"
              : `Create ${suggestions.filter(s => s.name.trim()).length} Aisles`}
          </button>
        </div>
      )}
    </Modal>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.85);
      resolve(data.split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
