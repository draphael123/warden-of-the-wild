import assert from "node:assert/strict";
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
  assert.match(html, /SETTINGS/);
  assert.match(html, /SOUND ON/);
  assert.match(html, /Place a root snare/);
  assert.match(html, /Lifebloom/);
  assert.match(html, /FIELD GUIDE/);
  assert.match(html, /CHOOSE LEVEL/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
