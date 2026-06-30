import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getBranding, updateBranding, type AppBranding } from "../api/appSettings";
import { useAuth } from "../auth/AuthContext";

interface BrandingContextValue {
  branding: AppBranding;
  saveBranding: (b: Partial<AppBranding>) => Promise<void>;
}

const DEFAULTS: AppBranding = { app_name: "Uninspired Chef", app_icon: "🥗" };

function applyBranding({ app_name, app_icon }: AppBranding) {
  document.title = app_name;

  const link =
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
    (() => {
      const el = document.createElement("link");
      el.rel = "icon";
      document.head.appendChild(el);
      return el;
    })();

  if (app_icon.startsWith("data:")) {
    link.type = app_icon.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    link.href = app_icon;
  } else {
    // Render emoji onto a canvas and use as favicon
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "52px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(app_icon, 32, 36);
    link.type = "image/png";
    link.href = canvas.toDataURL();
  }
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULTS,
  saveBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<AppBranding>(DEFAULTS);

  useEffect(() => {
    applyBranding(DEFAULTS);
  }, []);

  useEffect(() => {
    if (!user) return;
    getBranding().then(b => { setBranding(b); applyBranding(b); }).catch(() => {});
  }, [user]);

  const saveBranding = useCallback(async (b: Partial<AppBranding>) => {
    const updated = await updateBranding(b);
    setBranding(updated);
    applyBranding(updated);
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
