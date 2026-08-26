import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const owner = "שמעון הרצל הלוי גובני";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(target));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

test("declares the exact copyright owner without claiming third-party material", async () => {
  const [notice, policy, runtime] = await Promise.all([
    read("COPYRIGHT.md"),
    read("copyright.html"),
    read("ownership.js"),
  ]);

  for (const source of [notice, policy, runtime]) assert.match(source, new RegExp(owner));
  assert.match(notice, /All rights reserved/i);
  assert.match(policy, /כל הזכויות שמורות/);
  assert.match(policy, /תכני צד שלישי/);
  assert.match(notice, /Ministry of Education materials/i);
});

test("loads the ownership notice on every HTML surface", async () => {
  const [analytics, progress] = await Promise.all([read("analytics.js"), read("progress.js")]);
  assert.match(analytics, /ownership\.js\?v=1/);
  assert.match(progress, /ownership\.js\?v=1/);

  for (const file of await htmlFiles(root)) {
    const html = await readFile(file, "utf8");
    assert.match(html, /(?:analytics|progress)\.js/, path.relative(root, file));
  }

  const wordForge = await read("word-forge/index.html");
  assert.match(wordForge, /Word Forge — English Basics/);
  assert.match(wordForge, /ENGLISH BASICS · WORD FORGE/);
  assert.match(wordForge, new RegExp(owner));
});
