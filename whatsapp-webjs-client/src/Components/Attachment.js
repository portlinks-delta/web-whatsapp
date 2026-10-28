// src/HamburgerMenu.js
import React, { useEffect, useState } from "react";
import {
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { CONSTANTS } from "../Constants";
import TextEditor from "./TextEditor/TextEditor";
import { parseEditorState } from "../helper";

const initialState = {
  file: null,
  caption: "",
  fileType: "",
};

const Attachment = (props) => {
  const { messages, setMessages } = props;
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCaptionDialog, setOpenCaptionDialog] = useState(false);
  const [fileObj, setFileObj] = useState(initialState);
  const [fileList, setFileList] = useState([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [caption, setCaption] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    let textMessage = messages.filter((message) => message.type === "text");
    const processFiles = async () => {
      const messagePromises = fileList.map(
        (file) =>
          new Promise((resolve, reject) => {
            let mimeType = file.file.type;
            if (mimeType === "audio/ogg") {
              mimeType = "audio/ogg; codecs=opus";
            }
            const reader = new FileReader();
            reader.readAsDataURL(file.file);
            reader.onloadend = () => {
              const base64data = reader.result;
              resolve({
                content: base64data,
                caption: file.caption,
                type: "media",
                mimeType: mimeType, // Include the MIME type
                fileName: file.file.name, // Include the file name
              });
            };
            reader.onerror = reject;
          })
      );

      const newMessages = await Promise.all(messagePromises);
      setMessages([...textMessage, ...newMessages]);
    };

    if (fileList.length > 0) {
      processFiles();
    } else {
      setMessages(textMessage);
    }
  }, [fileList]);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAnchorEl(null);
    setOpenCaptionDialog(false);
  };

  const handleDialogOpen = (type) => {
    setFileObj((prevState) => ({
      ...prevState,
      fileType: type,
    }));
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFileObj(initialState);
    setMenuAnchorEl(null);
    setCurrentFileIndex(null);
  };

  const handleCaptionDialogClose = () => {
    setOpenCaptionDialog(false);
    setCurrentFileIndex(null);
    setCaption("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      let fileValidationData = CONSTANTS.FILE_TYPES[fileObj.fileType];
      if (!fileValidationData.acceptType.split(",").includes(file.type)) {
        document.getElementById("file-input-media").value = "";
        setFileObj((prevState) => ({
          ...prevState,
          file: null,
        }));
        setSnackbarMessage("Invalid file type.");
        setSnackbarOpen(true);
        return;
      }

      // Validate file size (example: 5MB limit)
      const maxSize = fileValidationData.acceptSize * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        document.getElementById("file-input-media").value = "";
        setFileObj((prevState) => ({
          ...prevState,
          file: null,
        }));
        setSnackbarMessage(
          `File size exceeds the limit of ${fileValidationData.acceptSize} MB`
        );
        setSnackbarOpen(true);
        return;
      }
      setFileObj((prevState) => ({
        ...prevState,
        file: event.target.files[0],
      }));
    }
  };

  const handleUpload = () => {
    handleDialogClose();
    setFileList([...fileList, fileObj]);
  };

  const handleDeleteFile = () => {
    const updatedFiles = fileList.filter(
      (_, index) => index !== currentFileIndex
    );
    setFileList(updatedFiles);
    handleMenuClose();
  };

  const handleOpenFile = () => {
    const file = fileList[currentFileIndex].file;
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL);
    handleMenuClose();
  };

  const handleMenuOpen = (event, index) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentFileIndex(index);
  };

  const handleSetCaption = () => {
    const updatedFiles = [...fileList];
    updatedFiles[currentFileIndex].caption = caption;
    setFileList(updatedFiles);
    setCaption("");
    handleMenuClose();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleCaptionChange = (editorState) => {
    let { plainText, htmlContent } = parseEditorState(editorState);
    if (plainText.trim()) {
      setCaption(htmlContent);
    }
  };

  return (
    <div>
      <span>Attach Files and Photos </span>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={handleMenuClick}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleDialogOpen("photo")}>
          <InsertPhotoIcon /> Photos
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen("audio")}>
          <AudiotrackIcon /> Audio Messages
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen("video")}>
          <VideoLibraryIcon /> Videos
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen("pdf")}>
          <PictureAsPdfIcon /> PDFs
        </MenuItem>
        <MenuItem onClick={() => handleDialogOpen("document")}>
          <DescriptionIcon /> Documents
        </MenuItem>
        <hr />
        <MenuItem onClick={() => setFileList([])}>
          Clear Attachment List
        </MenuItem>
      </Menu>
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Upload {fileObj.fileType}</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept={CONSTANTS.FILE_TYPES[fileObj.fileType]?.acceptType}
            onChange={handleFileChange}
            id="file-input-media"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!fileObj.file}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openCaptionDialog} onClose={handleCaptionDialogClose}>
        <DialogTitle>Add Caption</DialogTitle>
        <DialogContent>
          <TextEditor handleChange={handleCaptionChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSetCaption}>Add Caption</Button>
        </DialogActions>
      </Dialog>
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Filename</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Caption</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fileList.map((file, index) => (
              <TableRow key={index}>
                <TableCell>{file.file.name}</TableCell>
                <TableCell>{file.fileType}</TableCell>
                <TableCell>{file.caption}</TableCell>
                <TableCell>
                  <IconButton onClick={(event) => handleMenuOpen(event, index)}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      onClick={() => {
                        setOpenCaptionDialog(true);
                        setMenuAnchorEl(false);
                      }}
                    >
                      Set Caption
                    </MenuItem>
                    <MenuItem onClick={handleDeleteFile}>Delete File</MenuItem>
                    <MenuItem onClick={handleOpenFile}>Open File</MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Attachment;
