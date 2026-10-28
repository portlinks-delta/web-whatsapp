import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { io } from "socket.io-client";
import Whatsapp from "./Whatsapp";

jest.mock("socket.io-client", () => {
  const listeners = new Map();
  const socket = {
    connected: true, listeners, emit: jest.fn(),
    on: (event, handler) => listeners.set(event, handler),
    off: (event) => listeners.delete(event),
  };
  return { io: () => socket };
});
jest.mock("./TextEditor/TextEditor", () => () => null);
jest.mock("./Contacts", () => ({ setContacts }) =>
  <button onClick={() => setContacts({ "919876543210": "Test recipient" })}>Select test recipient</button>);
jest.mock("./Attachment", () => ({ setMessages }) =>
  <button onClick={() => setMessages([{ type: "media", fileName: "photo.png", mimeType: "image/png", content: "data:image/png;base64,aGVsbG8=", caption: "" }])}>Attach test photo</button>);

const socket = io();
beforeEach(() => {
  socket.listeners.clear();
  localStorage.setItem("session", "session");
});

test.each(["sent", "failed", "unknown"])("photo result %s advances progress from 0/1 and shows the result", async (status) => {
  render(<Whatsapp />);
  act(() => socket.listeners.get("ready")({ id: "session" }));
  fireEvent.click(screen.getByText("Select test recipient"));
  fireEvent.click(screen.getByText("Attach test photo"));
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(screen.getByText("Sending Process: 0 / 1")).toBeInTheDocument();
  await waitFor(() => expect(socket.emit.mock.calls.some(([event]) => event === "sendMessage")).toBe(true));
  const [, payload, acknowledge] = socket.emit.mock.calls.find(([event]) => event === "sendMessage");
  await act(async () => acknowledge({
    id: "session", requestId: payload.requestId, contact: payload.contact,
    message: { type: "media", content: "photo.png" }, status,
    error: status === "sent" ? undefined : "Check the chat before retrying",
  }));
  expect(screen.getByText("Sending Process: 1 / 1")).toBeInTheDocument();
  expect(screen.getByText("photo.png")).toBeInTheDocument();
  if (status === "sent") {
    expect(screen.getByText("Messages sent successfully")).toBeInTheDocument();
  } else {
    expect(screen.queryByText("Messages sent successfully")).not.toBeInTheDocument();
    expect(screen.getByText("Check the chat before retrying")).toBeInTheDocument();
  }
  expect(socket.emit.mock.calls.filter(([event]) => event === "sendMessage")).toHaveLength(1);
});
