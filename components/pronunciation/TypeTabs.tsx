"use client";

import { PronunciationType } from "@/lib/types";

const TABS: { label: string; value: PronunciationType | "all" }[] = [
  { label: "Thanh mẫu", value: "initial" },
  { label: "Vận mẫu", value: "final" },
  { label: "Thanh điệu", value: "tone" },
];

interface Props {
  active: PronunciationType | "all";
  onChange: (v: PronunciationType | "all") => void;
}

export function TypeTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${
              active === tab.value
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
