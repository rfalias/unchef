import { useState } from "react";

const KEY = "prefer_metric";

export function useMetricUnits() {
  const [metric, setMetric] = useState(() => localStorage.getItem(KEY) === "true");

  const toggle = () => {
    const next = !metric;
    localStorage.setItem(KEY, String(next));
    setMetric(next);
  };

  return { metric, toggle };
}
