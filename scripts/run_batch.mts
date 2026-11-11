/**
 * Headless batch runner for EMPATH experiments.
 *
 * Runs debates without the web UI and saves one JSON log per debate:
 * {characters, topic, messages, chartData, meta}. With an emotion setting,
 * every message also carries an "emotion" record (label, intensity, VAD,
 * appraisal, expressed emotion).
 *
 * Examples:
 *   Study 0, baseline (original framework, no emotion):
 *     npm run batch -- --topics all --groups 8 --outdir results/study0
 *   Study 2, emotion only (no personality), one cell of the 3D matrix:
 *     npm run batch -- --emotion-only --emotion on --start angry --topics controversial --groups 8 --outdir results/study2
 *   Study 3, personality plus emotion:
 *     npm run batch -- --emotion on --topics universal,controversial --groups 5 --outdir results/study3
 *
 * Flags:
 *   --groups N         personality groups (or repeats, with --emotion-only)
 *   --topics a,b|all   universal, debatable, controversial
 *   --topic "text"     a custom topic instead
 *   --outdir DIR       where logs go (default saved_batch)
 *   --emotion X        off | on | frozen | random (leave out = original framework)
 *   --format X         label | vad | description (default label)
 *   --start X          calm | excited | angry (default calm)
 *   --emotion-only     neutral agents, no personality; 2 high and 2 low regulation
 *   --no-check         skip the per-message emotion check
 *   --debate-rules     state each agent's side in words and forbid planning talk
 *   --rules X          strict (same as --debate-rules) | soft (states the side,
 *                      no "defend it" instruction) | none
 *   --update-opinion   after each message, the judge's score becomes the agent's
 *                      opinion for its next turn (paper Algorithm 1)
 *   --label X          name used in output file names
 *   --skip K           start at group K (resume a cut-off condition)
 *   --groups-file F    reuse the personality groups saved in F (created on
 *                      first use), so different conditions get the same groups
 */
import "./load_env.mts";
import fs from "fs";
import path from "path";
import { runSimulationCollect } from "../src/lib/simulation";
import { charactersData } from "../src/config/characters";
import { generatePersonalityGroups } from "../src/utils/group_generator";
import type { EmotionConfig } from "../src/emotion/model";

const TOPICS: Record<string, string> = {
  universal: "Food provides energy for the body.",
  debatable: "Universal basic income should replace traditional welfare systems.",
  controversial: "Humans should colonize other planets instead of fixing Earth.",
};

