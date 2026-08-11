import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders Warden of the Wild", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Warden of the Wild<\/title>/i);
  assert.match(html, /WARDEN OF THE WILD/);
  assert.match(html, /CALL FIRST WAVE/);
  assert.match(html, /THERMAL SHOCK/);
  assert.match(html, /PERMAFROST/);
  assert.match(html, /SUPERCONDUCT/);
  assert.match(html, /WILDFIRE/);
  assert.match(html, /OVERGROWTH ARC/);
  assert.match(html, /TOXIC FLAME/);
  assert.match(html, /SETTINGS/);
  assert.match(html, /SOUND ON/);
  assert.match(html, /AUTO WAVES/);
  assert.match(html, /Place a root snare/);
  assert.match(html, /Lifebloom/);
  assert.match(html, /FIELD GUIDE/);
  assert.match(html, /CHOOSE LEVEL/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);

  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Screen shake/);
  assert.match(source, /Damage numbers/);
  assert.match(source, /WARDEN&apos;S BRIEF/);
  assert.match(source, /warden-tutorial-done/);
  assert.match(source, /warden-auto-waves/);
});
