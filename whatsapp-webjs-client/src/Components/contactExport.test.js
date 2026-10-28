import * as XLSX from "xlsx";
import { createContactExport } from "./contactExport";

const contacts = [
  { name: "Ayush", number: "919876543210" },
  { name: "Zoë", number: "00123456789" },
  { name: "Duplicate", number: "919876543210" },
  { name: "Unavailable", number: null, id: "123456@lid" },
];
const readBlob = (blob, method) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader[method](blob);
});

test("text export pairs Unicode names and phone numbers with column headers", async () => {
  const { blob, filename } = createContactExport(contacts, "Text");
  expect(filename).toBe("contacts.txt");
  expect(await readBlob(blob, "readAsText")).toBe(
    "Name\tPhone Number\r\nAyush\t919876543210\r\nZoë\t00123456789"
  );
});

test("Excel contains named columns and preserves phone numbers as text", async () => {
  const { blob, filename } = createContactExport(contacts, "Excel");
  expect(filename).toBe("contacts.xlsx");
  const workbook = XLSX.read(await readBlob(blob, "readAsArrayBuffer"), { type: "array" });
  const sheet = workbook.Sheets.Contacts;
  expect(XLSX.utils.sheet_to_json(sheet)).toEqual([
    { Name: "Ayush", "Phone Number": "919876543210" },
    { Name: "Zoë", "Phone Number": "00123456789" },
  ]);
  expect(sheet.B3.t).toBe("s");
});

test("unavailable numbers do not create an empty or misleading download", () => {
  expect(() => createContactExport([{ id: "123@lid", number: null }], "Text"))
    .toThrow("No phone numbers");
});
