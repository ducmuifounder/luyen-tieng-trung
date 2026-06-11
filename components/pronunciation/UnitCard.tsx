import Link from "next/link";
import { PronunciationUnit, UserProgress } from "@/lib/types";

const STATUS_STYLE = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-yellow-100 text-yellow-700",
  passed: "bg-green-100 text-green-700",
};

const STATUS_LABEL = {
  not_started: "Chưa học",
  in_progress: "Đang học",
  passed: "Đã đạt",
};

interface Props {
  unit: PronunciationUnit;
  progress?: UserProgress;
}

export function UnitCard({ unit, progress }: Props) {
  const status = progress?.status ?? "not_started";
  const score = progress?.best_score ?? 0;

  return (
    <Link
      href={`/luyen-phat-am/${unit.id}`}
      className="group relative flex flex-col items-center gap-2 rounded-2xl border
                 border-gray-200 bg-white p-4 shadow-sm transition
                 hover:border-red-400 hover:shadow-md"
    >
      <span className="text-3xl font-bold tracking-wide text-gray-800 group-hover:text-red-600">
        {unit.name}
      </span>

      {progress && (
        <div className="w-full">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Điểm cao nhất</span>
            <span>{score.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
      >
        {STATUS_LABEL[status]}
      </span>
    </Link>
  );
}
