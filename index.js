import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { Configuration, OpenAIApi } from "openai";
import inquirer from "inquirer";
import dotenv from "dotenv";
import cliSpinners from "cli-spinners";
import { oraPromise } from "ora";

dotenv.config();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_KEY,
  })
);

const url = process.argv[2];
if (!url) {
  console.error("Pass a URL as the last argument");
  process.exit(1);
}

const customPromptChoice = "[Custom prompt]";
const answers = await inquirer.prompt([
  {
    type: "list",
    name: "prompt",
    message: "Select prompt:",
    choices: [
      "Summarize the following",
      "List 10 key takeaways",
      "List all entities, grouped by entity type",
      "List all other URLs mentioned",
      "Write an executive summary for the following",
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

const prompt = answers.customPrompt ?? answers.prompt;
const dom = await JSDOM.fromURL(url);
const article = new Readability(dom.window.document).parse();

if (!article) {
  console.error("Couldn't parse the URL");
  process.exit(1);
}

const content = article.content.replace(/\n/g, " ");
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

console.log(response.data.choices[0].text);
