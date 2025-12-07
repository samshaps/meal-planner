// lib/ai/openai-client.ts

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    client = new OpenAI({
      apiKey,
    });
  }
  return client;
}

export async function callOpenAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const openai = getOpenAIClient();
  const apiCallStart = Date.now();
  
  const response = await openai.chat.completions.create({
    model: options?.model || "gpt-4o-mini",
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000,
  });

  const apiCallDuration = ((Date.now() - apiCallStart) / 1000).toFixed(2);
  const model = options?.model || "gpt-4o-mini";
  const tokensUsed = response.usage?.total_tokens || 0;
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;
  console.log(`[OPENAI] 🔄 API call (${model}): ${apiCallDuration}s, ${tokensUsed} tokens (${promptTokens} prompt + ${completionTokens} completion)`);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI API returned empty response");
  }

  return content;
}

