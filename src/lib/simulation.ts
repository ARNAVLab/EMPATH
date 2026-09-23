"use server";

import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation } from "@langchain/langgraph";
import { StateGraph, END, START } from "@langchain/langgraph";
import { messageLimit } from "@/config/run_config";
import {
  rateOpinionOnTopic,
  simulatedUserNode,
} from "@/utils/simulation_utils";

// Generation model. Configurable via env so we can swap between OpenAI,
// Ollama (OPENAI_BASE_URL=http://localhost:11434/v1), or any
// OpenAI-compatible endpoint without touching code.
const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
  temperature: Number(process.env.MODEL_TEMPERATURE ?? 0.7),
  apiKey: process.env.OPENAI_API_KEY ?? "ollama",
  configuration: process.env.OPENAI_BASE_URL
    ? { baseURL: process.env.OPENAI_BASE_URL }
    : undefined,
});

// Judge model. Kept separate from the generation model so opinion scoring
// can use a different (stronger or cheaper) model, and runs at temperature 0
// by default for scoring stability. Falls back to the generation settings.
const judgeLlm = new ChatOpenAI({
  model: process.env.JUDGE_MODEL_NAME ?? process.env.MODEL_NAME ?? "gpt-4.1-mini",
  temperature: Number(process.env.JUDGE_TEMPERATURE ?? 0),
  apiKey:
    process.env.JUDGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "ollama",
  configuration:
    process.env.JUDGE_BASE_URL || process.env.OPENAI_BASE_URL
      ? {
          baseURL:
            process.env.JUDGE_BASE_URL ?? process.env.OPENAI_BASE_URL,
        }
      : undefined,
});

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  if (messages.length > messageLimit) {
    console.log("[shouldContinue] Ending simulation - Too many messages.");
    return "__end__";
  } else {
    console.log("[shouldContinue] Continuing conversation.");
    return "continue";
  }
}

function createSimulation(characters: any[] = [], topic: string = "") {
  console.log("[createSimulation] Creating simulation workflow");

  function shuffleArray(array: any) {
    return array.sort(() => Math.random() - 0.5);
  }

  shuffleArray(characters);

  const workflow = new StateGraph(MessagesAnnotation);

  for (let i = 0; i < characters.length; i++) {
    workflow.addNode(characters[i].name, (state) =>
      simulatedUserNode(llm, state, characters[i], topic)
    );
  }

  // Add normal edges (A → B → C → D)
  for (let i = 0; i < characters.length - 1; i++) {
    workflow.addEdge(characters[i].name as any, characters[i + 1].name as any);
  }

  // Conditional looping logic (D → A if shouldContinue allows)
  for (let i = 0; i < characters.length; i++) {
    const nextIndex = (i + 1) % characters.length;
    workflow.addConditionalEdges(characters[i].name as any, shouldContinue, {
      [END]: END,
      continue: characters[nextIndex].name as any,
    });
  }

  workflow.addEdge(START, characters[0].name as any);

  const simulation = workflow.compile();

  console.log("[createSimulation] Simulation workflow compiled.");
  return simulation;
}

// Shared per-chunk processing used by both the streaming (UI) and
// collecting (headless batch) runners.
async function processChunk(
  chunk: any,
  topic: string,
  roleTurnCounters: Record<string, number | null>
) {
  const nodeName = Object.keys(chunk)[0];
  const messages = chunk[nodeName].messages;
  const messageText = messages[0].content;

  let conv = "";
  const values: Record<string, number | null> = { opinion: null };

  try {
    conv = messageText;
    const opinion = await rateOpinionOnTopic(judgeLlm, topic, conv);
    values.opinion = opinion;
    console.log(
      `[processChunk] (${nodeName}) Opinion rating: ${JSON.stringify(opinion)}`
    );
  } catch (err) {
    console.log(err);
  }

  const turnIndex = roleTurnCounters[nodeName] ?? 0;
  roleTurnCounters[nodeName] = turnIndex + 1;

  return {
    role: nodeName,
    content: conv,
    values: values,
    turn: turnIndex,
  };
}

export async function runSimulationStream(characters: any[], topic: string) {
  const simulation = createSimulation(characters, topic);
  const roleTurnCounters: Record<string, number | null> = {};

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const recursionLimit = 100;

      for await (const chunk of await simulation.stream(
        {},
        { recursionLimit }
      )) {
        const messageObj = await processChunk(chunk, topic, roleTurnCounters);
        const data = `data: ${JSON.stringify(messageObj)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Headless runner for batch experiments: same simulation, but collects all
// messages and returns them instead of streaming SSE. Used by scripts/.
export async function runSimulationCollect(characters: any[], topic: string) {
  const simulation = createSimulation(characters, topic);
  const roleTurnCounters: Record<string, number | null> = {};
  const collected: any[] = [];

  const recursionLimit = 100;
  for await (const chunk of await simulation.stream({}, { recursionLimit })) {
    const messageObj = await processChunk(chunk, topic, roleTurnCounters);
    collected.push(messageObj);
  }

  return collected;
}
