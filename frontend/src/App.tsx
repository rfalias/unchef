import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import RecipeImportPage from "./pages/RecipeImportPage";
import RecipeEditPage from "./pages/RecipeEditPage";
import CookModePage from "./pages/CookModePage";
import StoresPage from "./pages/StoresPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import ShoppingListsPage from "./pages/ShoppingListsPage";
import ShoppingListDetailPage from "./pages/ShoppingListDetailPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDebugPage from "./pages/AdminDebugPage";
import SettingsPage from "./pages/SettingsPage";
import Spinner from "./components/ui/Spinner";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function PublicRoute({ element }: { element: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/recipes" replace />;
  return <>{element}</>;
}

function AdminRoute({ element }: { element: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/recipes" replace />;
  return <>{element}</>;
}

const router = createBrowserRouter([
  { path: "/login", element: <PublicRoute element={<LoginPage />} /> },
  { path: "/register", element: <PublicRoute element={<RegisterPage />} /> },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/recipes" replace /> },
      { path: "recipes", element: <RecipesPage /> },
      { path: "recipes/import", element: <RecipeImportPage /> },
      { path: "recipes/:id", element: <RecipeDetailPage /> },
      { path: "recipes/:id/edit", element: <RecipeEditPage /> },
      { path: "recipes/:id/cook", element: <CookModePage /> },
      { path: "stores", element: <StoresPage /> },
      { path: "stores/:id", element: <StoreDetailPage /> },
      { path: "shopping-lists", element: <ShoppingListsPage /> },
      { path: "shopping-lists/:id", element: <ShoppingListDetailPage /> },
      { path: "admin/users", element: <AdminRoute element={<AdminUsersPage />} /> },
      { path: "admin/debug", element: <AdminRoute element={<AdminDebugPage />} /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1f2937",
              color: "#f3f4f6",
              border: "1px solid #374151",
            },
          }}
        />
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
