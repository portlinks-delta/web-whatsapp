// src/TextEditor.js
import React, { useCallback, useMemo, useRef, useState } from "react";
import { EditorState, RichUtils, Modifier } from "draft-js";
import Editor from "@draft-js-plugins/editor";
import "draft-js/dist/Draft.css";
import "@draft-js-plugins/mention/lib/plugin.css";
import createMentionPlugin, {
  defaultSuggestionsFilter,
} from "@draft-js-plugins/mention";
import EmojiPicker from "emoji-picker-react";
import "./text_editor.css";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import { CONSTANTS } from "../../Constants";

const TextEditor = (props) => {
  const { handleChange } = props;
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [suggestions, setSuggestions] = useState(CONSTANTS.VARIABLES);
  const [open, setOpen] = useState(false);
  const editorRef = useRef(null);

  const { MentionSuggestions, plugins } = useMemo(() => {
    const mentionPlugin = createMentionPlugin();
    const { MentionSuggestions } = mentionPlugin;
    const plugins = [mentionPlugin];
    return { plugins, MentionSuggestions };
  }, []);

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      handleChange(newState);
      setEditorState(newState);
      return "handled";
    }
    return "not-handled";
  };

  const onOpenChange = useCallback((_open) => {
    setOpen(_open);
  }, []);

  const onSearchChange = useCallback(({ value }) => {
    setSuggestions(defaultSuggestionsFilter(value, CONSTANTS.VARIABLES));
  }, []);

  const addEmoji = (emoji) => {
    setShowEmojiPicker(false);
    const contentState = editorState.getCurrentContent();
    const contentStateWithEmoji = Modifier.insertText(
      contentState,
      editorState.getSelection(),
      emoji.emoji
    );
    const newEditorState = EditorState.push(
      editorState,
      contentStateWithEmoji,
      "insert-characters"
    );
    handleChange(newEditorState);
    setEditorState(newEditorState);
  };

  const handleEmojiPickerToggle = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const tools = [
    {
      label: "bold",
      style: "BOLD",
      icon: <FormatBoldIcon />,
      method: "inline",
    },
    {
      label: "italic",
      style: "ITALIC",
      icon: <FormatItalicIcon />,
      method: "inline",
    },
    {
      label: "strikethrough",
      style: "STRIKETHROUGH",
      icon: <StrikethroughSIcon />,
      method: "inline",
    },
  ];

  const applyStyle = (e, style) => {
    e.preventDefault();
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const isActive = (style) => {
    const currentStyle = editorState.getCurrentInlineStyle();
    return currentStyle.has(style);
  };

  const handleChangeState = (state) => {
    handleChange(state);
    setEditorState(state);
  };

  return (
    <div>
      <div className="toolbar">
        {tools.map((item, idx) => (
          <button
            style={{
              color: isActive(item.style, item.method)
                ? "rgba(0, 0, 0, 1)"
                : "rgba(0, 0, 0, 0.3)",
            }}
            key={`${item.label}-${idx}`}
            title={item.label}
            onClick={(e) => applyStyle(e, item.style, item.method)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {item.icon || item.label}
          </button>
        ))}
        <button onClick={handleEmojiPickerToggle}>
          <InsertEmoticonIcon
            style={{
              color: showEmojiPicker
                ? "rgba(0, 0, 0, 1)"
                : "rgba(0, 0, 0, 0.3)",
            }}
          />
        </button>
        {showEmojiPicker && (
          <EmojiPicker onEmojiClick={(emoji) => addEmoji(emoji)} />
        )}
      </div>
      <div className="editor" onClick={() => editorRef.current.focus()}>
        <Editor
          editorState={editorState}
          handleKeyCommand={handleKeyCommand}
          onChange={handleChangeState}
          plugins={plugins}
          ref={editorRef}
        />
        <MentionSuggestions
          open={open}
          onOpenChange={onOpenChange}
          suggestions={suggestions}
          onSearchChange={onSearchChange}
          onAddMention={() => {
            // get the mention object selected
          }}
        />
      </div>
    </div>
  );
};

export default TextEditor;
