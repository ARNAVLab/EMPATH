// EMPATH emotion model: state, VAD mapping, and the per-turn update rule.
// See docs/EMOTION_MODEL.md and the EMPATH Project Plan.

export type EmotionLabel = "anger" | "anxiety" | "enthusiasm" | "calm";
export type EmotionCondition = "off" | "on" | "frozen" | "random";
export type EmotionFormat = "label" | "vad" | "description";
export type StartMood = "calm" | "excited" | "angry";
export type Regulation = "high" | "medium" | "low";

export interface EmotionState {
  label: EmotionLabel;
  intensity: number; // 0..1
  vad: [number, number, number]; // valence, arousal, dominance in -1..1
}

export interface Appraisal {
  congruence: number; // -1 (attacks my position) .. 1 (supports it)
  targetedness: number; // 0 (aimed at the group) .. 1 (aimed at me)
  certainty: number; // 0 (tentative) .. 1 (forceful)
}

export interface EmotionConfig {
  condition: EmotionCondition;
  format: EmotionFormat;
  startMood: StartMood;
  emotionOnly: boolean; // Study 2: no personality prompt
  manipulationCheck: boolean; // classify the emotion each message expresses
}

// VAD anchor for each label at full intensity.
export const ANCHORS: Record<EmotionLabel, [number, number, number]> = {
  anger: [-0.7, 0.8, 0.6],
  anxiety: [-0.6, 0.7, -0.6],
  enthusiasm: [0.8, 0.7, 0.5],
  calm: [0.0, -0.5, 0.0],
};

// Decay (lambda) and gain (gamma) per regulation level.
export const REGULATION: Record<Regulation, { lambda: number; gamma: number }> = {
  high: { lambda: 0.5, gamma: 0.3 },
  medium: { lambda: 0.7, gamma: 0.5 },
  low: { lambda: 0.85, gamma: 0.7 },
};

export const CONTAGION = 0.2;
const CALM_FLOOR = 0.1; // below this intensity the agent counts as calm

const clip = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

export function makeState(label: EmotionLabel, intensity: number): EmotionState {
  const s = label === "calm" ? 1 : clip(intensity);
  const [v, a, d] = ANCHORS[label];
  return {
    label,
    intensity: label === "calm" ? 0 : round2(s),
    vad: [round2(v * s), round2(a * s), round2(d * s)],
  };
}

export function initialState(mood: StartMood): EmotionState {
  if (mood === "excited") return makeState("enthusiasm", 0.7);
  if (mood === "angry") return makeState("anger", 0.7);
  return makeState("calm", 0);
}

export function randomState(): EmotionState {
  const labels: EmotionLabel[] = ["anger", "anxiety", "enthusiasm", "calm"];
  const label = labels[Math.floor(Math.random() * labels.length)];
  return makeState(label, label === "calm" ? 0 : 0.2 + Math.random() * 0.8);
}

const family = (l: EmotionLabel) =>
  l === "anger" || l === "anxiety" ? "negative" : l === "enthusiasm" ? "positive" : "neutral";

// One turn of the appraisal update.
export function updateState(
  prev: EmotionState,
  appraisal: Appraisal,
  speaker: EmotionState | null,
  regulation: Regulation
): EmotionState {
  const { lambda, gamma } = REGULATION[regulation];
  const c = clip(appraisal.congruence, -1, 1);
  const t = clip(appraisal.targetedness);
  const k = clip(appraisal.certainty);

  let target: EmotionLabel | null = null;
  if (c < -0.3 && t >= 0.5) target = "anger";
  else if (c < -0.3 && k >= 0.5) target = "anxiety";
  else if (c > 0.3) target = "enthusiasm";

  // No strong appraisal: current emotion fades.
  if (target === null) {
    if (prev.label === "calm") return makeState("calm", 0);
    const s = lambda * prev.intensity;
    return s < CALM_FLOOR ? makeState("calm", 0) : makeState(prev.label, s);
  }

  // Same emotion builds on itself; a new emotion starts fresh.
  const carried = target === prev.label ? lambda * prev.intensity : 0;
  const contagion =
    speaker && speaker.label !== "calm" && family(speaker.label) === family(target)
      ? CONTAGION * speaker.intensity
      : 0;
  const s = clip(carried + gamma * Math.abs(c) * k + contagion);
  return s < CALM_FLOOR ? makeState("calm", 0) : makeState(target, s);
}
