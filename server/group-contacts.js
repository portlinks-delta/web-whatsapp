const phoneFromId = (id) =>
  typeof id === "string" && /^\d+@c\.us$/.test(id) ? id.split("@")[0] : null;

async function resolveGroupContacts(client, participantIds) {
  const contacts = new Map();
  const ids = [...new Set(participantIds)];
  // Limit simultaneous browser requests for large groups.
  for (let start = 0; start < ids.length; start += 5) {
    const rows = await Promise.all(ids.slice(start, start + 5).map(async (id) => {
      let phoneId = phoneFromId(id) ? id : null;
      if (!phoneId) {
        try {
          const [mapping] = await client.getContactLidAndPhone([id]);
          if (phoneFromId(mapping?.pn)) phoneId = mapping.pn;
        } catch {
          // Some participants do not have an available phone mapping.
        }
      }
      // WhatsApp may store the profile name on the LID contact while the
      // phone-number contact has only the number (or vice versa).
      const lookupIds = [...new Set([phoneId, id].filter(Boolean))];
      const profiles = await Promise.all(lookupIds.map((contactId) =>
        client.getContactById(contactId).catch(() => null)
      ));
      const name = ["name", "pushname", "verifiedName"]
        .flatMap((field) => profiles.map((profile) => profile?.[field]))
        .find((value) => typeof value === "string" && value.trim());
      return {
        id: phoneId || id,
        number: phoneFromId(phoneId),
        name: name?.trim() || "",
      };
    }));
    rows.forEach((row) => contacts.set(row.id, {
      ...row,
      name: row.name || contacts.get(row.id)?.name || "",
    }));
  }
  return [...contacts.values()];
}

module.exports = { resolveGroupContacts };
