// One acknowledgement per send. Never buffer offline sends or automatically
// retry a timed-out upload: WhatsApp may already have accepted it.
export const sendRequest = (socket, payload, timeoutMs = 150000) => new Promise((resolve) => {
  const result = (status, error) => ({
    id: payload.id, requestId: payload.requestId, contact: payload.contact,
    message: { type: payload.message.type, content: payload.message.type === "media"
      ? payload.message.fileName || "Attachment" : payload.message.content },
    sendingDateTime: new Date().toLocaleString(), status, error,
  });
  if (!socket.connected) {
    resolve(result("failed", "Server disconnected. Reconnect before sending."));
    return;
  }
  let settled = false;
  let timer;
  const finish = (value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    socket.off("disconnect", disconnected);
    resolve(value);
  };
  const disconnected = () => finish(result("unknown",
    "Connection lost before confirmation. Check the WhatsApp chat before retrying."));
  socket.on("disconnect", disconnected);
  timer = setTimeout(() => finish(result("unknown",
    "No send confirmation received. Check the chat before retrying and make sure the updated server is running.")), timeoutMs);
  try {
    socket.emit("sendMessage", payload, (reply) => {
      if (reply?.requestId === payload.requestId && ["sent", "failed", "unknown"].includes(reply.status)) finish(reply);
    });
  } catch (error) {
    finish(result("failed", error.message));
  }
});
