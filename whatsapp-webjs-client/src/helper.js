import { convertFromRaw, convertToRaw } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

export const s2ab = (s) => {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  return buf;
};

export const filterKeys = (obj1, obj2) => {
  // Iterate over the keys of obj1
  Object.keys(obj1).forEach((key) => {
    // If the key doesn't exist in obj2, delete it from obj1
    if (!obj2.hasOwnProperty(key)) {
      delete obj1[key];
    }
  });

  return obj1;
};

export const validateSession = (id) => {
  if (localStorage.getItem("session") === id) {
    return true;
  }
  return false;
};

export const parseEditorState = (editorState) => {
  const rawContentState = convertToRaw(editorState.getCurrentContent());

  const plainText = editorState.getCurrentContent().getPlainText();
  const blocks = rawContentState.blocks.map((block) => {
    let textWithoutMentions = "";
    let lastOffset = 0;
    block.entityRanges.forEach((entityRange) => {
      const entity = rawContentState.entityMap[entityRange.key];
      if (entity.type === "mention") {
        // Append regular text before mention
        textWithoutMentions +=
          block.text.slice(lastOffset, entityRange.offset) +
          entity.data.mention.link;

        // Update last offset to exclude mention name
        lastOffset = entityRange.offset + entityRange.length;
      }
    });

    // Append remaining text after last mention
    textWithoutMentions += block.text.slice(lastOffset);

    return {
      ...block,
      text: textWithoutMentions,
    };
  });

  const processedContentState = {
    ...rawContentState,
    blocks,
  };

  const contentState = convertFromRaw(processedContentState);
  const htmlContent = stateToHTML(contentState);
  return { htmlContent, plainText };
};
