import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getBranding, updateBranding, type AppBranding } from "../api/appSettings";
import { useAuth } from "../auth/AuthContext";

interface BrandingContextValue {
  branding: AppBranding;
  saveBranding: (b: Partial<AppBranding>) => Promise<void>;
}

const DEFAULTS: AppBranding = { app_name: "Food App", app_icon: "🥗" };

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULTS,
  saveBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<AppBranding>(DEFAULTS);

  useEffect(() => {
    if (!user) return;
    getBranding().then(setBranding).catch(() => {});
  }, [user]);

  const saveBranding = useCallback(async (b: Partial<AppBranding>) => {
    const updated = await updateBranding(b);
    setBranding(updated);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, saveBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
