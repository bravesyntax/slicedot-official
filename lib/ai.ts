import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Writing help for the admin. Nothing here runs for customers, and nothing is saved until the admin reviews the text
// and presses Save. It uses the Claude API when ANTHROPIC_API_KEY is set, otherwise Google Gemini's free tier when
// GEMINI_API_KEY is set (free-tier prompts may be used by Google to improve its products; only product details are sent).
// With neither key the AI buttons stay hidden.

export const aiConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);

const MODEL = "claude-opus-5-5";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const RULES = `You write copy for SliceDot, an online store in India selling jewellery, beauty, fashion accessories, home and kitchen items, perfumes and phone accessories.
Rules:
- Use only the facts you are given. Never invent materials, sizes, ingredients, certifications, warranties, ratings or delivery promises.
- Plain, warm, specific English for Indian shoppers. No emojis, no markdown, no ALL CAPS, no exclamation marks.
- Avoid empty claims such as "best", "premium quality", "100% original" or "top-rated".
- Write keywords the way shoppers type them into a search box, using words that appear in the product's details.`;

const ProductCopy = z.object({
  short_description: z.string().describe("One sentence, at most 160 characters, saying what it is and why it is useful."),
  description: z.string().describe("80 to 150 words of plain text in 2 or 3 short paragraphs separated by a blank line."),
  meta_title: z.string().describe("Search result title, 30 to 60 characters, starting with the product type, without the store name."),
  meta_description: z.string().describe("Search result description, 120 to 155 characters."),
  focus_keyword: z.string().describe("The 2 to 4 word phrase a shopper would search to find this product."),
  keywords: z.array(z.string()).describe("5 to 8 short search phrases, lower case."),
});
export type ProductCopy = z.infer<typeof ProductCopy>;

const SeoCopy = z.object({
  title: z.string().describe("Search result title, 30 to 60 characters."),
  description: z.string().describe("Search result description, 120 to 155 characters, with a clear reason to click."),
  focus_keyword: z.string().describe("The 2 to 4 word phrase this page should rank for."),
});
export type SeoCopy = z.infer<typeof SeoCopy>;

function ask<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  return process.env.ANTHROPIC_API_KEY ? askClaude(schema, prompt) : askGemini(schema, prompt);
}

async function askClaude<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      // If the model declines, the API re-runs the request on a suitable fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      system: RULES,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new AiProblem("The AI couldn't write this one. Try again with more product details.");
    return response.parsed_output as z.infer<T>;
  } catch (err) {
    if (err instanceof AiProblem) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new AiProblem("The AI key isn't valid. Check ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) throw new AiProblem("The AI is busy right now. Try again in a minute.");
    console.error("[ai]", err);
    throw new AiProblem("The AI didn't respond. Try again.");
  }
}

async function askGemini<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema);
  delete jsonSchema.$schema;
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RULES }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    console.error("[ai] gemini", err);
    throw new AiProblem("The AI didn't respond. Try again.");
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const body = await response.text();
    console.error("[ai] gemini", response.status, body.slice(0, 500));
    throw new AiProblem(/API_KEY|PERMISSION|key/i.test(body) ? "The AI key isn't valid. Check GEMINI_API_KEY." : "The AI couldn't write this one. Try again.");
  }
  if (response.status === 429) throw new AiProblem("The free AI limit is used up for now. Try again in a minute, or tomorrow.");
  if (!response.ok) {
    console.error("[ai] gemini", response.status);
    throw new AiProblem("The AI didn't respond. Try again.");
  }
  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return schema.parse(JSON.parse(text)) as z.infer<T>;
  } catch {
    throw new AiProblem("The AI couldn't write this one. Try again with more product details.");
  }
}

export class AiProblem extends Error {}

const facts = (pairs: [string, string | null | undefined][]) =>
  pairs.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v!.trim().slice(0, 3000)}`).join("\n");

export function writeProductCopy(details: { name: string; category?: string | null; price?: string | null; colors?: string | null; sizes?: string | null; material?: string | null; notes?: string | null }) {
  return ask(
    ProductCopy,
    `Write the store copy for this product.\n\n${facts([
      ["Name", details.name],
      ["Category", details.category],
      ["Price (INR)", details.price],
      ["Colours", details.colors],
      ["Sizes", details.sizes],
      ["Material", details.material],
      ["Details from the admin", details.notes],
    ])}`,
  );
}

export function writeSeoCopy(page: { kind: string; label: string; path: string; currentTitle: string; currentDescription: string; context?: string | null }) {
  return ask(
    SeoCopy,
    `Suggest a search title and description for this page of the store.\n\n${facts([
      ["Page type", page.kind],
      ["Page", page.label],
      ["URL", page.path],
      ["Current title", page.currentTitle],
      ["Current description", page.currentDescription],
      ["Page content", page.context],
    ])}`,
  );
}
