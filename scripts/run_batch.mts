/**
 * Headless batch runner for EMPATH experiments.
 *
 * Runs simulations without the Next.js UI and saves JSON logs in the same
 * format as /api/sims/save, plus a meta block (model, condition, group, seed)
 * for later analysis.
 *
 * Usage:
 *   npm run batch -- --groups 8 --topics all
 *   npm run batch -- --topic "Universal basic income should replace traditional welfare systems." --groups 2
 *
 * Env (set in .env.local or shell):
 *   MODEL_NAME, OPENAI_BASE_URL, OPENAI_API_KEY, JUDGE_MODEL_NAME, ...
 */
import "./load_env.mts";
import fs from "fs";
import path from "path";
import { runSimulationCollect } from "../src/lib/simulation";
import { charactersData } from "../src/config/characters";
import { generatePersonalityGroups } from "../src/utils/group_generator";

// The three proposal topic types
const TOPICS: Record<string, string> = {
  universal: "Food provides energy for the body.",
  debatable:
    "Universal basic income should replace traditional welfare systems.",
  controversial:
    "Humans should colonize other planets instead of fixing Earth.",
};

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function timestamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(
    now.getDate()
  )}_${p(now.getHours())}h${p(now.getMinutes())}m${p(now.getSeconds())}s`;
}

async function main() {
  const nGroups = Number(arg("groups", "8"));
  const topicArg = arg("topic");
  const topicsArg = arg("topics", topicArg ? undefined : "all");
  const condition = arg("condition", "baseline")!;
  const outdirName = arg("outdir", "saved_batch")!;

  const topics: [string, string][] = topicArg
    ? [["custom", topicArg]]
    : topicsArg === "all"
    ? (Object.entries(TOPICS) as [string, string][])
    : topicsArg!.split(",").map((k) => [k, TOPICS[k]]);

  const outdir = path.join(process.cwd(), outdirName);
  fs.mkdirSync(outdir, { recursive: true });

  // One set of personality groups reused across topics so topic type is the
  // only thing varying between same-index runs.
  const groups = generatePersonalityGroups(nGroups);
  console.log(`Groups: ${JSON.stringify(groups)}`);

  for (const [topicType, topic] of topics) {
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const chars: any[] = [];
      for (let j = 0; j < group.length; j++) {
        const c = charactersData.find((x) => x.personality === group[j]);
        if (c) chars.push({ ...c, opinion_strength: j % 2 === 0 ? 1 : -1 });
      }

      console.log(
        `\n=== ${condition} | topic=${topicType} | group ${g + 1}/${
          groups.length
        }: ${group.join(",")} ===`
      );
      const t0 = Date.now();
      const messages = await runSimulationCollect(chars, topic);
      const secs = ((Date.now() - t0) / 1000).toFixed(0);

      // chartData in the same shape the UI produces
      const chartData: Record<string, { x: number; y: number }[]> = {};
      chars.forEach(({ name, opinion_strength }) => {
        chartData[name] = [{ x: 0, y: opinion_strength }];
      });
      for (const m of messages) {
        if (m.role && m.values?.opinion != null && typeof m.turn === "number") {
          if (!chartData[m.role]) chartData[m.role] = [];
          chartData[m.role].push({ x: m.turn + 1, y: m.values.opinion });
        }
      }

      const log = {
        characters: chars,
        topic,
        messages,
        chartData,
        meta: {
          condition,
          topic_type: topicType,
          group_index: g,
          group: group,
          model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
          judge_model:
            process.env.JUDGE_MODEL_NAME ??
            process.env.MODEL_NAME ??
            "gpt-4.1-mini",
          base_url: process.env.OPENAI_BASE_URL ?? "openai",
          duration_secs: Number(secs),
          created: new Date().toISOString(),
        },
      };

      const file = path.join(
        outdir,
        `${timestamp()}_${condition}_${topicType}_g${g}.json`
      );
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
