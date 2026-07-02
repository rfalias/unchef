import { Outlet, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import publicClient from "../api/publicClient";

interface PublicBranding {
  app_name: string;
  app_icon: string;
  theme_palette: string;
  theme_accent: string;
  theme_muted: string;
}

const DEFAULTS: PublicBranding = {
  app_name: "Uninspired Chef",
  app_icon: "🥗",
  theme_palette: "charcoal",
  theme_accent: "green",
  theme_muted: "default",
};

function applyTheme({ theme_palette, theme_accent, theme_muted }: PublicBranding) {
  const html = document.documentElement;
  theme_palette !== "charcoal" ? (html.dataset.palette = theme_palette) : delete html.dataset.palette;
  theme_accent !== "green"     ? (html.dataset.accent = theme_accent)   : delete html.dataset.accent;
  theme_muted !== "default"    ? (html.dataset.muted = theme_muted)     : delete html.dataset.muted;
}

export default function PublicLayout() {
  const [branding, setBranding] = useState<PublicBranding>(DEFAULTS);

  useEffect(() => {
    applyTheme(DEFAULTS);
    publicClient.get<PublicBranding>("/public/branding")
      .then(r => { setBranding(r.data); applyTheme(r.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{branding.app_icon}</span>
          <span className="font-bold text-gray-100">{branding.app_name}</span>
        </div>
        <Link to="/login" className="text-sm text-green-500 hover:text-green-400 transition-colors">
          Log in →
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
