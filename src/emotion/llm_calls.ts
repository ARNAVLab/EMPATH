// LLM calls used by the emotion layer: the appraisal step and the
// manipulation check. Both run on the judge model (temperature 0).
import { Appraisal, EmotionLabel } from "./model";
import { throttle } from "../lib/throttle";

function textOf(res: any): string {
  const s = typeof res?.content === "string" ? res.content : String(res?.content ?? "");
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();
}

const num = (x: any, lo: number, hi: number) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0;
};

export async function appraise(
  llm: any,
  topic: string,
  agentName: string,
  agentOpinion: number,
  message: string
): Promise<Appraisal> {
  const prompt = `You are rating how a message in a group debate affects one participant.

Topic: "${topic}"
Participant: ${agentName}. Their current position on the topic is ${agentOpinion} on a scale from -1 (strongly disagree) to 1 (strongly agree).

Message the participant just heard:
"""${message}"""

Rate the message from the participant's point of view. Reply with only a JSON object:
{"congruence": <number from -1 (attacks their position) to 1 (supports their position)>, "targetedness": <number from 0 (aimed at the whole group) to 1 (aimed at them personally)>, "certainty": <number from 0 (tentative) to 1 (forceful and confident)>, "coping": <number from 0 (the participant has no good answer to it) to 1 (the participant can easily counter it)>}`;
  try {
    await throttle();
    const out = textOf(await llm.invoke(prompt));
    const m = out.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : {};
    return {
      congruence: num(j.congruence, -1, 1),
      targetedness: num(j.targetedness, 0, 1),
      certainty: num(j.certainty, 0, 1),
      coping: j.coping === undefined ? 0.5 : num(j.coping, 0, 1),
    };
  } catch (err) {
    console.log("[appraise] failed, using neutral appraisal", err);
    return { congruence: 0, targetedness: 0, certainty: 0, coping: 0.5 };
  }
}

const LABELS: EmotionLabel[] = ["anger", "anxiety", "enthusiasm", "calm"];

export async function classifyEmotion(llm: any, message: string): Promise<EmotionLabel | null> {
  const prompt = `Which emotion does the following message express most strongly?
Choose exactly one: anger, anxiety, enthusiasm, calm.

Message:
"""${message}"""

Reply with only the one word.`;
  try {
    await throttle();
    const out = textOf(await llm.invoke(prompt)).toLowerCase();
    return LABELS.find((l) => out.includes(l)) ?? null;
  } catch (err) {
    console.log("[classifyEmotion] failed", err);
    return null;
  }
}

// Study 1: rate the emotion a message expresses on the three VAD scales.
export async function rateVAD(
  llm: any,
  message: string
): Promise<{ valence: number; arousal: number; dominance: number; intensity: number } | null> {
  const prompt = `Rate the emotion expressed in the following message.

Message:
"""${message}"""

Reply with only a JSON object:
{"valence": <-1 (very unpleasant) to 1 (very pleasant)>, "arousal": <-1 (very calm) to 1 (very worked up)>, "dominance": <-1 (overwhelmed, submissive) to 1 (in control, assertive)>, "intensity": <0 (no emotion) to 1 (overwhelming emotion)>}`;
  try {
    await throttle();
    const out = textOf(await llm.invoke(prompt));
    const m = out.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : null;
    if (!j) return null;
    return {
      valence: num(j.valence, -1, 1),
      arousal: num(j.arousal, -1, 1),
      dominance: num(j.dominance, -1, 1),
      intensity: num(j.intensity, 0, 1),
    };
  } catch (err) {
    console.log("[rateVAD] failed", err);
    return null;
  }
}
