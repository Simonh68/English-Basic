import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mainTreeHtmlFiles } from "../scripts/main-tree-scope.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const owner = "שמעון הרצל הלוי גובני";

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

test("loads the ownership notice on every main-tree HTML surface", async () => {
  const [analytics, progress] = await Promise.all([read("analytics.js"), read("progress.js")]);
  assert.match(analytics, /ownership\.js\?v=1/);
  assert.match(progress, /ownership\.js\?v=1/);

  for (const file of mainTreeHtmlFiles()) {
    const html = await read(file);
    assert.match(html, /(?:analytics|progress)\.js/, file);
  }

  const wordForge = await read("word-forge/index.html");
  assert.match(wordForge, /Word Forge — English Basics/);
  assert.match(wordForge, /ENGLISH BASICS · WORD FORGE/);
  assert.match(wordForge, new RegExp(owner));
});
