"use server";

import { AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

import { prompts, personalities } from "@/config";

// Reasoning models (Qwen, DeepSeek-R1 distills, gpt-oss) can emit thinking text
// inside <think>...</think>. Strip it so it never enters the conversation or the
// judge's number parsing.
export function stripThinking(text: any): string {
  const s = typeof text === "string" ? text : String(text ?? "");
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();
}


export async function createSimulatedUser(
  llm: any,
  character: any,
  topic: string
) {
  console.log(
    `[createSimulatedUser] (${character.name}) Creating simulated user`
  );

  if (
    !character.name.trim() ||
    !character.profession.trim() ||
    !character.personality
  ) {
    console.log(character);
    throw new Error("[createSimulatedUser] Error: Fields are empty!");
  }

  const personality_type =
    personalities[character.personality as keyof typeof personalities];

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", prompts.system],
    ["human", "{messages}"],
  ]);

  const partialPrompt = await prompt.partial({
    topic,
    name: character.name,
    profession: character.profession,
    personality: JSON.stringify(personality_type),
    opinion_strength: JSON.stringify(character.opinion_strength),
    additional_info: JSON.stringify(character.additional_info),
  });
  console.log("[createSimulatedUser] Final Prompt Created");

  const simulatedUser = partialPrompt.pipe(llm);
  return simulatedUser;
}

export async function simulatedUserNode(
  llm: any,
  state: typeof MessagesAnnotation.State,
  character: any,
  topic: string
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

  const simulatedUser = await createSimulatedUser(llm, character, topic);
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

  const res = await llm.invoke(prompt);

  // Extract the number from the response
  const match = stripThinking(res.content).match(/-?1(?:\.0+)?|-?0(?:\.\d+)?/);
  if (!match) throw new Error(`Unexpected model output: "${stripThinking(res.content)}"`);

  return parseFloat(match[0]);
}
