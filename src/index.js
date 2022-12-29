import { config } from "dotenv";
import { runCliPrompts } from "./cli-prompts.js";
import { parseUrl } from "./parse-url.js";
import { logger } from "./logger.js";
import { getCompletion } from "./completions.js";

// Load .env file
config();

/**
 * 1. Get the main content of the URL
 */
const article = await parseUrl();
const content = article.textContent.replace(/\n/g, " ");
logger.info(article.title);

/**
 * 2. Get the prompt from the user
 */
const { prompt, combinationPrompt } = await runCliPrompts();

/**
 * 3. Run the prompt against the URL's content
 */
const completion = await getCompletion({
  content,
  prompt,
  combinationPrompt,
});

logger.success("Response ⤵️ ");

logger.log(completion);
