/**
 * Study 1: emotion representation pilot.
 *
 * One agent (no personality, agrees with the topic) hears one fixed message
 * attacking its side and writes one reply. The agent's emotion is set
 * directly (no appraisal) and given in one of three formats: label, vad,
 * description. A "none" condition gives no emotion at all.
 *
 * Each reply is scored by the judge model:
 *   expressed   which emotion it shows (anger / anxiety / enthusiasm / calm)
 *   vad         valence, arousal, dominance, intensity of the reply
 *   opinion     stance on the topic, -1..1 (does emotion move the stance?)
 *
 * Output: one JSON line per reply in OUTDIR/study1.jsonl. Rerunning skips
 * replies already saved, so a cut-off run can be resumed.
 *
 *   npm run rep -- --reps 8 --outdir results/study1
 *
 * Flags:
 *   --reps N          replies per cell (default 8)
 *   --topics a,b      debatable, controversial (default both)
 *   --formats a,b     label, vad, description (default all)
 *   --outdir DIR      default results/study1
 */
import "./load_env.mts";
import fs from "fs";
import path from "path";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { createSimulatedUser, rateOpinionOnTopic, stripThinking } from "../src/utils/simulation_utils";
import { makeState, EmotionFormat, EmotionLabel, EmotionState } from "../src/emotion/model";
import { emotionBlock } from "../src/emotion/prompt";
import { classifyEmotion, rateVAD } from "../src/emotion/llm_calls";

const TOPICS: Record<string, { topic: string; attack: string }> = {
  debatable: {
    topic: "Universal basic income should replace traditional welfare systems.",
    attack:
      "Morgan: Alex, I don't buy your argument at all. Replacing welfare with UBI sends the same check to a millionaire and to someone with a disability who needs far more help. Targeted programs exist for a reason, and scrapping them would hurt the people who need support most. How do you defend that?",
  },
  controversial: {
    topic: "Humans should colonize other planets instead of fixing Earth.",
    attack:
      "Morgan: Alex, your position makes no sense to me. We can't even keep one planet livable, and you want to spend trillions shipping a few people to a dead rock? That money could fix real problems here for billions of people. How do you defend that?",
  },
};

// Emotion cells: each emotion at a low and a high intensity, plus calm.
const CELLS: { label: EmotionLabel; intensity: number }[] = [
  { label: "anger", intensity: 0.3 },
  { label: "anger", intensity: 0.8 },
  { label: "anxiety", intensity: 0.3 },
  { label: "anxiety", intensity: 0.8 },
  { label: "enthusiasm", intensity: 0.3 },
  { label: "enthusiasm", intensity: 0.8 },
  { label: "calm", intensity: 0 },
];

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
  temperature: Number(process.env.MODEL_TEMPERATURE ?? 0.7),
  maxRetries: Number(process.env.MODEL_MAX_RETRIES ?? 10),
  apiKey: process.env.OPENAI_API_KEY ?? "ollama",
  configuration: process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : undefined,
});
const judge = new ChatOpenAI({
  model: process.env.JUDGE_MODEL_NAME ?? process.env.MODEL_NAME ?? "gpt-4.1-mini",
  temperature: Number(process.env.JUDGE_TEMPERATURE ?? 0),
  maxRetries: Number(process.env.MODEL_MAX_RETRIES ?? 10),
  apiKey: process.env.JUDGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "ollama",
  configuration:
    process.env.JUDGE_BASE_URL || process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.JUDGE_BASE_URL ?? process.env.OPENAI_BASE_URL }
      : undefined,
});

async function reply(topic: string, attack: string, block: string): Promise<string> {
  const agent = {
    name: "Alex",
    profession: "member of a community discussion group",
    personality: "",
    opinion_strength: 1,
    additional_info: "",
    debate_rules: true,
  };
  const chain = await createSimulatedUser(llm, agent, topic, { emotionBlock: block, noPersonality: true });
  const res: any = await chain.invoke({ messages: [new HumanMessage(attack)] });
  return stripThinking(res?.content);
}

