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

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_KEY,
  })
);

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
    choices: [
      "Summarize the following",
      "List key takeaways",
      "List all entities, grouped by type or category",
      "List all other URLs mentioned",
      "Write an abstract for the following",
      customPromptChoice,
    ],
  },
  {
    type: "input",
    name: "customPrompt",
    message: "Custom prompt (the URL's content comes after this prompt):",
    when: (answers) => answers.prompt === customPromptChoice,
  },
]);

/**
 * Run the prompt and URL's content through OpenAI's API
 */
const prompt = answers.customPrompt ?? answers.prompt;
const content = article.textContent.replace(/\n/g, " ");
const oraOptions = {
  spinner: cliSpinners.earth,
  text: "Generating response...",
};
const response = await oraPromise(
  openai.createCompletion({
    model: "text-davinci-003",
    prompt: `${prompt}:\n\n${content}`,
    temperature: 0.7,
    max_tokens: 500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  }),
  oraOptions
);

console.log(`\n${colors.bgGreen(colors.black("Response:"))}`);
console.log(response.data.choices[0].text);
