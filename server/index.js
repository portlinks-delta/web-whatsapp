const express = require("express");
const {
  Client,
  LocalAuth,
  RemoteAuth,
  MessageMedia,
} = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // .env is optional; environment variables may be supplied by the shell instead.
}

const app = express();
const DEFAULT_PORT = 5001;
const configuredPort = (process.env.SERVER_PORT || "").trim();
const port = configuredPort ? Number(configuredPort) : DEFAULT_PORT;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    `SERVER_PORT must be an integer between 1 and 65535 (received "${configuredPort}").`
  );
}
if (!configuredPort) {
  console.log(`SERVER_PORT is not set; falling back to default port ${DEFAULT_PORT}.`);
}
const defaultChromePath =
  process.platform === "win32" &&
  fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : undefined;
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 150 * 1024 * 1024, // Allow Base64 encoding of a 100 MB attachment.
});

const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
let store;

const storeReady = MONGO_URI
  ? mongoose
      .connect(MONGO_URI)
      .then(() => {
        console.log("MongoDB connected");
        store = new MongoStore({ mongoose: mongoose });
        return store;
      })
      .then(() => {
        console.log("MongoStore is ready");
      })
      .catch((err) => {
        console.error("Failed to connect to MongoDB:", err.message);
        return null;
      })
  : Promise.resolve();

app.use(express.json());

server.listen(port, () => {
  console.log("listening on *:", port);
});

const allSessionsObject = {};
const initializingSessions = new Set();
const { createSessionEvents } = require("./session-events");
const sessionEvents = createSessionEvents();
const { resolveGroupContacts } = require("./group-contacts");
const { createSendMessageHandler } = require("./send-message");
const sendWhatsappMessage = createSendMessageHandler({
  getClient: (id) => allSessionsObject[id],
  MessageMedia,
});

