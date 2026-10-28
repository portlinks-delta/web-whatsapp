const { replaceVariable, convertHtmlToWhatsappFormat, convertDateFormmat } = require("./helper");

const withTimeout = (promise, milliseconds, message) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(message);
        error.timedOut = true;
        reject(error);
      }, milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
};

function createSendMessageHandler({ getClient, MessageMedia, timeoutMs = 120000, lookupTimeoutMs = 10000 }) {
  return async (data = {}) => {
    const { id, requestId, contact, message = {} } = data;
    const result = {
      id, requestId, contact,
      message: { type: message.type, content: message.type === "media" ? message.fileName || "Attachment" : message.content || "" },
    };
    let sending = false;
    try {
      const client = getClient(id);
      if (!client) throw new Error("WhatsApp is not connected. Reconnect before sending.");
      if (typeof contact !== "string" || !/^(\d+|\d+(?:-\d+)?@g\.us)$/.test(contact)) {
        throw new Error("Invalid recipient. Use a phone number with country code or a group ID.");
      }
      if (!["text", "media"].includes(message.type)) throw new Error("Unsupported message type.");
      const contactId = contact.endsWith("@g.us") ? contact : `${contact}@c.us`;
      let text = message.type === "media" ? message.caption || "" : message.content;
      if (typeof text !== "string") throw new Error("Message text must be a string.");
      // A plain attachment must not wait for a contact lookup. Only resolve
      // details if a template actually uses them, with a bounded fallback.
      if (/__(fullname|firstname|lastname)__/.test(text)) {
        let details = data.contactDetails;
        if (!details) {
          details = await withTimeout(client.getContactById(contactId), lookupTimeoutMs, "Contact lookup timed out")
            .catch(() => null);
        }
        text = replaceVariable(text, details || { number: contact });
      }
      const formatted = convertHtmlToWhatsappFormat(text);
      let body = formatted;
      let options;
      if (message.type === "media") {
        const match = typeof message.content === "string" && message.content.match(/^data:[^,]*;base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match || !message.mimeType) throw new Error("Attachment data is missing or invalid. Attach the file again.");
        if (Buffer.byteLength(match[1], "base64") > 100 * 1024 * 1024) throw new Error("Attachment exceeds 100 MB.");
        body = new MessageMedia(message.mimeType, match[1], message.fileName);
        options = { caption: formatted };
      } else {
        result.message.content = formatted;
      }
      sending = true;
      const sent = await withTimeout(client.sendMessage(contactId, body, options), timeoutMs,
        "WhatsApp did not confirm the send in time. Check the chat before retrying; the file may still arrive.");
      if (!sent) {
        result.status = "unknown";
        result.error = "WhatsApp returned no send confirmation. Check the chat before retrying.";
      } else {
        result.status = "sent";
      }
    } catch (error) {
      result.status = sending && error.timedOut ? "unknown" : "failed";
      result.error = error.message || String(error);
    }
    result.sendingDateTime = convertDateFormmat(new Date());
    return result;
  };
}

module.exports = { createSendMessageHandler };