// Study 2 agents: identical except name and emotion regulation.
// Sides alternate (+1, -1, +1, -1), so each side gets one high- and one
// low-regulation agent.
const NEUTRAL_AGENTS = [
  { name: "Alex", regulation: "high" },
  { name: "Jordan", regulation: "low" },
  { name: "Sam", regulation: "low" },
  { name: "Taylor", regulation: "high" },
];

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function timestamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}h${p(now.getMinutes())}m${p(now.getSeconds())}s`;
}

async function main() {
  const nGroups = Number(arg("groups", "8"));
  const topicArg = arg("topic");
  const topicsArg = arg("topics", topicArg ? undefined : "all");
  const outdirName = arg("outdir", "saved_batch")!;
  const emotionArg = arg("emotion");
  const emotionOnly = flag("emotion-only");
  const rules = arg("rules") ?? (flag("debate-rules") ? "strict" : "none");
  const debateRules = rules !== "none";
  const updateOpinion = flag("update-opinion");

  const emotionCfg: EmotionConfig | undefined =
    emotionArg || emotionOnly
      ? {
          condition: (emotionArg ?? "off") as EmotionConfig["condition"],
          format: (arg("format", "label") as EmotionConfig["format"]),
          startMood: (arg("start", "calm") as EmotionConfig["startMood"]),
          emotionOnly,
          manipulationCheck: !flag("no-check") && (emotionArg ?? "off") !== "off",
        }
      : undefined;

  const label =
    arg("label") ??
    (emotionCfg
      ? `${emotionOnly ? "eo" : "pe"}-${emotionCfg.condition}-${emotionCfg.format}-${emotionCfg.startMood}`
      : "baseline") +
    (debateRules && !arg("label") ? (rules === "soft" ? "-ds" : "-dr") : "") +
    (updateOpinion && !arg("label") ? "-uo" : "");

  const topics: [string, string][] = topicArg
    ? [["custom", topicArg]]
    : topicsArg === "all"
    ? (Object.entries(TOPICS) as [string, string][])
    : topicsArg!.split(",").map((k) => [k, TOPICS[k]]);

  const outdir = path.join(process.cwd(), outdirName);
  fs.mkdirSync(outdir, { recursive: true });

  // One set of groups reused across topics, so topic is the only difference
  // between same-numbered runs. Emotion-only runs use the neutral agents.
  const groupsFile = arg("groups-file");
  let groups: any[];
  if (emotionOnly) groups = Array.from({ length: nGroups }, () => null);
  else if (groupsFile && fs.existsSync(groupsFile)) groups = JSON.parse(fs.readFileSync(groupsFile, "utf8")).slice(0, nGroups);
  else {
    groups = generatePersonalityGroups(nGroups);
    if (groupsFile) {
      fs.mkdirSync(path.dirname(groupsFile), { recursive: true });
      fs.writeFileSync(groupsFile, JSON.stringify(groups));
    }
  }
  console.log(`Config: ${label} | groups: ${JSON.stringify(groups)}`);

  for (const [topicType, topic] of topics) {
    for (let g = Number(arg("skip", "0")); g < groups.length; g++) {
      const group = groups[g];
      const chars: any[] = [];
      if (emotionOnly) {
        NEUTRAL_AGENTS.forEach((a, j) =>
          chars.push({
            name: a.name,
            profession: "member of a community discussion group",
            personality: "",
            regulation: a.regulation,
            opinion_strength: j % 2 === 0 ? 1 : -1,
            additional_info: "",
          })
        );
      } else {
        for (let j = 0; j < group!.length; j++) {
          const c = charactersData.find((x) => x.personality === group![j]);
          if (c) chars.push({ ...c, opinion_strength: j % 2 === 0 ? 1 : -1 });
        }
      }

      if (debateRules) chars.forEach((c) => (c.debate_rules = rules === "soft" ? "soft" : true));
      if (updateOpinion) chars.forEach((c) => (c.update_opinion = true));
      const startChars = chars.map((c) => ({ ...c }));
      console.log(`\n=== ${label} | topic=${topicType} | run ${g + 1}/${groups.length} ===`);
      const t0 = Date.now();
      const messages = await runSimulationCollect(chars, topic, emotionCfg);
      const secs = ((Date.now() - t0) / 1000).toFixed(0);

      const chartData: Record<string, { x: number; y: number }[]> = {};
      startChars.forEach(({ name, opinion_strength }) => {
        chartData[name] = [{ x: 0, y: opinion_strength }];
      });
      for (const m of messages) {
        if (m.role && m.values?.opinion != null && typeof m.turn === "number") {
          if (!chartData[m.role]) chartData[m.role] = [];
          chartData[m.role].push({ x: m.turn + 1, y: m.values.opinion });
        }
      }

      const log = {
        characters: startChars,
        topic,
        messages,
        chartData,
        meta: {
          label,
          topic_type: topicType,
          run_index: g,
          group,
          emotion: emotionCfg ?? null,
          debate_rules: debateRules,
          rules,
          update_opinion: updateOpinion,
          model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
          judge_model: process.env.JUDGE_MODEL_NAME ?? process.env.MODEL_NAME ?? "gpt-4.1-mini",
          base_url: process.env.OPENAI_BASE_URL ?? "openai",
          duration_secs: Number(secs),
          created: new Date().toISOString(),
        },
      };

      const file = path.join(outdir, `${timestamp()}_${label}_${topicType}_g${g}.json`);
      fs.writeFileSync(file, JSON.stringify(log, null, 2));
      console.log(`Saved ${file} (${secs}s)`);
    }
  }
  console.log("\nBatch complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
