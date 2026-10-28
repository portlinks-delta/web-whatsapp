const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSessionEvents } = require("./session-events");
const socket = () => ({ events: [], emit(...args) { this.events.push(args); } });

test("a reconnect receives the cached QR and future QR rotations", () => {
  const events = createSessionEvents();
  const original = socket();
  const replacement = socket();
  events.subscribe("session", original);
  events.emit("session", "qr", { id: "session", qr: "first" });
  events.unsubscribe(original);
  events.subscribe("session", replacement);
  events.emit("session", "qr", { id: "session", qr: "rotated" });
  assert.equal(original.events.length, 1);
  assert.deepEqual(replacement.events.map(([, data]) => data.qr), ["first", "rotated"]);
});

test("authentication replaces cached QR and sessions stay isolated", () => {
  const events = createSessionEvents();
  const first = socket();
  const other = socket();
  const replacement = socket();
  events.subscribe("one", first);
  events.subscribe("two", other);
  events.emit("one", "qr", { id: "one", qr: "qr" });
  events.emit("one", "authenticated", { id: "one" });
  events.subscribe("one", replacement);
  assert.deepEqual(replacement.events, [["authenticated", { id: "one" }]]);
  assert.equal(other.events.length, 0);
});

test("repeated subscriptions do not duplicate events; errors clear cached state", () => {
  const events = createSessionEvents();
  const client = socket();
  events.subscribe("one", client);
  events.subscribe("one", client);
  events.emit("one", "error", { id: "one", type: "session_err" });
  assert.equal(client.events.length, 1);
  const retry = socket();
  events.subscribe("one", retry);
  assert.equal(retry.events.length, 0);
});
