import watchListJson from "../../review/data/law-watch-516.json";
import type { LawWatchListFile, LawWatchItem, LawWatchUnwatchable } from "./types";

const data = watchListJson as LawWatchListFile;

export function getLawWatchList516(): LawWatchItem[] {
  return data.items;
}

export function getLawWatchUnwatchable516(): LawWatchUnwatchable[] {
  return data.unwatchable;
}

export function getLawWatchListFile516(): LawWatchListFile {
  return data;
}
