import inquirer from "inquirer";

const customPromptChoice = "[Custom prompt]";
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

export async function runCliPrompts() {
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

  const prompt = answers.customPrompt ?? answers.prompt;
  const combinationPrompt =
    answers.customCombinationPrompt ??
    prompts.find((p) => p.prompt === prompt)?.combinationPrompt;

  return { prompt, combinationPrompt };
}
