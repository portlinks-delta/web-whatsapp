import { act, fireEvent, render, screen } from "@testing-library/react";
import GroupScrapper from "./GroupScrapper";
import { downloadContacts } from "./contactExport";
jest.mock("./contactExport", () => ({ downloadContacts: jest.fn() }));

test("requests full participant IDs and adds only resolved phone numbers to senders", () => {
  localStorage.setItem("session", "session");
  const listeners = {};
  const socket = {
    on: (event, handler) => {
      listeners[event] = handler;
    },
    off: (event) => {
      delete listeners[event];
    },
    emit: jest.fn(),
  };
  const addToSendersList = jest.fn();
  render(
    <GroupScrapper
      socket={socket}
      id="session"
      addToSendersList={addToSendersList}
      setOpenGroupScrapper={() => {}}
    />,
  );
  act(() =>
    listeners.allChats({
      id: "session",
      allChats: [
        {
          id: { _serialized: "123@g.us" },
          name: "Test group",
          isGroup: true,
          groupMetadata: {
            participants: [
              {
                id: {
                  _serialized: "107932729524224@lid",
                  user: "107932729524224",
                },
              },
              {
                id: {
                  _serialized: "30112200294598@lid",
                  user: "30112200294598",
                },
              },
            ],
          },
        },
      ],
    }),
  );
  fireEvent.click(screen.getByText("Test group"));
  fireEvent.click(
    screen.getByRole("button", { name: /get contacts from selected groups/i }),
  );
  expect(socket.emit).toHaveBeenCalledWith("getGroupContacts", {
    id: "session",
    requestId: 1,
    participantIds: ["107932729524224@lid", "30112200294598@lid"],
  });
  act(() =>
    listeners.groupContacts({
      id: "session",
      requestId: 1,
      contacts: [
        {
          id: "919876543210@c.us",
          number: "919876543210",
          name: "Saved member",
        },
        { id: "30112200294598@lid", number: null, name: "Other member" },
      ],
    }),
  );
  expect(screen.getByText("Saved member")).toBeInTheDocument();
  expect(screen.getByText("+919876543210")).toBeInTheDocument();
  expect(screen.getByText("Phone number unavailable")).toBeInTheDocument();
  expect(screen.queryByText("30112200294598")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /add to senders list/i }));
  expect(addToSendersList).toHaveBeenCalledWith({
    919876543210: "Saved member",
  });
});

test.each([true, false])(
  "group export fetches contacts first (selected groups: %s)",
  (selectGroup) => {
    localStorage.setItem("session", "session");
    const listeners = {};
    const socket = {
      on: (event, handler) => {
        listeners[event] = handler;
      },
      off: (event) => {
        delete listeners[event];
      },
      emit: jest.fn(),
    };
    render(
      <GroupScrapper
        socket={socket}
        id="session"
        addToSendersList={() => {}}
        setOpenGroupScrapper={() => {}}
      />,
    );
    act(() =>
      listeners.allChats({
        id: "session",
        allChats: ["One", "Two"].map((name, index) => ({
          id: { _serialized: `${index}@g.us` },
          name,
          isGroup: true,
          groupMetadata: {
            participants: [{ id: { _serialized: `${index}@lid` } }],
          },
        })),
      }),
    );
    if (selectGroup) fireEvent.click(screen.getByText("One"));
    fireEvent.click(
      screen.getByRole("button", { name: /export group contacts/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
    expect(downloadContacts).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("getGroupContacts", {
      id: "session",
      requestId: 1,
      participantIds: selectGroup ? ["0@lid"] : ["0@lid", "1@lid"],
    });
    const contacts = [
      {
        name: "Resolved member",
        number: "919876543210",
        id: "919876543210@c.us",
      },
    ];
    act(() =>
      listeners.groupContacts({ id: "session", requestId: 1, contacts }),
    );
    expect(downloadContacts).toHaveBeenCalledWith(contacts, "Text");
  },
);
