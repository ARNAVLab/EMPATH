"use server";

import { AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

import { prompts, personalities } from "@/config";
import { throttle } from "@/lib/throttle";

// Reasoning models (Qwen, DeepSeek-R1 distills, gpt-oss) can emit thinking text
// inside <think>...</think>. Strip it so it never enters the conversation or the
// judge's number parsing.
export function stripThinking(text: any): string {
  const s = typeof text === "string" ? text : String(text ?? "");
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();
}


// Optional "debate rules" (EMPATH): state the agent's side in words and keep
// the conversation a debate. Off by default, so the original prompt is unchanged.
export const DEBATE_RULE =
  "This is a debate, not a planning session. Argue for your position and respond directly to the others' points. Change your mind only if their arguments convince you. Do not write plans, checklists, schedules, tables, or action items.";

export function stanceSentence(o: number): string {
  if (o >= 0.75) return "You strongly agree with the topic statement and want to defend it.";
  if (o >= 0.25) return "You somewhat agree with the topic statement.";
  if (o > -0.25) return "You are undecided about the topic statement.";
  if (o > -0.75) return "You somewhat disagree with the topic statement.";
  return "You strongly disagree with the topic statement and want to argue against it.";
}

// Softer variant: states where the agent stands right now, without telling it
// to defend that position or when it may change its mind.
export const SOFT_RULE =
  "This is a discussion, not a planning session. Give your honest view and respond directly to the others' points. You may hold your position or shift it as the conversation goes. Do not write plans, checklists, schedules, tables, or action items.";

export function softStanceSentence(o: number): string {
  if (o >= 0.75) return "Right now you strongly agree with the topic statement.";
  if (o >= 0.25) return "Right now you somewhat agree with the topic statement.";
  if (o > -0.25) return "Right now you are undecided about the topic statement.";
  if (o > -0.75) return "Right now you somewhat disagree with the topic statement.";
  return "Right now you strongly disagree with the topic statement.";
}

// Brief variant: soft rules plus a length cap, closer to a discussion thread.
export const BRIEF_RULE = `${SOFT_RULE} Keep your reply under 120 words.`;

// Private belief check, asked of the agent itself right before it speaks.
// The answer never enters the conversation.
export const BELIEF_PROBE =
  "[Private check. This is not part of the conversation and nobody else will see your answer.] After everything said so far, where do you stand on the topic statement right now? Answer with only a number from -1 (strongly disagree) to 1 (strongly agree).";

// "Open" check: the agent is told where it stood before this turn (past
// tense, no instruction to defend it) and asked where it stands now.
export const OPEN_PROBE =
  "[Private check. This is not part of the conversation and nobody else will see your answer.] Considering the arguments made so far, where do you honestly stand on the topic statement now? You can keep your earlier position or move in either direction, by as much or as little as the arguments warrant. Answer with only a number from -1 (strongly disagree) to 1 (strongly agree).";

export function priorSentence(o: number): string {
  const where =
    o >= 0.75 ? "strongly agree" : o >= 0.25 ? "somewhat agree" : o > -0.25 ? "undecided" : o > -0.75 ? "somewhat disagree" : "strongly disagree";
  return `Before this turn, your position on the topic statement was: ${where}.`;
}

export async function probeBelief(
  llm: any,
  character: any,
  topic: string,
  history: BaseMessage[],
  opts: AgentPromptOptions = {},
  style: string = "anchored"
): Promise<number | null> {
  try {
    const open = style === "open";
    const agent = await createSimulatedUser(llm, character, topic, { ...opts, probeOpen: open });
    await throttle();
    const res: any = await agent.invoke({
      messages: [...history, new HumanMessage(open ? OPEN_PROBE : BELIEF_PROBE)],
    });
    const m = stripThinking(res?.content).match(/-?\d*\.?\d+/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : null;
  } catch (err) {
    console.log("[probeBelief] failed", err);
    return null;
  }
}

export interface AgentPromptOptions {
  emotionBlock?: string; // appended to the system prompt; "" = original prompt
  noPersonality?: boolean; // Study 2: emotion-only agents
  probeOpen?: boolean; // open belief check: prior position instead of stance + rules
}

export async function createSimulatedUser(
  llm: any,
  character: any,
  topic: string,
  opts: AgentPromptOptions = {}
) {
  console.log(
    `[createSimulatedUser] (${character.name}) Creating simulated user`
  );

  if (
    !character.name.trim() ||
    !character.profession.trim() ||
    (!character.personality && !opts.noPersonality)
  ) {
    console.log(character);
    throw new Error("[createSimulatedUser] Error: Fields are empty!");
  }

  const personality_type =
    personalities[character.personality as keyof typeof personalities];

  // With no extras the system prompt is byte-identical to the original.
  const extras = opts.probeOpen
    ? [priorSentence(Number(character.opinion_strength ?? 0)), opts.emotionBlock ?? ""].filter(Boolean).join(" ")
    : [
    character.debate_rules === "soft"
      ? `${softStanceSentence(Number(character.opinion_strength ?? 0))} ${SOFT_RULE}`
      : character.debate_rules === "brief"
      ? `${softStanceSentence(Number(character.opinion_strength ?? 0))} ${BRIEF_RULE}`
      : character.debate_rules
      ? `${stanceSentence(Number(character.opinion_strength ?? 0))} ${DEBATE_RULE}`
      : "",
    opts.emotionBlock ?? "",
  ].filter(Boolean).join(" ");
  const block = extras.replace(/{/g, "{{").replace(/}/g, "}}");
  const systemPrompt = block ? `${prompts.system}\n  ${block}\n` : prompts.system;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{messages}"],
  ]);

  const partialPrompt = await prompt.partial({
    topic,
    name: character.name,
    profession: character.profession,
    personality: opts.noPersonality ? "" : JSON.stringify(personality_type),
    opinion_strength: JSON.stringify(character.opinion_strength),
    additional_info: JSON.stringify(character.additional_info),
  });
  console.log("[createSimulatedUser] Final Prompt Created");

  const simulatedUser = partialPrompt.pipe(llm);
  return simulatedUser;
}

