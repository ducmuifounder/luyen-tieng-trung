export type PronunciationType = "initial" | "final" | "tone";
export type MasteryStatus = "not_started" | "in_progress" | "passed";

export interface PronunciationUnit {
  id: string;
  name: string;
  type: PronunciationType;
  display_order: number;
  overview: string | null;
  lip_tip: string | null;
  tongue_tip: string | null;
  correction_guide: string | null;
  audio_url: string | null;
  video_url: string | null;
}

export interface UserProgress {
  unit_id: string;
  best_score: number;
  attempt_count: number;
  status: MasteryStatus;
}
