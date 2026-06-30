import { useState, type KeyboardEvent } from "react";

interface Props {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export default function KeywordEditor({ keywords, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim().toLowerCase();
    if (val && !keywords.includes(val)) {
      onChange([...keywords, val]);
    }
    setInput("");
  };

  const remove = (kw: string) => onChange(keywords.filter(k => k !== kw));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && keywords.length) {
      remove(keywords[keywords.length - 1]);
    }
  };

  return (
    <div className="border border-gray-600 bg-gray-800 rounded-lg p-2 flex flex-wrap gap-1 min-h-10 cursor-text"
      onClick={() => document.getElementById("kw-input")?.focus()}>
      {keywords.map(kw => (
        <span key={kw} className="inline-flex items-center gap-1 bg-green-900/50 text-green-400 text-xs px-2 py-0.5 rounded-full">
          {kw}
          <button type="button" onClick={() => remove(kw)} className="text-green-600 hover:text-green-300 font-bold leading-none">&times;</button>
        </span>
      ))}
      <input
        id="kw-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={keywords.length === 0 ? "Type keywords, press Enter or comma..." : ""}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent text-gray-200 placeholder-gray-600"
      />
    </div>
  );
}
