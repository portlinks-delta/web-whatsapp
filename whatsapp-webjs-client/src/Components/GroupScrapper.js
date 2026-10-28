import React, { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import CircularProgress from "@mui/material/CircularProgress";
// import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FormControlLabel from "@mui/material/FormControlLabel";
import { validateSession } from "../helper";
import { downloadContacts } from "./contactExport";

const GroupScrapper = (props) => {
  const { socket, id, addToSendersList, setOpenGroupScrapper } = props;
  const [groupChats, setGroupChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [allChats, setAllChats] = useState([]);
  const [groupChatsWithId, setGroupChatsWithId] = useState([]);
  const [contactGroupList, setContactGroupList] = useState([]);
  const [allContactlength, setAllContactlength] = useState(0);
  const [selected, setSelected] = useState([]);
  const [contactObject, setContactObject] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const contactsRequest = useRef(0);
  const pendingExport = useRef(null);
  // const [page, setPage] = useState(0);
  // const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exportType, setExportType] = useState("");
  const [exportFormat, setExportFormat] = useState("Text");
  const [exportSelectedRows, setExportSelectedRows] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);

  useEffect(() => {
    if (allChats.length) {
      setValues(allChats);
    }
  }, [allChats]);

  useEffect(() => {
    const handleAllChats = (data) => {
      if (data.id === id && validateSession(data.id)) {
        setIsLoading(false);
        setLoadError("");
        setAllChats(data.allChats);
      }
    };

    const handleAllChatsError = (data) => {
      if (validateSession(data.id)) {
        setIsLoading(false);
        setLoadError(data.message);
      }
    };

    socket.on("allChats", handleAllChats);
    socket.on("allChatsError", handleAllChatsError);
    const handleContacts = (data) => {
      if (data.id !== id || data.requestId !== contactsRequest.current) return;
      setContactsLoading(false);
      setContactGroupList(data.contacts);
      setContactObject(Object.fromEntries(
        data.contacts.filter((contact) => contact.number)
          .map((contact) => [contact.number, contact.name || "N/A"])
      ));
      if (pendingExport.current) {
        const format = pendingExport.current;
        pendingExport.current = null;
        try {
          downloadContacts(data.contacts, format);
          setShowExportPopup(false);
        } catch (error) {
          setContactsError(error.message);
        }
      }
    };
    const handleContactsError = (data) => {
      if (data.id !== id || data.requestId !== contactsRequest.current) return;
      setContactsLoading(false);
      pendingExport.current = null;
      setContactsError(data.message);
    };
    socket.on("groupContacts", handleContacts);
    socket.on("groupContactsError", handleContactsError);

    return () => {
      socket.off("allChats", handleAllChats);
      socket.off("allChatsError", handleAllChatsError);
      socket.off("groupContacts", handleContacts);
      socket.off("groupContactsError", handleContactsError);
    };
  }, [id, socket]);

  const setValues = (dataChats) => {
    const filteredChats = dataChats.filter(
      (chat) =>
        chat.isGroup &&
        !chat.groupMetadata?.isParentGroup &&
        !chat.groupMetadata?.parentGroup
    );
    setGroupChats(filteredChats);
    let chats = {};
    filteredChats.forEach((chat) => {
      chats[chat.id._serialized] = chat;
    });
    setGroupChatsWithId(chats);
  };

  const headCells = [
    { id: "name", label: "Group Name" },
    { id: "id", label: "Group ID" },
  ];

  const handleGroupScraping = () => {
    setLoadError("");
    socket.emit("getAllChats", { id });
    setIsLoading(true);
  };

  const createData = () => {
    return groupChats.map((chat) => {
      return {
        id: chat.id._serialized,
        name: chat.name,
      };
    });
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  // const emptyRows =
  //   page > 0 ? Math.max(0, (1 + page) * rowsPerPage - groupChats.length) : 0;

  const visibleRows = createData();

  const handleSelectAllClick = (event) => {
    if (event) {
      const newSelected = createData().map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  // const handleChangePage = (event, newPage) => {
  //   setPage(newPage);
  // };

  // const handleChangeRowsPerPage = (event) => {
  //   setRowsPerPage(parseInt(event.target.value, 10));
  //   setPage(0);
  // };

  const EnhancedTableHead = (props) => {
    // const { onSelectAllClick, numSelected, rowCount } = props;

    return (
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            {/* <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                "aria-label": "select all desserts",
              }}
            /> */}
          </TableCell>
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
    );
  };

  const getContacts = (groupIds = selected) => {
    const participantIds = groupIds.flatMap((groupId) =>
      (groupChatsWithId[groupId]?.groupMetadata?.participants || []).map((user) =>
        typeof user.id === "string" ? user.id :
          user.id?._serialized || `${user.id?.user}@${user.id?.server}`
      )
    );
    setContactObject({});
    setContactGroupList([]);
    setContactsError("");
    setAllContactlength(participantIds.length);
    setContactsLoading(true);
    socket.emit("getGroupContacts", {
      id, participantIds, requestId: ++contactsRequest.current,
    });
  };

  useEffect(() => {
    if (!contactsLoading) return;
    const timer = setTimeout(() => {
      ++contactsRequest.current;
      pendingExport.current = null;
      setContactsLoading(false);
      setContactsError("Contact lookup timed out. Check that the updated server is running, then try again.");
    }, 60000);
    return () => clearTimeout(timer);
  }, [contactsLoading]);

  const handleClearGroup = () => {
    handleClearContacts();
    setGroupChats([]);
    setGroupChatsWithId([]);
    setContactGroupList([]);
    setAllContactlength(0);
    // setPage(0);
    setSelected([]);
  };

  const handleClearContacts = () => {
    pendingExport.current = null;
    ++contactsRequest.current;
    setContactsLoading(false);
    setContactsError("");
    setContactObject({});
    setContactGroupList([]);
    setAllContactlength(0);
  };

  const handleClickExport = (type) => {
    setContactsError("");
    setExportType(type);
    setExportSelectedRows(selected.length > 0);
    setShowExportPopup(true);
  };

  const handleExport = () => {
    setContactsError("");
    if (exportType === "Group") {
      pendingExport.current = exportFormat;
      getContacts(exportSelectedRows ? selected : groupChats.map((group) => group.id._serialized));
    } else {
      try {
        downloadContacts(contactGroupList, exportFormat);
        setShowExportPopup(false);
      } catch (error) {
        setContactsError(error.message);
      }
    }
  };

  const closeExport = () => {
    pendingExport.current = null;
    setShowExportPopup(false);
  };

  const handleAddToSenderList = () => {
    addToSendersList(contactObject);
    setOpenGroupScrapper(false);
  };

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Button onClick={handleGroupScraping}>
          Download all my joined groups list
        </Button>
        {isLoading ? (
          <div style={{ height: "250px" }}>
            <CircularProgress />
          </div>
        ) : (
          <TableContainer
            sx={{ height: 250, overflow: "auto", maxWidth: "530px" }}
          >
            <Table aria-labelledby="tableTitle" size="small">
              <EnhancedTableHead
                numSelected={selected.length}
                // onSelectAllClick={handleSelectAllClick}
                rowCount={groupChats.length}
              />
              <TableBody>
                {visibleRows.map((row, index) => {
                  const isItemSelected = isSelected(row.id);
                  const labelId = `enhanced-table-checkbox-${index}`;

                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, row.id)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id}
                      selected={isItemSelected}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            "aria-labelledby": labelId,
                          }}
                        />
                      </TableCell>
                      <TableCell id={labelId}>{row.name}</TableCell>
                      <TableCell>{row.id}</TableCell>
                    </TableRow>
                  );
                })}
                {/* {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )} */}
              </TableBody>
            </Table>
            {/* <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={groupChats.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          /> */}
          </TableContainer>
        )}
        {loadError && <p role="alert">{loadError}</p>}
        <Chip label={`group count(${groupChats.length})`} />
        <Button onClick={() => handleSelectAllClick(true)}>Select All</Button>
        <Button onClick={() => handleSelectAllClick(false)}>
          Deselect All
        </Button>
        <Button onClick={handleClearGroup}>Clear</Button>
        <Button
          onClick={() => handleClickExport("Group")}
          disabled={!groupChats.length || contactsLoading}
        >
          Export group contacts
        </Button>
      </div>
      <div>
        <Button onClick={() => getContacts()} disabled={!selected.length || contactsLoading}>Get Contacts from selected groups</Button>
        {contactsLoading && <CircularProgress aria-label="Loading group contacts" />}
        {contactsError && <p role="alert">{contactsError}</p>}
        {contactGroupList.some((contact) => !contact.number) && (
          <p>Some phone numbers are unavailable from WhatsApp. These members are excluded from exports and the senders list.</p>
        )}
        <Box height={250} overflow={"auto"}>
          <List>
            {contactGroupList.map((item) => (
              <ListItem key={item.id}>
                <ListItemText primary={item.name || (item.number ? `+${item.number}` : "Group member")}
                  secondary={item.number ? (item.name ? `+${item.number}` : null) : "Phone number unavailable"} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Chip label={`contact count(${contactGroupList.length})`} />
        <Chip
          label={`duplicates(${allContactlength - contactGroupList.length})`}
        />
        <Button onClick={handleClearContacts}>Clear</Button>

        <Button
          onClick={() => handleClickExport("Contact")}
          disabled={!Object.keys(contactObject).length || contactsLoading}
        >
          Export contacts
        </Button>

        <Button onClick={handleAddToSenderList} disabled={!Object.keys(contactObject).length || contactsLoading}>Add to senders list</Button>

        <Dialog
          open={showExportPopup}
          onClose={closeExport}
        >
          <DialogTitle>Export Contacts</DialogTitle>{" "}
          <IconButton
            aria-label="close"
            onClick={closeExport}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent>
            <div>
              <InputLabel>Export As</InputLabel>
              <Select
                value={exportFormat}
                label="Export as"
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value={"Excel"}>Excel</MenuItem>
                <MenuItem value={"Text"}>Text</MenuItem>
              </Select>
            </div>
            {exportType !== "Contact" && (
              <div>
                <FormControlLabel
                  control={
                    <Checkbox
                      value={exportSelectedRows}
                      checked={exportSelectedRows}
                      disabled={contactsLoading}
                      onChange={(e) => setExportSelectedRows(e.target.checked)}
                    />
                  }
                  label="Contacts from selected groups only"
                />
              </div>
            )}
            {exportType === "Group" && <p>
              {exportSelectedRows ? `${selected.length} selected groups` : `All ${groupChats.length} loaded groups`}.
              {" "}Downloads contact names and phone numbers. Duplicate numbers are removed.
            </p>}
            {contactsLoading && <p role="status">Fetching contacts for your download…</p>}
            {contactsError && <p role="alert">{contactsError}</p>}

            <Button
              onClick={handleExport}
              disabled={contactsLoading || (exportType === "Group" && exportSelectedRows && !selected.length)}
            >
              Export
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GroupScrapper;