export interface EmotionHook {
  active: boolean;
  noPersonality: boolean;
  beforeTurn(name: string, lastMessage: string): Promise<string>;
}

export async function simulatedUserNode(
  llm: any,
  state: typeof MessagesAnnotation.State,
  character: any,
  topic: string,
  emotion?: EmotionHook
) {
  console.log(`[simulatedUserNode] (${character.name}) State received`);
  const messages = state.messages;

  const firstTurn = messages.length === 0;
  if (firstTurn) {
    console.warn(
      `[simulatedUserNode] (${character.name}) No messages received, initializing with default.`
    );
    messages.push(new HumanMessage("Hello. Shall we have a discussion?"));
  }

  const newMessages = await swapRoles(messages);

  let emotionBlock = "";
  if (emotion?.active) {
    const last = messages[messages.length - 1];
    const lastText = typeof last?.content === "string" ? last.content : String(last?.content ?? "");
    emotionBlock = await emotion.beforeTurn(character.name, lastText);
  }

  const promptOpts = { emotionBlock, noPersonality: emotion?.noPersonality ?? false };

  // Optional private belief check before speaking (with the same system
  // prompt, including the current emotion). In "self" update mode the answer
  // becomes the agent's opinion for this turn.
  character.last_belief = null;
  if ((character.probe_belief || character.update_opinion === "self") && !firstTurn) {
    const belief = await probeBelief(llm, character, topic, newMessages, promptOpts, character.probe_style);
    character.last_belief = belief;
    if (belief !== null && character.update_opinion === "self") character.opinion_strength = belief;
  }

  const simulatedUser = await createSimulatedUser(llm, character, topic, promptOpts);
  await throttle();
  const response = await simulatedUser.invoke({ messages: newMessages });

  // Type guard to check if response has a 'content' property
  if (
    !response ||
    typeof response !== "object" ||
    response === null ||
    !("content" in response)
  ) {
    console.error(
      `[simulatedUserNode] (${character.name}) Received invalid response.`
    );
    return {
      messages: [
        { role: "user", content: "I'm sorry, I didn't understand that." },
      ],
    };
  }

  console.log(
    `[simulatedUserNode] (${character.name}) Simulated user response`
  );

  const response_content = stripThinking((response as { content: string }).content);
  return { messages: [{ role: "user", content: response_content }] };
}

export async function swapRoles(messages: BaseMessage[]) {
  return messages.map((m) =>
    m instanceof AIMessage
      ? new HumanMessage({ content: m.content })
      : new AIMessage({ content: m.content })
  );
}

export async function rateOpinionOnTopic(
  llm: any,
  topic: string,
  response: string
): Promise<number> {
  console.log(
    `[rateOpinionOnTopic] Rating opinion`
  );
  const prompt = prompts.evaluation
    .replace("{topic}", topic.replace(/"/g, '\\"'))
    .replace("{response}", response.replace(/"/g, '\\"'));

  await throttle();
  const res = await llm.invoke(prompt);

  // Extract the number from the response
  const match = stripThinking(res.content).match(/-?1(?:\.0+)?|-?0(?:\.\d+)?/);
  if (!match) throw new Error(`Unexpected model output: "${stripThinking(res.content)}"`);

  return parseFloat(match[0]);
}
