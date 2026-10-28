import { act, fireEvent, render, screen } from "@testing-library/react";
import { io } from "socket.io-client";
import App from "./App";

jest.mock("socket.io-client", () => {
  const listeners = new Map();
  const socket = {
    listeners,
    connected: false,
    on: jest.fn((event, handler) => listeners.set(event, handler)),
    off: jest.fn((event) => listeners.delete(event)),
    emit: jest.fn(),
    receive: (event, data) => listeners.get(event)?.(data),
  };
  return { io: () => socket };
});
jest.mock("./Components/TextEditor/TextEditor", () => () => null);
jest.mock("react-qr-code", () => ({ value }) => <div data-testid="qr">{value}</div>);

const socket = io();
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  socket.listeners.clear();
  socket.on.mockImplementation((event, handler) => socket.listeners.set(event, handler));
  socket.off.mockImplementation((event) => socket.listeners.delete(event));
});

test("reconnect requests the existing session and displays QR despite loading events", () => {
  localStorage.setItem("session", "existing");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /open whatsapp/i }));
  act(() => socket.receive("connect"));
  expect(socket.emit).toHaveBeenLastCalledWith("createSession", { id: "existing" });
  act(() => socket.receive("qr", { id: "other", qr: "wrong" }));
  expect(screen.queryByTestId("qr")).not.toBeInTheDocument();
  act(() => socket.receive("qr", { id: "existing", qr: "valid-qr" }));
  act(() => socket.receive("loading_screen", { id: "existing" }));
  expect(screen.getByTestId("qr")).toHaveTextContent("valid-qr");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  act(() => socket.receive("authenticated", { id: "existing" }));
  expect(screen.queryByTestId("qr")).not.toBeInTheDocument();
});

test("opening repeatedly keeps one QR listener and unmount removes it", () => {
  const { unmount } = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /open whatsapp/i }));
  fireEvent.click(screen.getByRole("button", { name: "close" }));
  fireEvent.click(screen.getByText("Open Whatsapp"));
  expect(socket.on.mock.calls.filter(([event]) => event === "qr")).toHaveLength(1);
  unmount();
  expect(socket.off).toHaveBeenCalledWith("qr", expect.any(Function));
});

test("a stalled connection displays a retry action instead of spinning forever", () => {
  jest.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /open whatsapp/i }));
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /retry/i }));
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  jest.useRealTimers();
});
