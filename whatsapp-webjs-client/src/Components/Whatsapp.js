import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CircularProgress from "@mui/material/CircularProgress";
import GroupScrapper from "./GroupScrapper";
import SettingsIcon from "@mui/icons-material/Settings";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";
import Contacts from "./Contacts";
import Settings from "./Settings";
import TextEditor from "./TextEditor/TextEditor";
import Attachment from "./Attachment";
import { CONSTANTS } from "../Constants";
import MessagesStatus from "./MessagesStatus";
import { filterKeys, parseEditorState, validateSession } from "../helper";
import { Alert, Snackbar } from "@mui/material";
import { sendRequest } from "../sendRequest";
const serverPort = Number(process.env.REACT_APP_SERVER_PORT);
if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
  throw new Error(
    "REACT_APP_SERVER_PORT must be set to an integer between 1 and 65535."
  );
}
const socket = io(`${window.location.protocol}//${window.location.hostname}:${serverPort}`);

const Whatsapp = () => {
  const [openWhatsAppDialog, setOpenWhatsAppDialog] = useState(false);
  const [openGroupScrapper, setOpenGroupScrapper] = useState(false);
  const [openMessageStatus, setOpenMessageStatus] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [qrError, setQrError] = useState("");
  const [id, setId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [loginStatus, setLoginStatus] = useState("Logged Out");
  const [contacts, setContacts] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(CONSTANTS.INTITIAL_SETTINGS_STATE);
  const [messages, setMessages] = useState([]);
  const [messageStatus, setMessageStatus] = useState([]);
  const [contactDetails, setContactDetails] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMessage, setCurrentMessage] = useState({
    contact: "",
  });

  const [messageSentIndex, setMessageSentIndex] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [sendMessagesDetails, setSendMessagesDetails] = useState([]);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [
    showSendMessageConfirmationPopup,
    setShowSendMessageConfirmationPopup,
  ] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const isPausedRef = useRef(isPaused);
  const stopRef = useRef(false);
  const batchRef = useRef(0);
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const handleQr = ({ id, qr }) => {
      if (!validateSession(id)) return;
      setQrError("");
      setIsLoading(false);
      setQrCode(qr);
    };
    const handleConnect = () => {
      const session = localStorage.getItem("session");
      if (session) socket.emit("createSession", { id: session });
    };
    const handleAuthenticated = ({ id }) => {
      if (!validateSession(id)) return;
      setQrCode("");
      setIsLoading(true);
    };
    const handleReady = (data) => {
      const { id } = data;
      if (validateSession(id)) {
        setOpenWhatsAppDialog(false);
        setIsLoading(false);
        setId(id);
        setQrCode("");
        setStatus("Connected");
        setLoginStatus("Logged In");
      }
    };

    const handleLogout = (data) => {
      const { id } = data;
      if (validateSession(id)) {
        setId("");
        setQrCode("");
        setStatus("Disconnected");
        setLoginStatus("Logged Out");
        localStorage.removeItem("session");
      }
    };

    const handleDisconnected = (data) => {
      const { id } = data;
      if (validateSession(id)) {
        setId("");
        setQrCode("");
        setStatus("Disconnected");
        // setLoginStatus("Logged Out");
      }
    };

    const handleLoadingScreen = (data) => {
      const { id } = data;
      if (validateSession(id)) {
        setIsLoading(true);
      }
    };

    const handleError = (data) => {
      if (data.type === "session_err" || data.type === "client_err") {
        localStorage.removeItem("session");
        setOpenWhatsAppDialog(false);
        setQrCode("");
        setOpenGroupScrapper(false);
        setIsLoading(false);
        setId("");
        setLoginStatus("Logged Out");
        setStatus("Disconnected");
        setSnackbarMessage(
          data.message || "Something went wrong. Please try again!",
        );
        setSnackbarOpen(true);
      }
    };

    const handleValidContatcs = (data) => {
      const { id } = data;
      if (validateSession(id)) {
        setContacts(data.contacts);
      }
    };

    socket.on("qr", handleQr);
    socket.on("connect", handleConnect);
    socket.on("authenticated", handleAuthenticated);
    socket.on("ready", handleReady);
    socket.on("logout", handleLogout);
    socket.on("disconnected", handleDisconnected);
    socket.on("loading_screen", handleLoadingScreen);
    socket.on("contact-details", handleContactDetails);
    socket.on("validate-numbers", handleValidContatcs);
    socket.on("error", handleError);
    if (socket.connected) handleConnect();

    // Cleanup on unmount
    return () => {
      stopRef.current = true;
      sendingRef.current = false;
      socket.off("qr", handleQr);
      socket.off("connect", handleConnect);
      socket.off("authenticated", handleAuthenticated);
      socket.off("ready", handleReady);
      socket.off("logout", handleLogout);
      socket.off("disconnected", handleDisconnected);
      socket.off("loading_screen", handleLoadingScreen);
      socket.off("contact-details", handleContactDetails);
      socket.off("error", handleError);
      socket.off("validate-numbers", handleValidContatcs);
    };
  }, []);

  useEffect(() => {
    if (!openWhatsAppDialog || qrCode || qrError) return;
    const timer = setTimeout(() => {
      setQrError("WhatsApp is taking longer than expected to connect. Check the server terminal for errors, then retry.");
    }, 60000);
    return () => clearTimeout(timer);
  }, [openWhatsAppDialog, qrCode, qrError]);

  useEffect(() => {
    let newContacts = [];
    Object.keys(contacts).map((contact) => {
      if (!contactDetails[contact]) {
        newContacts.push(contact);
      }
    });
    if (newContacts.length)
      socket.emit("get-contact-details", {
        id,
        contacts: newContacts,
      });
  }, [contacts]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const createSessionForWhatsapp = () => {
    let session = localStorage.getItem("session");
    if (!session) {
      session = uuidv4();
      localStorage.setItem("session", session);
    }
    socket.emit("createSession", {
      id: session,
    });
  };

  const handleMessageChange = (editorState) => {
    let { plainText, htmlContent } = parseEditorState(editorState);
    let newMessage = messages.filter((message) => message.type === "media");
    if (plainText.trim()) {
      newMessage.unshift({ content: htmlContent, type: "text" });
    }
    setMessages(newMessage);
  };

  const handleOpenWhatsappSession = () => {
    setQrError("");
    setOpenWhatsAppDialog(true);
    createSessionForWhatsapp();
  };

  const handlecloseWhatsappSession = async () => {
    socket.emit("logout", {
      id,
    });
  };


  const handleContactDetails = (data) => {
    setContactDetails((prevDetails) => ({
      ...prevDetails,
      ...data.contactDetails,
    }));
  };

  const closeWhatsAppDialog = async () => {
    setOpenWhatsAppDialog(false);
  };

  const addToSendersList = (contactList) => {
    setContacts({ ...contacts, ...contactList });
  };

  const handleValidateNumbers = () => {
    socket.emit("validate-numbers", { id, contacts });
  };

  const sendMessage = async (id, messageData, batch) => {
    if (isPausedRef.current) {
      await checkPauseAndDelay(0); // wait until resumed
    }
    if (stopRef.current || batch !== batchRef.current) {
      return;
    }
    return sendRequest(socket, {
      id,
      requestId: uuidv4(),
      contact: messageData.contact,
      message: messageData.message,
      contactDetails: contactDetails[messageData.contact],
    });
  };

  const checkPauseAndDelay = async (delay) => {
    if (!stopRef.current) {
      while (isPausedRef.current && !stopRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }
  };

  const startSendingMessages = async (messageData) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    const batch = ++batchRef.current;
    setOpenMessageStatus(true);
    stopRef.current = false;
    let messageCount = 0;
    let index = messageSentIndex;

    for (const message of messageData) {
      if (stopRef.current || batch !== batchRef.current) break;

      const delay =
        index === 0
          ? 0
          : Math.floor(
              Math.random() *
                (parseInt(settings.waitBetweenEnd) -
                  parseInt(settings.waitBetweenStart)) +
                parseInt(settings.waitBetweenStart),
            );

      setCurrentMessage({
        contact: message.contact,
      });
      await checkPauseAndDelay(delay);

      if (stopRef.current || batch !== batchRef.current) break;
      const result = await sendMessage(id, message, batch);
      if (batch !== batchRef.current || stopRef.current) break;
      if (result) {
        setMessageStatus((previous) => [...previous, result]);
        setMessageSentIndex((previous) => previous + 1);
      }

      messageCount++;
      index = index + 1;

      if (settings.activateSleep && messageCount >= parseInt(settings.sleepAfterMessages)) {
        await checkPauseAndDelay(parseInt(settings.sleepFor));
        messageCount = 0;
      }
    }
    if (batch === batchRef.current) {
      sendingRef.current = false;
      setIsSending(false);
      setSendMessagesDetails([]);
      setCurrentMessage({ contact: "" });
    }
  };

  const handleMessageStatusClose = () => {
    if (isPausedRef.current || messageSentIndex === totalMessages) {
      stopRef.current = true;
      ++batchRef.current;
      sendingRef.current = false;
      setIsSending(false);
      setIsPaused(false);
      setOpenMessageStatus(false);
      setMessageStatus([]);
      setCurrentMessage({ contact: "" });
      setSendMessagesDetails([]);
      setMessageSentIndex(0);
    } else {
      if (messageSentIndex !== totalMessages) {
        setShowConfirmationPopup(true);
      }
    }
  };

  const handleSendMessageClick = async () => {
    if (sendingRef.current) return;
    if (sendMessagesDetails.length) {
      setShowSendMessageConfirmationPopup(true);
    } else {
      let newContacts = Object.keys(contacts);
      let newDetails = [];
      newContacts.forEach((contact) => {
        messages.forEach((message) => {
          newDetails.push({ contact, message });
        });
      });
      setMessageStatus([]);
      setOpenMessageStatus(true);
      setSendMessagesDetails(newDetails);
      setTotalMessages(newDetails.length);
      startSendingMessages(newDetails);
      setMessageSentIndex(0);
    }
  };

  const handleConfirmClose = () => {
    if (sendingRef.current) return;
    let newContacts = Object.keys(contacts);
    let newDetails = [];

    newContacts.forEach((contact) => {
      messages.forEach((message) => {
        newDetails.push({ contact, message });
      });
    });

    let allData = [...sendMessagesDetails, ...newDetails];
    setTotalMessages(allData.length);
    setSendMessagesDetails(allData);
    startSendingMessages(newDetails);
    setShowSendMessageConfirmationPopup(false);
  };

  const handleCancelClose = () => {
    setShowSendMessageConfirmationPopup(false);
  };

  const handleTerminateProcess = () => {
    stopRef.current = true;
    ++batchRef.current;
    sendingRef.current = false;
    setIsSending(false);
    setIsPaused(false);
    setOpenMessageStatus(false);
    setMessageStatus([]);
    setMessageSentIndex(0);
    setCurrentMessage({ contact: "" });
    setSendMessagesDetails([]);
    setShowConfirmationPopup(false);
  };

  const handleContinueProcess = () => {
    setShowConfirmationPopup(false);
    setOpenMessageStatus(false);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <div>
      <Dialog open={openWhatsAppDialog} onClose={closeWhatsAppDialog}>
        <div style={{ display: "flex" }}>
          <DialogTitle>Open Whatsapp and Scan Qr Code</DialogTitle>
          <IconButton aria-label="close" onClick={closeWhatsAppDialog}>
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent>
          {qrCode ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: 24,
                width: "fit-content",
                maxWidth: "100%",
                boxSizing: "border-box",
                colorScheme: "only light",
                forcedColorAdjust: "none",
              }}
            >
              <QRCode
                value={qrCode}
                size={300}
                bgColor="#ffffff"
                fgColor="#000000"
                style={{ display: "block", maxWidth: "100%", height: "auto" }}
              />
            </div>
          ) : qrError ? (
            <Alert severity="warning" action={<Button onClick={handleOpenWhatsappSession}>Retry</Button>}>
              {qrError}
            </Alert>
          ) : (
            <CircularProgress aria-label={isLoading ? "Connecting to WhatsApp" : "Waiting for QR code"} />
          )}
        </DialogContent>
      </Dialog>
      <Button
        variant="contained"
        disabled={!!id}
        onClick={handleOpenWhatsappSession}
      >
        Open Whatsapp
      </Button>
      <Button
        variant="contained"
        onClick={() => setShowSettings(true)}
        startIcon={<SettingsIcon />}
      >
        Settings
      </Button>
      <Button disabled={!id} onClick={handlecloseWhatsappSession}>
        Log Out
      </Button>
      {id && (
        <div>
          <div>
            <Button onClick={() => setOpenGroupScrapper(true)}>
              Multi Group Scrapper
            </Button>
          </div>
          <div style={{ display: "flex" }}>
            <Contacts
              contacts={contacts}
              setContacts={setContacts}
              handleValidateNumbers={handleValidateNumbers}
            />
            <div>
              <TextEditor handleChange={handleMessageChange} />
              <Attachment messages={messages} setMessages={setMessages} />
              <Button
                disabled={
                  isSending ||
                  !Object.keys(contacts).length ||
                  !messages.length ||
                  status === "Disconnected"
                }
                onClick={() => handleSendMessageClick(false)}
              >
                Send
              </Button>
              <Button
                style={{
                  display:
                    !messageSentIndex || messageSentIndex === totalMessages
                      ? "none"
                      : "block",
                }}
                onClick={() => setOpenMessageStatus(true)}
              >
                {messageSentIndex + "/ " + totalMessages}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div>
        <Chip label={status} />/ <Chip label={loginStatus} />
      </div>
      <Dialog open={showSettings} onClose={() => setShowSettings(false)}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <DialogTitle>Settings</DialogTitle>
          <IconButton aria-label="close" onClick={() => setShowSettings(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent>
          <Settings settings={settings} setSettings={setSettings} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={openGroupScrapper}
        onClose={() => setOpenGroupScrapper(false)}
        PaperProps={{
          sx: {
            maxWidth: "88%",
          },
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <DialogTitle>Group Scrapper</DialogTitle>
          <IconButton
            aria-label="close"
            onClick={() => setOpenGroupScrapper(false)}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent>
          <GroupScrapper
            socket={socket}
            id={id}
            addToSendersList={addToSendersList}
            setOpenGroupScrapper={setOpenGroupScrapper}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={openMessageStatus}
        onClose={handleMessageStatusClose}
        PaperProps={{
          sx: {
            maxWidth: "88%",
          },
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <DialogTitle>Sending Whatsapp</DialogTitle>
          <IconButton aria-label="close" onClick={handleMessageStatusClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent>
          <MessagesStatus
            messageStatus={messageStatus}
            handlePause={() => setIsPaused((prev) => !prev)}
            handleClose={handleMessageStatusClose}
            handleConfirmClose={handleTerminateProcess}
            handleCancelClose={handleContinueProcess}
            showConfirmationPopup={showConfirmationPopup}
            isPaused={isPaused}
            totalMessages={totalMessages}
            currentMessage={currentMessage}
            messageSentIndex={messageSentIndex}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSendMessageConfirmationPopup}
        onClose={() => setShowSendMessageConfirmationPopup(false)}
      >
        <DialogTitle>Messages</DialogTitle>{" "}
        <IconButton
          aria-label="close"
          onClick={() => setShowSendMessageConfirmationPopup(false)}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent>
          <div>
            Messages are still being sent. Do you want to continue sending this
            message after the current process ends?
          </div>
          <Button onClick={handleConfirmClose}>Yes</Button>
          <Button onClick={handleCancelClose}>No</Button>
        </DialogContent>
      </Dialog>
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

export default Whatsapp;
