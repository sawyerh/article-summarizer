import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function parseUrl() {
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

  return article;
}
