const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSendMessageHandler } = require("./send-message");
class Media {
  constructor(mimeType, data, filename) { Object.assign(this, { mimeType, data, filename }); }
}
const payload = {
  id: "session", requestId: "request", contact: "919876543210",
  message: { type: "media", content: "data:image/png;base64,aGVsbG8=", mimeType: "image/png", fileName: "image.png", caption: "" },
};
const handler = (client) => createSendMessageHandler({
  getClient: () => client, MessageMedia: Media, timeoutMs: 20, lookupTimeoutMs: 5,
});

test("photo without a caption sends without waiting for contact details", async () => {
  let calls = 0;
  const send = handler({
    getContactById: () => { throw new Error("Must not be called"); },
    sendMessage: async (id, media, options) => {
      calls++;
      assert.equal(id, "919876543210@c.us");
      assert.equal(media.data, "aGVsbG8=");
      assert.equal(options.caption, "");
      return { id: "sent-id" };
    },
  });
  const result = await send(payload);
  assert.equal(result.status, "sent");
  assert.equal(result.message.content, "image.png");
  assert.equal(payload.message.content, "data:image/png;base64,aGVsbG8=");
  assert.equal(calls, 1);
});

test("a rejected upload returns an actionable failed result", async () => {
  const result = await handler({ sendMessage: async () => { throw new Error("Upload failed"); } })(payload);
  assert.equal(result.status, "failed");
  assert.equal(result.error, "Upload failed");
  assert.equal(result.requestId, "request");
  assert.equal(result.message.content, "image.png");
});

test("a hanging upload returns unconfirmed without retrying", async () => {
  let calls = 0;
  const result = await handler({ sendMessage: () => { calls++; return new Promise(() => {}); } })(payload);
  assert.equal(result.status, "unknown");
  assert.match(result.error, /Check the chat before retrying/);
  assert.equal(calls, 1);
});

test("missing client and malformed attachments return failed results", async () => {
  assert.equal((await handler(null)(payload)).status, "failed");
  const result = await handler({})( { ...payload, message: { ...payload.message, content: "invalid" } });
  assert.equal(result.status, "failed");
  assert.match(result.error, /Attach the file again/);
});

test("caption templates fall back when contact lookup stalls", async () => {
  const result = await handler({
    getContactById: () => new Promise(() => {}),
    sendMessage: async (_, media, options) => {
      assert.equal(options.caption, "Hello 919876543210");
      return { id: "sent" };
    },
  })({ ...payload, message: { ...payload.message, caption: "Hello __fullname__" } });
  assert.equal(result.status, "sent");
});

test("no send confirmation is not reported as success", async () => {
  const result = await handler({ sendMessage: async () => undefined })(payload);
  assert.equal(result.status, "unknown");
});
