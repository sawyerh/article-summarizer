import { Configuration, OpenAIApi } from "openai";
import cliSpinners from "cli-spinners";
import { oraPromise } from "ora";
import { logger } from "./logger.js";

/**
 *
 * @param {string} prompt
 * @param {"text-davinci-003"|"text-curie-001"} model - Davinci is the most powerful model, but it's also the most expensive
 * @returns
 */
async function createCompletion(prompt, model = "text-davinci-003") {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_KEY,
    })
  );

  const response = await openai.createCompletion({
    prompt,
    model,
    // 0.1 provides more straightforward and consistent responses. Higher numbers provides more diverse responses.
    temperature: 0.1,
    max_tokens: 500,
  });

  return response;
}

/**
 * Break the page's content into roughly equally distributed
 * chunks while preserving sentences, so that we don't exceed
 * the API's max token limit
 */
function chunkTheContent(content) {
  const maxChunkSize = 3500 * 4; // ~1 token = 4 characters
  const chunks = [];
  let chunk = "";
  for (const sentence of content.split(/(?<=[.?!])\s+/)) {
    if (chunk.length + sentence.length > maxChunkSize) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += sentence + " ";
  }

  if (chunks.length === 0) return [content];

  return chunks;
}

export async function getCompletion({ content, prompt, combinationPrompt }) {
  const chunks = chunkTheContent(content);

  const chunkRequests =
    // limit to 40 chunks to avoid excessive API usage
    chunks.slice(0, 40).map((chunk, index) =>
      oraPromise(
        async () => {
          const response = await createCompletion(
            `${prompt}:\n\n###${chunk}\n\n###`
          );
          return { index, response };
        },
        {
          spinner: cliSpinners.earth,
          text: "Generating response...",
        }
      )
    );

  const resolvedRequests = await Promise.all(chunkRequests);
  // Preserve the order of the content completions
  const responses = resolvedRequests
    .sort((a, b) => a.index - b.index)
    .map((r) => r.response);

  if (chunks.length === 1) return responses[0].data.choices[0].text;

  /**
   * Do one final completion against the combination of all the completions
   */
  const combinedCompletions = responses
    .map((r) => r.data.choices[0].text)
    .join("\n----\n");

  logger.info("Responses for all chunks ⤵️ ");
  console.log(combinedCompletions);
  logger.warn(
    `Since the page's content was so long, the prompt had to be ran against chunks of the content. The following response is formed by running a combination prompt against all ${chunks.length} of the chunks' responses above.`
  );

  const finalCompletion = await oraPromise(
    createCompletion(
      `${combinationPrompt}:\n\n###${combinedCompletions}\n\n###`
    ),
    {
      spinner: cliSpinners.moon,
      text: "Combining responses...",
    }
  );

  return finalCompletion.data.choices[0].text;
}
