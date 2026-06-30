import { useState } from "react";
import toast from "react-hot-toast";
import { aiParseIngredients } from "../../api/ai";
import { useAuth } from "../../auth/AuthContext";
import type { Recipe, RecipeCreate, IngredientItem } from "../../types";

interface Props {
  initial?: Partial<Recipe>;
  onSubmit: (data: RecipeCreate) => void;
  isPending?: boolean;
  submitLabel?: string;
}

const emptyIngredient = (): IngredientItem => ({ name: "", amount: null, unit: null, notes: null, section: null });

const input = "w-full border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
const label = "block text-sm font-medium text-gray-300 mb-1";
const smallInput = "border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

export default function RecipeForm({ initial, onSubmit, isPending, submitLabel = "Save Recipe" }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState(String(initial?.servings ?? ""));
  const [prepTime, setPrepTime] = useState(String(initial?.prep_time_minutes ?? ""));
  const [cookTime, setCookTime] = useState(String(initial?.cook_time_minutes ?? ""));
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [ingredients, setIngredients] = useState<IngredientItem[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initial?.instructions?.length ? initial.instructions : [""]
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  const updateIngredient = (i: number, field: keyof IngredientItem, value: string | null) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value || null } : ing));
  };
  const addIngredient = () => setIngredients(prev => [...prev, emptyIngredient()]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const updateInstruction = (i: number, value: string) => {
    setInstructions(prev => prev.map((s, idx) => idx === i ? value : s));
  };
  const addInstruction = () => setInstructions(prev => [...prev, ""]);
  const removeInstruction = (i: number) => setInstructions(prev => prev.filter((_, idx) => idx !== i));

  const handleAIParse = async () => {
    if (!pasteText.trim()) return;
    setAiParsing(true);
    try {
      const parsed = await aiParseIngredients(pasteText);
      setIngredients(parsed.map(i => ({ ...i, amount: i.amount ?? null, unit: i.unit ?? null, notes: i.notes ?? null })));
      setPasteOpen(false);
      setPasteText("");
      toast.success(`Parsed ${parsed.length} ingredients.`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "AI parsing failed.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      source_url: sourceUrl || null,
      image_url: imageUrl || null,
      servings: servings ? parseInt(servings) : null,
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      instructions: instructions.filter(s => s.trim()),
      ingredients: ingredients.filter(i => i.name.trim()),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={label}>Title *</label>
        <input required value={title} onChange={e => setTitle(e.target.value)} className={input} placeholder="Recipe title" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Servings</label>
          <input type="number" value={servings} onChange={e => setServings(e.target.value)} className={input} placeholder="4" />
        </div>
        <div>
          <label className={label}>Prep (min)</label>
          <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} className={input} placeholder="15" />
        </div>
        <div>
          <label className={label}>Cook (min)</label>
          <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value)} className={input} placeholder="30" />
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className={input} rows={2} placeholder="Brief description..." />
      </div>

      <div>
        <label className={label}>Tags (comma-separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} className={input} placeholder="italian, pasta, quick" />
      </div>

      <div>
        <label className={label}>Image URL</label>
        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={input} placeholder="https://..." />
      </div>

      <div>
        <label className={label}>Source URL</label>
        <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={input} placeholder="https://..." />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={label + " mb-0"}>Ingredients</label>
          <div className="flex items-center gap-3">
            {user?.has_claude_key && (
              <button type="button" onClick={() => setPasteOpen(o => !o)}
                className="text-xs text-green-500 hover:text-green-400 font-medium transition-colors">
                ✨ Paste &amp; Parse
              </button>
            )}
            <button type="button" onClick={addIngredient} className="text-xs text-green-400 hover:text-green-300 font-medium">+ Add</button>
          </div>
        </div>
        {pasteOpen && (
          <div className="mb-3 bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-500">Paste a raw ingredient list — AI will parse it into structured rows.</p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder={"2 cups all-purpose flour, sifted\n1 tsp salt\n3 large eggs\n1/2 cup butter, softened"}
              className={"w-full " + input + " font-mono text-xs"}
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleAIParse} disabled={aiParsing || !pasteText.trim()}
                className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                {aiParsing ? "Parsing…" : "Parse with AI"}
              </button>
              <button type="button" onClick={() => { setPasteOpen(false); setPasteText(""); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {ingredients.map((ing, i) => {
            const prevSection = i > 0 ? ingredients[i - 1].section : undefined;
            const showHeader = ing.section && ing.section !== prevSection;
            return (
              <div key={i}>
                {showHeader && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-2 pb-0.5">
                    {ing.section}
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <input value={ing.amount ?? ""} onChange={e => updateIngredient(i, "amount", e.target.value)}
                    className={"w-16 " + smallInput} placeholder="Amt" />
                  <input value={ing.unit ?? ""} onChange={e => updateIngredient(i, "unit", e.target.value)}
                    className={"w-16 " + smallInput} placeholder="Unit" />
                  <input value={ing.name} onChange={e => updateIngredient(i, "name", e.target.value)}
                    className={"flex-1 " + smallInput} placeholder="Ingredient name" />
                  <input value={ing.notes ?? ""} onChange={e => updateIngredient(i, "notes", e.target.value)}
                    className={"w-24 " + smallInput} placeholder="Notes" />
                  <input value={ing.section ?? ""} onChange={e => updateIngredient(i, "section", e.target.value || null)}
                    className={"w-24 " + smallInput} placeholder="Section" title="Section header (e.g. 'For the sauce')" />
                  <button type="button" onClick={() => removeIngredient(i)} className="text-gray-600 hover:text-red-400 text-lg leading-none">&times;</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={label + " mb-0"}>Instructions</label>
          <button type="button" onClick={addInstruction} className="text-xs text-green-400 hover:text-green-300 font-medium">+ Add step</button>
        </div>
        <div className="space-y-2">
          {instructions.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-2 text-xs text-gray-600 w-5 shrink-0 text-right">{i + 1}.</span>
              <textarea value={step} onChange={e => updateInstruction(i, e.target.value)}
                className={"flex-1 " + input} rows={2} placeholder="Step description..." />
              <button type="button" onClick={() => removeInstruction(i)} className="mt-1 text-gray-600 hover:text-red-400 text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-medium py-2.5 rounded-lg transition-colors">
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
