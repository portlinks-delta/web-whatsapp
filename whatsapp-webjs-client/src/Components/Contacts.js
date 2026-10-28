import React, { useEffect, useState } from "react";
import AddBoxIcon from "@mui/icons-material/AddBox";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import DeleteIcon from "@mui/icons-material/Delete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import Grid from "@mui/material/Grid";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import * as XLSX from "xlsx";

const initialState = {
  countryCodePrefix: "",
  inputContacts: "",
  contactList: [],
  validContactList: [],
  duplicates: [],
  removeDuplication: true,
};

const Contacts = (props) => {
  const { contacts, setContacts, handleValidateNumbers } = props;
  const [count, setCount] = useState({
    total: 0,
    group: 0,
  });
  const [error, setError] = useState([]);
  const [openManualImportDialog, setOpenManualImportDialog] = useState(false);
  const [contactManualImportData, setContactManualImportData] =
    useState(initialState);

  useEffect(() => {
    let count = Object.keys(contacts).length;
    setContacts(contacts);
    setCount((prevState) => ({
      ...prevState,
      total: count,
    }));
  }, [contacts]);

  const headCells = [
    { id: "name", label: "Name" },
    { id: "number", label: "Number" },
  ];

  const handleCountryCodePrefix = (e) => {
    let value = e.target.value;
    if (/^\d{0,3}$/.test(value)) {
      const { allContacts, validContacts, duplicateContacts } = parseContacts(
        contactManualImportData.inputContacts,
        value
      );
      setContactManualImportData((data) => ({
        ...data,
        contactList: allContacts,
        validContactList: validContacts,
        duplicates: duplicateContacts,
        countryCodePrefix: value,
      }));
    }
  };

  const handleImportDataChange = (value, type) => {
    setContactManualImportData((data) => ({
      ...data,
      [type]: value,
    }));
  };

  const handleContactChange = (e) => {
    const value = e.target.value;
    const { allContacts, validContacts, duplicateContacts } =
      parseContacts(value);
    setContactManualImportData((data) => ({
      ...data,
      inputContacts: value,
      contactList: allContacts,
      validContactList: validContacts,
      duplicates: duplicateContacts,
    }));
  };

  const parseContacts = (
    text,
    countryCode = contactManualImportData.countryCodePrefix
  ) => {
    const lines = text.split("\n");
    const contactMap = {};
    const allContacts = [];
    const validContacts = [];
    const duplicateContacts = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/); // Assuming input format is "name number"
      let name, number;
      if (parts.length === 1) {
        name = "N/A";
        number = parts[0];
      } else {
        name = parts[0];
        number = parts[1];
      }
      if (name && number && isValidWhatsAppContact(number.trim())) {
        const contact = {
          name: name.trim(),
          number: countryCode + number.trim(),
        };
        const contactKey = contact.number;
        allContacts.push(contact);
        if (contactMap[contactKey]) {
          duplicateContacts.push(contact);
        } else {
          contactMap[contactKey] = true;
          validContacts.push(contact);
        }
      }
    });

    return { allContacts, validContacts, duplicateContacts };
  };

  const isValidWhatsAppContact = (number) => {
    // Regular expression to validate phone number (international format)
    const phoneRegex = /^\d{1,15}$/;
    return phoneRegex.test(number);
  };

  const list = contactManualImportData.removeDuplication
    ? contactManualImportData.validContactList
    : contactManualImportData.contactList;

  const handleCloseManualImportDialog = () => {
    setOpenManualImportDialog(false);
    setContactManualImportData(initialState);
  };

  const handleImportManualContacts = () => {
    let newList = {...contacts};
    contactManualImportData.validContactList.forEach((contact) => {
      newList[contact.number] = contact.name;
    });
    setContacts(newList);
    setCount((prevState) => ({
      ...prevState,
      total: Object.keys(newList).length,
    }));
    handleCloseManualImportDialog();
  };

  const handleDelete = () => {
    setCount({
      total: 0,
      group: 0,
    });
    setContacts({});
  };

  const handleFileChange = (event) => {
    // setError(null);
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      let contactCount = 0;
      if (file.type === "text/plain") {
        // Parse text file
        const text = content.split("\n").map((line) => line.trim());
        let importList = {...contacts};
        if (text[0]?.split(",")?.[1]) {
          text.forEach((contact) => {
            let [name, number] = contact.split(",");
            if (!importList[number?.trim()]) {
              contactCount += 1;
            }
            importList[number?.trim()] = name;
          });
          setCount({
            total: count.total + contactCount,
            group: count.group + contactCount,
          });
        } else {
          text.forEach((data) => {
            if (!importList[data]) {
              contactCount += 1;
            }
            importList[data] = "N/A";
          });
          setCount((prevState) => ({
            ...prevState,
            total: count.total + contactCount,
          }));
        }
        setContacts(importList);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        // Parse Excel file
        const workbook = XLSX.read(content, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet);
        let importList = {...contacts};
        if (!jsonData[0]?.["Group ID"]) {
          jsonData = XLSX.utils.sheet_to_txt(worksheet);
          jsonData.split("\n").forEach((data) => {
            if (!importList[data]) {
              contactCount += 1;
            }
            importList[data] = "N/A";
          });
          setCount((prevState) => ({
            ...prevState,
            total: count.total + contactCount,
          }));
        } else {
          jsonData.forEach((data) => {
            if (!importList[data["Group ID"]?.trim()]) {
              contactCount += 1;
            }
            importList[data["Group ID"]?.trim()] = data["Group Name"];
          });
          setCount({
            total: count.total + contactCount,
            group: count.group + contactCount,
          });
        }
        setContacts(importList);
      } else {
        setError("Unsupported file type");
      }
    };

    if (file.type === "text/plain") {
      reader.readAsText(file);
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      reader.readAsBinaryString(file);
    } else {
      setError("Unsupported file type");
    }
    document.getElementById("file-input-import").value = "";
  };

  return (
    <div>
      <div style={{ display: "flex" }}>
        <span>Numbers</span>
        <AddBoxIcon
          style={{ cursor: "pointer" }}
          onClick={() => setOpenManualImportDialog(true)}
        />
        <input
          type="file"
          accept=".txt,.xlsx"
          id="file-input-import"
          hidden
          onChange={handleFileChange}
        />
        <label htmlFor="file-input-import">
          <ImportContactsIcon style={{ cursor: "pointer" }} />
        </label>
        <DeleteIcon style={{ cursor: "pointer" }} onClick={handleDelete} />
      </div>
      <div>
        <TableContainer
          sx={{ width: "max-content", overflow: "auto", height: "340px" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align="left"
                    padding="normal"
                    sortDirection={false}
                  >
                    {headCell.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(contacts).map(([contact, name]) => {
                return (
                  <TableRow tabIndex={-1} key={contact}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{contact}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <div>
          <Chip label={`total: ${count.total}`} />
          <Chip label={`contacts: ${count.total - count.group}`} />
          <Chip label={`groups: ${count.group}`} />
          <Button disabled={!Object.keys(contacts).length} onClick={handleValidateNumbers}>Validate Numbers</Button>
        </div>
      </div>

      <Dialog
        open={openManualImportDialog}
        onClose={handleCloseManualImportDialog}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <DialogTitle>Manual Import</DialogTitle>
          <IconButton
            aria-label="close"
            onClick={handleCloseManualImportDialog}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent>
          <InputLabel>Country Code (Prefix)</InputLabel>
          <TextField
            variant="standard"
            value={contactManualImportData.countryCodePrefix}
            onChange={handleCountryCodePrefix}
          />
          <InputLabel>Enter Contacts</InputLabel>
          <TextField
            id="outlined-multiline-static"
            multiline
            rows={4}
            value={contactManualImportData.inputContacts}
            onChange={handleContactChange}
          />
          <div>
            Line per number, you can name by enter name comma then mobile (name,
            number)
          </div>
          <div>
            <InputLabel>Validated Contacts</InputLabel>
          </div>
          <div>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <span>Name</span>
              </Grid>
              <Grid span xs={4}>
                <span>Number</span>
              </Grid>
              {list.map((contact) => (
                <>
                  <Grid span xs={8}>
                    <span>{contact.name}</span>
                  </Grid>
                  <Grid span xs={4}>
                    <span>{contact.number}</span>
                  </Grid>
                </>
              ))}
            </Grid>
            <div>
              <Chip label={`Total: ${list.length}`} />
              <Chip
                label={`Duplicates: ${contactManualImportData.duplicates.length}`}
              />
            </div>
          </div>
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  checked={contactManualImportData.removeDuplication}
                  onChange={(e) =>
                    handleImportDataChange(
                      e.target.checked,
                      "removeDuplication"
                    )
                  }
                />
              }
              label="Remove Duplication"
            />
          </div>
          <Button onClick={handleCloseManualImportDialog}>Cancel</Button>
          <Button
            disabled={!contactManualImportData.validContactList.length}
            onClick={handleImportManualContacts}
          >
            Import
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
