import React, { useState } from "react";
import * as XLSX from "xlsx";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import LinearProgress from "@mui/material/LinearProgress";
import { s2ab } from "../helper";

const MessagesStatus = (props) => {
  const {
    messageStatus,
    messageSentIndex,
    isPaused,
    handlePause,
    handleClose,
    totalMessages,
    currentMessage,
    showConfirmationPopup,
    handleCancelClose,
    handleConfirmClose,
  } = props;
  const [exportFormat, setExportFormat] = useState("Text");
  const [showExportPopup, setShowExportPopup] = useState(false);
  const handleExport = () => {
    let filename = "";
    let blob = "";
    if (exportFormat === "Excel") {
      let data = messageStatus.map((data) => ({
        ID: data.contact,
        Type: data.contactDetails?.id?.server?.includes("g.us")
          ? "group"
          : "contact",
        "Sending Date & Time": data.sendingDateTime,
        Status: data.status,
        Message: data.message.content,
        Details: data.error || "",
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Message Status");
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });

      // Convert the binary string to a Blob
      blob = new Blob([s2ab(wbout)], {
        type: "application/octet-stream",
      });
      filename = "Message Status.xlsx";
    } else {
      let data = messageStatus.map(
        (data) =>
          `${data.contact}, ${
            data.contactDetails?.id?.server?.includes("g.us")
              ? "group"
              : "contact"
          }, ${data.sendingDateTime}, ${data.status}, ${data.message.content}, ${data.error || ""}`
      );
      const fileContent = data.join("\n");
      blob = new Blob([fileContent], { type: "text/plain" });
      filename = "Message Status.txt";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p>
        Sending Process: {messageStatus.length} / {totalMessages}
      </p>
      <div style={{ marginBottom: "10px" }}>
        <LinearProgress
          variant="determinate"
          value={totalMessages ? (messageStatus.length / totalMessages) * 100 : 0}
        />
        <div style={{ marginBottom: "10px" }}></div>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Sending Date & Time</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {messageStatus.map((msg, index) => (
            <TableRow key={index}>
              <TableCell>{msg.contact}</TableCell>
              <TableCell>
                {msg.contact?.endsWith("@g.us") ? "group" : "contact"}
              </TableCell>
              <TableCell>{msg.sendingDateTime}</TableCell>
              <TableCell>{msg.status === "unknown" ? "Unconfirmed" : msg.status}</TableCell>
              <TableCell>
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.message.content}</div>
              </TableCell>
              <TableCell>{msg.error || ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={() => setShowExportPopup(true)}>Export</Button>
      <Button onClick={handlePause}>{isPaused ? "Resume" : "Pause"}</Button>
      <Button onClick={handleClose}>Close</Button>

      <div style={{ marginTop: "10px" }}>
        {messageSentIndex === totalMessages ? (
          messageStatus.every((message) => message.status === "sent")
            ? "Messages sent successfully"
            : "Sending finished with failed or unconfirmed messages. See details above."
        ) : (
          <p>Sending message to: {currentMessage.contact}</p>
        )}
      </div>

      <Dialog open={showExportPopup} onClose={() => setShowExportPopup(false)}>
        <DialogTitle>Export Data</DialogTitle>{" "}
        <IconButton
          aria-label="close"
          onClick={() => setShowExportPopup(false)}
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

          <Button onClick={handleExport} disabled={!messageStatus.length}>
            Export
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={showConfirmationPopup} onClose={() => handleCancelClose()}>
        <DialogTitle>Messages</DialogTitle>{" "}
        <IconButton aria-label="close" onClick={handleCancelClose}>
          <CloseIcon />
        </IconButton>
        <DialogContent>
          <div>
            Messages are still in the queue. Are you sure you want to terminate
            the process?
          </div>
          <Button onClick={handleConfirmClose}>Yes</Button>
          <Button onClick={handleCancelClose}>No</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesStatus;
