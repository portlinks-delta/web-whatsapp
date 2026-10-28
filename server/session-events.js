// Keep session events attached to the current connections, not the socket that
// happened to start Chromium. Replay the current state after a reconnect.
const createSessionEvents = () => {
  const sessions = new Map();
  return {
    subscribe(id, socket) {
      let session = sessions.get(id);
      if (!session) {
        session = { sockets: new Set(), latest: null };
        sessions.set(id, session);
      }
      session.sockets.add(socket);
      if (session.latest) socket.emit(...session.latest);
    },
    emit(id, event, data) {
      const session = sessions.get(id);
      if (!session) return;
      if (["qr", "authenticated", "ready", "error", "disconnected"].includes(event)) {
        session.latest = [event, data];
      }
      for (const socket of session.sockets) socket.emit(event, data);
      if (event === "error" || event === "disconnected") sessions.delete(id);
    },
    unsubscribe(socket) {
      for (const session of sessions.values()) session.sockets.delete(socket);
    },
  };
};

module.exports = { createSessionEvents };
