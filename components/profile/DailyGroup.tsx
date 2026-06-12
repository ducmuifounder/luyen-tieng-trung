import { PracticeCard } from "./PracticeCard";

interface DailyItem {
  item_id:        string;
  level:          number;
  highest_score:  number;
  attempt_count:  number;
  breakdown?:     Array<{ text: string; score: number }>;
}

interface Props {
  date:  string; // YYYY-MM-DD
  items: DailyItem[];
}

function formatDate(dateStr: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dateStr === today)     return "Hôm nay";
  if (dateStr === yesterday) return "Hôm qua";

  const [y, m, d] = dateStr.split("-");
  return `Ngày ${d}/${m}/${y}`;
}

export function DailyGroup({ date, items }: Props) {
  const avgScore = items.reduce((s, i) => s + i.highest_score, 0) / items.length;

  return (
    <div>
      {/* Tiêu đề ngày */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">{formatDate(date)}</h3>
        <span className="text-xs text-gray-400">
          TB {avgScore.toFixed(0)}đ · {items.length} mục
        </span>
      </div>

      {/* Danh sách item */}
      <div className="space-y-2">
        {items.map((item) => (
          <PracticeCard
            key={`${item.item_id}-${date}`}
            itemId={item.item_id}
            level={item.level}
            highestScore={item.highest_score}
            attemptCount={item.attempt_count}
            breakdown={item.breakdown}
          />
        ))}
      </div>
    </div>
  );
}
