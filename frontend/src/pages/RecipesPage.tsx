import { useState } from "react";
import { Link } from "react-router-dom";
import { useRecipes } from "../hooks/useRecipes";
import RecipeCard from "../components/recipes/RecipeCard";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

export default function RecipesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useRecipes(search || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Recipes</h1>
        <div className="flex gap-2">
          <Link to="/recipes/import"
            className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 hover:text-gray-100 transition-colors">
            🔗 Import URL
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search recipes..."
          className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button type="submit"
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setQ(""); setSearch(""); }}
            className="text-sm text-gray-500 hover:text-gray-300 px-2">
            Clear
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !data?.items.length ? (
        <EmptyState
          icon="📖"
          title="No recipes yet"
          body="Import from a URL or create one manually."
          action={
            <Link to="/recipes/import"
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Import a Recipe
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.items.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
        </div>
      )}
    </div>
  );
}
