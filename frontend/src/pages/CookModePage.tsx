import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecipe } from "../hooks/useRecipes";
import Spinner from "../components/ui/Spinner";

type Tab = "ingredients" | "steps";

function toggle(set: Set<number>, idx: number): Set<number> {
  const next = new Set(set);
  next.has(idx) ? next.delete(idx) : next.add(idx);
  return next;
}

export default function CookModePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading } = useRecipe(Number(id));
  const [tab, setTab] = useState<Tab>("ingredients");
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  // Screen wake lock — keep mobile screen on while cooking
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if ("wakeLock" in navigator) {
        try { lock = await (navigator as Navigator & { wakeLock: { request(t: string): Promise<WakeLockSentinel> } }).wakeLock.request("screen"); }
        catch {}
      }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!recipe) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center text-gray-500">
        Recipe not found.
      </div>
    );
  }

  const ingDoneCount = checkedIngredients.size;
  const stepDoneCount = checkedSteps.size;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-100 text-xl leading-none p-1 -ml-1"
            aria-label="Exit cook mode"
          >
            ←
          </button>
          <h1 className="flex-1 text-base font-semibold text-gray-100 truncate">{recipe.title}</h1>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab("ingredients")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "ingredients"
                ? "text-green-400 border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Ingredients
            {ingDoneCount > 0 && (
              <span className="ml-1.5 text-xs text-gray-600">
                {ingDoneCount}/{recipe.ingredients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("steps")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "steps"
                ? "text-green-400 border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Steps
            {stepDoneCount > 0 && (
              <span className="ml-1.5 text-xs text-gray-600">
                {stepDoneCount}/{recipe.instructions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "ingredients" ? (
          <ul className="divide-y divide-gray-800">
            {recipe.ingredients.map((ing, i) => {
              const prevSection = i > 0 ? recipe.ingredients[i - 1].section : undefined;
              const showHeader = ing.section && ing.section !== prevSection;
              const checked = checkedIngredients.has(i);
              return (
                <li key={i}>
                  {showHeader && (
                    <div className="px-5 pt-4 pb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {ing.section}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setCheckedIngredients(s => toggle(s, i))}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-opacity active:bg-gray-800/60 ${
                      checked ? "opacity-35" : "opacity-100"
                    }`}
                  >
                    {/* Checkbox circle */}
                    <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      checked ? "border-green-600 bg-green-600" : "border-gray-600"
                    }`}>
                      {checked && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`flex-1 min-w-0 ${checked ? "line-through" : ""}`}>
                      <span className="block text-base text-gray-100 font-medium leading-snug">
                        {[ing.amount, ing.unit].filter(Boolean).join(" ")
                          ? <><span className="text-gray-400 font-normal">{[ing.amount, ing.unit].filter(Boolean).join(" ")} </span>{ing.name}</>
                          : ing.name}
                      </span>
                      {ing.notes && (
                        <span className="block text-sm text-gray-500 italic mt-0.5">{ing.notes}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ol className="p-4 space-y-3">
            {recipe.instructions.map((step, i) => {
              const checked = checkedSteps.has(i);
              return (
                <li key={i}>
                  <button
                    onClick={() => setCheckedSteps(s => toggle(s, i))}
                    className={`w-full flex gap-4 items-start p-4 rounded-xl border text-left transition-all active:scale-[0.99] ${
                      checked
                        ? "border-gray-800 bg-gray-900/40 opacity-40"
                        : "border-gray-700 bg-gray-900"
                    }`}
                  >
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      checked ? "bg-gray-700 text-gray-500" : "bg-green-700 text-white"
                    }`}>
                      {checked ? "✓" : i + 1}
                    </span>
                    <p className={`flex-1 text-sm text-gray-200 leading-relaxed pt-0.5 ${checked ? "line-through text-gray-500" : ""}`}>
                      {step}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
