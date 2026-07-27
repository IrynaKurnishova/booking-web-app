import { readFileSync } from "node:fs";
import path from "node:path";

let cached = null;

export function loadSalonConfig() {
  if (cached) return cached;
  const configPath = path.join(process.cwd(), "data", "salon-config.json");
  cached = JSON.parse(readFileSync(configPath, "utf-8"));
  return cached;
}
