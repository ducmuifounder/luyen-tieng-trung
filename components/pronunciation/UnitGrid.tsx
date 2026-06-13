"use client";

import { useState } from "react";
import { PronunciationUnit, PronunciationType, UserProgress } from "@/lib/types";
import { TypeTabs } from "./TypeTabs";
import { UnitCard } from "./UnitCard";

interface Props {
  units: PronunciationUnit[];
  progressMap: Record<string, UserProgress>;
}

export function UnitGrid({ units, progressMap }: Props) {
  const [activeTab, setActiveTab] = useState<PronunciationType | "all">("initial");

  const filtered = units.filter((u) => u.type === activeTab);

  return (
    <div className="space-y-6">
      <TypeTabs active={activeTab} onChange={setActiveTab} />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400">Chưa có dữ liệu.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              progress={progressMap[unit.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
