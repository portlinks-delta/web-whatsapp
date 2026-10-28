import React from "react";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { CONSTANTS } from "../Constants";

const Settings = (props) => {
  const { settings, setSettings } = props;
  const handleChange = (value, type) => {
    let newSettings = { ...settings };
    if (type === "activateSleep" && value) {
      newSettings.sleepAfterMessages =
        CONSTANTS.INTITIAL_SETTINGS_STATE.sleepAfterMessages;
      newSettings.sleepFor = CONSTANTS.INTITIAL_SETTINGS_STATE.sleepFor;
    }
    setSettings({ ...newSettings, [type]: value });
  };

  return (
    <div>
      <InputLabel>Connection Speed</InputLabel>
      <Select
        value={settings.speed}
        onChange={(e) => handleChange(e.target.value, "speed")}
      >
        <MenuItem value={"fast"}>Fast</MenuItem>
        <MenuItem value={"slow"}>Slow</MenuItem>
      </Select>
      <div>
        <div>Delay between messages</div>
        <div>
          <span>Wait between </span>
          <input
            type="number"
            min={0}
            value={settings.waitBetweenStart}
            onChange={(e) => handleChange(e.target.value, "waitBetweenStart")}
          />
          <span> Seconds</span>
        </div>
        <div>
          <span>and </span>
          <input
            type="number"
            min={0}
            value={settings.waitBetweenEnd}
            onChange={(e) => handleChange(e.target.value, "waitBetweenEnd")}
          />
          <span> Seconds</span>
        </div>
      </div>
      <div>
        <FormControlLabel
          control={
            <Checkbox
              value={settings.activateSleep}
              onChange={(e) => handleChange(e.target.checked, "activateSleep")}
            />
          }
          label="Activate Sleep between sending"
        />
        <div style={{ display: settings.activateSleep ? "block" : "none" }}>
          <div>
            <span>After </span>
            <input
              type="number"
              min={0}
              value={settings.sleepAfterMessages}
              onChange={(e) =>
                handleChange(e.target.value, "sleepAfterMessages")
              }
            />
            <span> Messages</span>
          </div>
          <div>
            <span>For </span>
            <input
              type="number"
              min={0}
              value={settings.sleepFor}
              onChange={(e) => handleChange(e.target.value, "sleepFor")}
            />
            <span> Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
