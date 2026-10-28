const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveGroupContacts } = require("./group-contacts");

test("resolves LIDs to phone numbers, loads names, and deduplicates aliases", async () => {
  const client = {
    getContactLidAndPhone: async () => [{ lid: "123456@lid", pn: "919876543210@c.us" }],
    getContactById: async () => ({ name: "Saved contact" }),
  };
  assert.deepEqual(await resolveGroupContacts(client, [
    "123456@lid", "919876543210@c.us", "123456@lid",
  ]), [{ id: "919876543210@c.us", number: "919876543210", name: "Saved contact" }]);
});

test("never treats an unavailable LID or contact.number as a phone number", async () => {
  const client = {
    getContactLidAndPhone: async () => { throw new Error("No mapping"); },
    getContactById: async () => ({ pushname: "Member", number: "107932729524224" }),
  };
  assert.deepEqual(await resolveGroupContacts(client, ["107932729524224@lid"]),
    [{ id: "107932729524224@lid", number: null, name: "Member" }]);
});

test("one unavailable contact does not discard other group members", async () => {
  const client = {
    getContactLidAndPhone: async () => [{ pn: undefined }],
    getContactById: async () => { throw new Error("Unavailable"); },
  };
  const rows = await resolveGroupContacts(client, ["123@lid", "919876543210@c.us"]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].number, null);
  assert.equal(rows[1].number, "919876543210");
});

test("uses the original LID profile name when the phone contact has no name", async () => {
  const client = {
    getContactLidAndPhone: async () => [{ pn: "919876543210@c.us" }],
    getContactById: async (id) => id.endsWith("@lid") ? { pushname: "Profile name" } : {},
  };
  const rows = await resolveGroupContacts(client, ["123@lid", "919876543210@c.us"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Profile name");
});

test("prefers a saved contact name over a profile display name", async () => {
  const client = {
    getContactLidAndPhone: async () => [{ pn: "919876543210@c.us" }],
    getContactById: async (id) => id.endsWith("@lid")
      ? { name: "Saved name" } : { pushname: "Profile name" },
  };
  const [row] = await resolveGroupContacts(client, ["123@lid"]);
  assert.equal(row.name, "Saved name");
});

test("still loads the LID name if the phone contact lookup fails", async () => {
  const client = {
    getContactLidAndPhone: async () => [{ pn: "919876543210@c.us" }],
    getContactById: async (id) => {
      if (id.endsWith("@c.us")) throw new Error("Contact not loaded");
      return { pushname: "Available profile" };
    },
  };
  const [row] = await resolveGroupContacts(client, ["123@lid"]);
  assert.equal(row.name, "Available profile");
});