const createWhatsappSession = async (id) => {
  if (initializingSessions.has(id)) {
    console.log("WhatsApp session is already starting:", id);
    return;
  }

  initializingSessions.add(id);
  console.log("Creating WhatsApp session for:", id);
  let client;
  try {
    await storeReady;
    if (MONGO_URI && !store) {
      throw new Error("MongoDB session storage is unavailable");
    }
    client = new Client({
      puppeteer: {
        headless: true,
        ...(process.env.CHROME_PATH || defaultChromePath
          ? { executablePath: process.env.CHROME_PATH || defaultChromePath }
          : {}),
      },
      authStrategy: MONGO_URI
        ? new RemoteAuth({
            clientId: id,
            store: store,
            backupSyncIntervalMs: 300000,
          })
        : new LocalAuth({ clientId: id }),
      webVersionCache: {
        type: "none",
        // type: "remote",
        // remotePath:
        //   "https://raw.githubusercontent.com/guigo613/alternative-wa-version/main/html/2.2413.51.html",
      },
    });
    client.on("qr", (qr) => {
      console.log("QR Code received for client:", id);
      sessionEvents.emit(id, "qr", { id, qr });
    });

    client.on("authenticated", () => {
      console.log("Client authenticated:", id);
      sessionEvents.emit(id, "authenticated", { id });
    });

    client.on("loading_screen", (data) => {
      console.log("Loading screen data:", data);
      sessionEvents.emit(id, "loading_screen", {
        id,
        data,
        message: "screen loading",
      });
    });

    client.on("ready", () => {
      console.log("Client is ready:", id);
      allSessionsObject[id] = client;
      initializingSessions.delete(id);
      sessionEvents.emit(id, "ready", { id, message: "Client is ready!" });
    });

    client.on("disconnected", (reason) => {
      console.log("Client disconnected:", id, reason);
      initializingSessions.delete(id);
      delete allSessionsObject[id];
      sessionEvents.emit(id, "disconnected", {
        id,
        message: "Client is disconnected!",
      });
    });

    client.on("remote_session_saved", () => {
      console.log("Remote session saved for client:", id);
      sessionEvents.emit(id, "remote_session_saved", {
        message: "remote_session_saved",
      });
    });

    await client.initialize();
  } catch (error) {
    console.error("Unable to create WhatsApp session:", error);
    if (client) {
      client.removeAllListeners();
      await client.destroy().catch((cleanupError) => {
        console.error(
          "Unable to close failed WhatsApp browser:",
          cleanupError.message,
        );
      });
    }
    initializingSessions.delete(id);
    delete allSessionsObject[id];
    sessionEvents.emit(id, "error", {
      id,
      type: "session_err",
      message: error.message || "Unable to start WhatsApp",
    });
  }
};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    sessionEvents.unsubscribe(socket);
    console.log("User disconnected:", socket.id);
  });

  socket.on("createSession", (data) => {
    const { id } = data;
    console.log("Creating session for:", id);
    sessionEvents.subscribe(id, socket);
    if (allSessionsObject[id]) {
      socket.emit("ready", { id, message: "Client is ready!" });
    } else createWhatsappSession(id);
  });

  socket.on("getGroupContacts", async ({ id, participantIds, requestId }) => {
    try {
      const client = allSessionsObject[id];
      if (!client)
        throw new Error("Reconnect WhatsApp before loading contacts.");
      if (
        !Array.isArray(participantIds) ||
        participantIds.some(
          (value) =>
            typeof value !== "string" || !/^\d+@(lid|c\.us)$/.test(value),
        )
      ) {
        throw new Error(
          "Invalid group participant IDs. Reload the groups and try again.",
        );
      }
      const contacts = await resolveGroupContacts(client, participantIds);
      socket.emit("groupContacts", { id, requestId, contacts });
    } catch (error) {
      socket.emit("groupContactsError", {
        id,
        requestId,
        message: error.message,
      });
    }
  });

  socket.on("getAllChats", async (data) => {
    const { id } = data;
    const client = allSessionsObject[id];
    if (client) {
      try {
        const allChats = await client.getChats({ includeGroups: true });
        socket.emit("allChats", { id, allChats });
      } catch (error) {
        console.warn(
          "whatsapp-web.js getChats failed; trying the raw WhatsApp group store:",
          error.message,
        );

        try {
          const groupChats = await client.pupPage.evaluate(() => {
            const chats = window
              .require("WAWebCollections")
              .Chat.getModelsArray();

            return chats
              .filter(
                (chat) =>
                  chat.id?._serialized?.endsWith("@g.us") && chat.groupMetadata,
              )
              .map((chat) => {
                const groupMetadata = chat.groupMetadata.serialize();
                return {
                  ...chat.serialize(),
                  isGroup: true,
                  isMuted: chat.mute?.expiration !== 0,
                  isReadOnly: groupMetadata.announce,
                  formattedTitle: chat.formattedTitle,
                  groupMetadata,
                };
              });
          });

          console.log(
            `Loaded ${groupChats.length} groups from WhatsApp's raw chat store`,
          );
          socket.emit("allChats", { id, allChats: groupChats });
        } catch (fallbackError) {
          console.error("Unable to load WhatsApp groups:", fallbackError);
          socket.emit("allChatsError", {
            id,
            message:
              fallbackError.message ||
              error.message ||
              "Unable to load WhatsApp groups",
          });
        }
      }
    } else {
      socket.emit("allChatsError", {
        id,
        message: "WhatsApp needs to reconnect before groups can be loaded",
      });
    }
  });

  socket.on("logout", async (data) => {
    const { id } = data;
    const client = allSessionsObject[id];
    if (client) {
      await client.logout();
      console.log("Logged out successfully:", id);
      delete allSessionsObject[id];
      socket.emit("logout", { id, message: "Logged out successfully" });
    } else {
      socket.emit("error", {
        id,
        type: "client_err",
        message: "Client not found",
      });
    }
  });

  socket.on("validate-numbers", async (data) => {
    const { id, contacts } = data;
    const client = allSessionsObject[id];
    if (client) {
      let contactDetails = {};
      try {
        for (const contact of Object.keys(contacts)) {
          const isValidContact = contact.includes("@g.us")
            ? true
            : await client.getNumberId(contact);
          if (isValidContact) {
            contactDetails[contact] = contacts[contact];
          }
        }

        socket.emit("validate-numbers", { id, contacts: contactDetails });
      } catch (error) {
        console.error("Error validating number", error);
        socket.emit("error", { id, message: "Error validating number" });
      }
    } else {
      socket.emit("error", {
        id,
        type: "client_err",
        message: "Client not found",
      });
    }
  });

  socket.on("get-contact-details", async (data) => {
    const { id, contacts } = data;
    const client = allSessionsObject[id];
    if (client) {
      let contactDetails = {};
      try {
        for (const contact of contacts) {
          let contactId = contact.includes("@g.us")
            ? contact
            : `${contact}@c.us`;

          contactDetails[contact] = await client.getContactById(contactId);
        }

        socket.emit("contact-details", { id, contactDetails });
      } catch (error) {
        console.error("Error fetching details", error);
        socket.emit("error", { id, message: "Error fetching details" });
      }
    } else {
      socket.emit("error", {
        id,
        type: "client_err",
        message: "Client not found",
      });
    }
  });

  socket.on("sendMessage", async (data, acknowledge) => {
    const result = await sendWhatsappMessage(data || {});
    if (typeof acknowledge === "function") acknowledge(result);
    // Keep events for clients that have not refreshed yet.
    socket.emit(
      result.status === "sent" ? "message-sent" : "message-failed",
      result,
    );
    if (result.error)
      console.error("WhatsApp send result:", result.status, result.error);
  });
});
