// Tracks every agent's emotion across a conversation and produces the
// emotion block for each turn. One controller per simulation.
import {
  Appraisal,
  EmotionConfig,
  EmotionState,
  Regulation,
  initialState,
  randomState,
  updateState,
} from "./model";
import { emotionBlock } from "./prompt";
import { appraise, classifyEmotion } from "./llm_calls";

export interface EmotionRecord {
  condition: string;
  format: string;
  label: string;
  intensity: number;
  vad: [number, number, number];
  appraisal: Appraisal | null;
  regulation: Regulation;
  expressed?: string | null; // manipulation-check label
}

export class EmotionController {
  private states = new Map<string, EmotionState>();
  private opinions = new Map<string, number>();
  private regulation = new Map<string, Regulation>();
  private latest = new Map<string, EmotionRecord>();
  private turns = 0;

  constructor(
    public cfg: EmotionConfig,
    private order: string[], // speaking order (character names)
    characters: any[],
    private judgeLlm: any,
    private topic: string
  ) {
    for (const c of characters) {
      this.states.set(c.name, initialState(cfg.startMood));
      this.opinions.set(c.name, Number(c.opinion_strength ?? 0));
      this.regulation.set(c.name, (c.regulation as Regulation) ?? "medium");
    }
  }

  get active() {
    return this.cfg.condition !== "off";
  }

  // Called right before an agent speaks. Returns the text appended to its
  // system prompt ("" when emotion is off).
  async beforeTurn(name: string, lastMessage: string): Promise<string> {
    if (!this.active) return "";
    const prev = this.states.get(name)!;
    const reg = this.regulation.get(name) ?? "medium";
    let next = prev;
    let appraisal: Appraisal | null = null;

    if (this.cfg.condition === "random") {
      next = randomState();
    } else if (this.cfg.condition === "on" && this.turns > 0) {
      const i = this.order.indexOf(name);
      const speaker = this.order[(i - 1 + this.order.length) % this.order.length];
      appraisal = await appraise(
        this.judgeLlm,
        this.topic,
        name,
        this.opinions.get(name) ?? 0,
        lastMessage
      );
      next = updateState(prev, appraisal, this.states.get(speaker) ?? null, reg);
    }
    // "frozen" keeps the starting state for the whole conversation.

    this.states.set(name, next);
    this.turns += 1;
    this.latest.set(name, {
      condition: this.cfg.condition,
      format: this.cfg.format,
      label: next.label,
      intensity: next.intensity,
      vad: next.vad,
      appraisal,
      regulation: reg,
    });
    return emotionBlock(next, this.cfg.format);
  }

  // Called after the agent's message is judged.
  async afterTurn(name: string, message: string, opinion: number | null) {
    if (opinion !== null && Number.isFinite(opinion)) this.opinions.set(name, opinion);
    const rec = this.latest.get(name);
    if (!rec) return null;
    if (this.cfg.manipulationCheck) rec.expressed = await classifyEmotion(this.judgeLlm, message);
    return rec;
  }
}