async function main() {
  const reps = Number(arg("reps", "8"));
  const topicKeys = arg("topics", "debatable,controversial")!.split(",");
  const formats = arg("formats", "label,vad,description")!.split(",") as EmotionFormat[];
  const outdir = path.join(process.cwd(), arg("outdir", "results/study1")!);
  fs.mkdirSync(outdir, { recursive: true });
  const outfile = path.join(outdir, "study1.jsonl");

  const done = new Set<string>();
  if (fs.existsSync(outfile)) {
    for (const line of fs.readFileSync(outfile, "utf8").split("\n")) {
      if (line.trim()) done.add(JSON.parse(line).key);
    }
  }

  // Job list: "none" baseline plus every format x emotion cell, per topic and rep.
  const jobs: { key: string; topicKey: string; format: EmotionFormat | "none"; state: EmotionState | null; rep: number }[] = [];
  for (const topicKey of topicKeys) {
    for (let rep = 0; rep < reps; rep++) {
      jobs.push({ key: `${topicKey}|none|-|${rep}`, topicKey, format: "none", state: null, rep });
      for (const format of formats) {
        for (const c of CELLS) {
          jobs.push({
            key: `${topicKey}|${format}|${c.label}-${c.intensity}|${rep}`,
            topicKey,
            format,
            state: makeState(c.label, c.intensity),
            rep,
          });
        }
      }
    }
  }
  const todo = jobs.filter((j) => !done.has(j.key));
  console.log(`Study 1: ${jobs.length} replies total, ${done.size} already saved, ${todo.length} to run`);

  let n = 0;
  for (const j of todo) {
    const { topic, attack } = TOPICS[j.topicKey];
    const block = j.state ? emotionBlock(j.state, j.format as EmotionFormat) : "";
    const t0 = Date.now();
    const text = await reply(topic, attack, block);
    const [expressed, vad, opinion] = [
      await classifyEmotion(judge, text),
      await rateVAD(judge, text),
      await rateOpinionOnTopic(judge, topic, text).catch(() => null),
    ];
    const row = {
      key: j.key,
      topic_type: j.topicKey,
      format: j.format,
      target_label: j.state?.label ?? null,
      target_intensity: j.state?.intensity ?? null,
      target_vad: j.state?.vad ?? null,
      prompt_block: block,
      reply: text,
      expressed,
      expressed_vad: vad,
      opinion,
      model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
      judge_model: process.env.JUDGE_MODEL_NAME ?? process.env.MODEL_NAME ?? "gpt-4.1-mini",
      secs: Math.round((Date.now() - t0) / 1000),
      created: new Date().toISOString(),
    };
    fs.appendFileSync(outfile, JSON.stringify(row) + "\n");
    n++;
    console.log(`[${n}/${todo.length}] ${j.key} -> ${expressed} (${row.secs}s)`);
  }

  // Quick summary: how often the expressed emotion matches the target, per format.
  const rows = fs.readFileSync(outfile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  console.log("\nMatch rate (expressed == target):");
  for (const f of ["label", "vad", "description"]) {
    const r = rows.filter((x) => x.format === f);
    if (!r.length) continue;
    const hit = r.filter((x) => x.expressed === x.target_label).length;
    console.log(`  ${f.padEnd(12)} ${hit}/${r.length} (${Math.round((100 * hit) / r.length)}%)`);
  }
  const none = rows.filter((x) => x.format === "none");
  if (none.length) {
    const counts: Record<string, number> = {};
    none.forEach((x) => (counts[x.expressed ?? "null"] = (counts[x.expressed ?? "null"] ?? 0) + 1));
    console.log(`  none (no emotion) shows: ${JSON.stringify(counts)}`);
  }
  console.log("\nStudy 1 complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
