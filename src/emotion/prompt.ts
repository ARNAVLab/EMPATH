// How an emotion state is presented to the agent: three formats (Study 1).
import { EmotionFormat, EmotionState } from "./model";

const DESCRIPTIONS: Record<string, [string, string]> = {
  anger: [
    "You're irritated and a bit impatient with the others.",
    "You're angry and worked up, and you want to push back hard.",
  ],
  anxiety: [
    "You feel uneasy and a little unsure of your footing.",
    "You feel anxious and on edge, worried you're losing this argument.",
  ],
  enthusiasm: [
    "You feel upbeat and interested in the conversation.",
    "You're excited and energized, eager to make your case.",
  ],
};

export const SHOW_RULE =
  "Let this feeling shape your tone, word choice, and how hard you push. Do not name the emotion or mention any numbers.";

export function emotionLine(state: EmotionState, format: EmotionFormat): string {
  if (format === "vad") {
    const [v, a, d] = state.vad;
    return (
      `Your current emotional state on three scales from -1 to 1: valence ${v} ` +
      `(negative is unpleasant, positive is pleasant), arousal ${a} ` +
      `(negative is calm, positive is worked up), dominance ${d} ` +
      `(negative is overwhelmed, positive is in control).`
    );
  }
  if (state.label === "calm") {
    return format === "label" ? "Right now you feel calm." : "You feel calm and settled.";
  }
  if (format === "label") {
    return `Right now you feel ${state.label} at intensity ${state.intensity} on a scale from 0 (barely) to 1 (overwhelming).`;
  }
  const [mild, strong] = DESCRIPTIONS[state.label];
  return state.intensity >= 0.5 ? strong : mild;
}

// Full block appended to the agent's system prompt.
export function emotionBlock(state: EmotionState, format: EmotionFormat): string {
  return `${emotionLine(state, format)} ${SHOW_RULE}`;
}
