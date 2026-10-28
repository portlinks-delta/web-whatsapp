import * as XLSX from "xlsx";

export const contactRows = (contacts) => {
  const unique = new Map();
  contacts.forEach(({ name, number }) => {
    if (typeof number !== "string" || !/^\d+$/.test(number)) return;
    const row = { Name: name?.trim() || "N/A", "Phone Number": number };
    if (!unique.has(number) || unique.get(number).Name === "N/A") unique.set(number, row);
  });
  return [...unique.values()];
};

export const createContactExport = (contacts, format) => {
  const rows = contactRows(contacts);
  if (!rows.length) throw new Error("No phone numbers are available to export.");
  if (format === "Excel") {
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 30 }, { wch: 22 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Contacts");
    return {
      filename: "contacts.xlsx",
      blob: new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    };
  }
  const clean = (value) => value.replace(/[\t\r\n]+/g, " ");
  const text = ["Name\tPhone Number",
    ...rows.map((row) => `${clean(row.Name)}\t${row["Phone Number"]}`)].join("\r\n");
  return { filename: "contacts.txt", blob: new Blob([text], { type: "text/plain;charset=utf-8" }) };
};

export const downloadContacts = (contacts, format) => {
  const { filename, blob } = createContactExport(contacts, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
