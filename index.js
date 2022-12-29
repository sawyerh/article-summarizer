import { Configuration, OpenAIApi } from "openai";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import cliSpinners from "cli-spinners";
import dotenv from "dotenv";
import inquirer from "inquirer";
import { oraPromise } from "ora";
import * as colors from "yoctocolors";

// Load .env file
dotenv.config();

const prompts = [
  {
    prompt: "Summarize this",
    combinationPrompt: "Combine these summaries into an overall summary:",
  },
  {
    prompt: "List 10 key takeaways",
    combinationPrompt:
      "Combine these takeaways into an overall list of 10 key takeaways",
  },
  {
    prompt: "List all entities, grouped by type or category",
    combinationPrompt:
      "Combine these lists of entities, but preserve the grouping",
  },
  {
    prompt: "Write an abstract for this",
    combinationPrompt: "Write an abstract for this",
  },
];

async function createCompletion(prompt) {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_KEY,
    })
  );

  const response = await openai.createCompletion({
    prompt,
    model: "text-davinci-003",
    // 0.1 provides more straightforward and consistent responses. Higher numbers provides more diverse responses.
    temperature: 0.1,
    max_tokens: 500,
  });

  return response;
}

/**
 * Get the main content of the URL
 */
const url = process.argv[2];
if (!url) {
  console.error("Pass a URL as the last argument");
  process.exit(1);
}
const dom = await JSDOM.fromURL(url);
const article = new Readability(dom.window.document).parse();
if (!article) {
  console.error("Couldn't parse the URL");
  process.exit(1);
}
console.log(`${colors.bgCyan(colors.black(` ${article.title} `))}\n`);

/**
 * Get the prompt from the user
 */
const customPromptChoice = "[Custom prompt]";
const answers = await inquirer.prompt([
  {
    type: "list",
    name: "prompt",
    message: "Select prompt:",
    choices: [...prompts.map((p) => p.prompt), customPromptChoice],
  },
  {
    type: "input",
    name: "customPrompt",
    message: "Custom prompt (e.g 'Summarize this')",
    when: (answers) => answers.prompt === customPromptChoice,
  },
  {
    type: "input",
    name: "customCombinationPrompt",
    message:
      "Custom combination prompt (e.g 'Combine these summaries into an overall summary')",
    when: (answers) => answers.prompt === customPromptChoice,
  },
]);

/**
 * Setup the inputs for running the prompt
 */
const prompt = answers.customPrompt ?? answers.prompt;
const combinationPrompt =
  answers.customCombinationPrompt ??
  prompts.find((p) => p.prompt === prompt).combinationPrompt;
const content = article.textContent.replace(/\n/g, " ");

/**
 * Break the page's content into roughly equally distributed
 * chunks while preserving sentences, so that we don't exceed
 * the API's max token limit
 */
const maxChunkSize = 2750 * 4; // ~1 token = 4 characters
const chunks = [];
let chunk = "";
for (const sentence of content.split(/(?<=[.?!])\s+/)) {
  if (chunk.length + sentence.length > maxChunkSize) {
    chunks.push(chunk);
    chunk = "";
  }
  chunk += sentence + " ";
}

/**
 * Run each chunk of content through the prompt
 */
const responses = await Promise.all(
  // limit to 20 chunks to avoid excessive API usage
  chunks.slice(0, 20).map((chunk, i) =>
    oraPromise(
      async () => {
        const response = await createCompletion(
          `${prompt}:\n\n###${chunk}\n\n###`
        );
        return response;
      },
      {
        spinner: cliSpinners.earth,
        text: "Generating response...",
      }
    )
  )
);

if (chunks.length > 1) {
  /**
   * Do one final request to the API to get the final response
   */
  const combinedResponses = responses
    .map((r) => r.data.choices[0].text)
    .join("\n----\n");
  const combinedResponse = await oraPromise(
    createCompletion(`${combinationPrompt}:\n\n###${combinedResponses}\n\n###`),
    {
      spinner: cliSpinners.hamburger,
      text: "Combining responses...",
    }
  );

  console.log(
    colors.bgYellow(
      colors.black(`Since the site content was so large, the response is from a
        series of responses (${chunks.length}) to smaller chunks of the content.
        Below is the final response, which runs a similar prompt on the combination
        of responses.`)
    )
  );

  console.log(combinedResponse.data.choices[0].text);
} else {
  console.log(responses[0].data.choices[0].text);
}
