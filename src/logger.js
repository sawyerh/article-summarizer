import * as colors from "yoctocolors";

export const logger = {
  log: (message) => console.log(message),
  info: (message) =>
    console.log(`${colors.bgCyan(colors.black(` ${message} `))}\n`),
  error: (message) => console.log(`\n${colors.red(message)}\n`),
  success: (message) =>
    console.log(`${colors.bgGreen(colors.black(` ${message} `))}\n`),
  warn: (message) => console.log(`${colors.yellow(message)}\n`),
};
