import { sendRequest } from "./sendRequest";

const payload = { id: "session", requestId: "one", contact: "919876543210", message: { type: "media", fileName: "image.png" } };
const makeSocket = () => {
  const handlers = {};
  return {
    connected: true, handlers,
    on: (name, callback) => { handlers[name] = callback; },
    off: (name) => { delete handlers[name]; },
    emit: jest.fn(),
  };
};

test.each(["sent", "failed"])("resolves %s acknowledgements", async (status) => {
  const socket = makeSocket();
  socket.emit.mockImplementation((_, data, ack) => ack({ requestId: data.requestId, status }));
  expect((await sendRequest(socket, payload)).status).toBe(status);
  expect(socket.handlers.disconnect).toBeUndefined();
});

test("offline sends fail without buffering an upload", async () => {
  const socket = makeSocket();
  socket.connected = false;
  expect((await sendRequest(socket, payload)).status).toBe("failed");
  expect(socket.emit).not.toHaveBeenCalled();
});

test("timeout returns an unconfirmed result without resending", async () => {
  jest.useFakeTimers();
  const socket = makeSocket();
  const pending = sendRequest(socket, payload, 100);
  jest.advanceTimersByTime(100);
  expect((await pending).status).toBe("unknown");
  expect(socket.emit).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test("disconnect ends the wait and ignores late acknowledgements", async () => {
  const socket = makeSocket();
  const pending = sendRequest(socket, payload);
  socket.handlers.disconnect();
  socket.emit.mock.calls[0][2]({ requestId: "one", status: "sent" });
  expect((await pending).status).toBe("unknown");
});
