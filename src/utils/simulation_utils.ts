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

export interface AgentPromptOptions {
  emotionBlock?: string; // appended to the system prompt; "" = original prompt
  noPersonality?: boolean; // Study 2: emotion-only agents
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
  const extras = [
    character.debate_rules ? `${stanceSentence(Number(character.opinion_strength ?? 0))} ${DEBATE_RULE}` : "",
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

  if (messages.length === 0) {
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

  const simulatedUser = await createSimulatedUser(llm, character, topic, {
    emotionBlock,
    noPersonality: emotion?.noPersonality ?? false,
  });
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
