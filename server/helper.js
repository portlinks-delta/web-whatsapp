const { JSDOM } = require("jsdom");
const replaceVariable = (message, details) => {
  let text = message;
  let list = variableList(details);
  Object.entries(list).forEach(([variable, value]) => {
    text = text.replaceAll(variable, value);
  });
  return text;
};

const variableList = (contact) => ({
  __fullname__: contact.pushname || contact.name || contact.number,
  __firstname__: contact.name ? contact.name.split(" ")[0] : "",
  __lastname__: contact.name ? contact.name.split(" ").slice(1)?.join(" ") : "",
});

const convertDateFormmat = (date) => {
  return (
    ("0" + date.getDate()).slice(-2) +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    date.getFullYear() +
    " " +
    ("0" + date.getHours()).slice(-2) +
    ":" +
    ("0" + date.getMinutes()).slice(-2) +
    ":" +
    ("0" + date.getSeconds()).slice(-2)
  );
};

function convertHtmlToWhatsappFormat(html) {
  const codes = { STRONG: "*", EM: "_", DEL: "~" };

  const { window } = new JSDOM(html);
  const { document } = window;
  const { body } = document;

  const dfs = ({ childNodes }) =>
    Array.from(childNodes, (node) => {
      if (node.nodeType === 1) {
        const s = dfs(node);
        const code = codes[node.tagName];
        return code
          ? s.replace(/^(\s*)(?=\S)|(?<=\S)(\s*)$/g, `$1${code}$2`)
          : s;
      } else {
        return node.textContent;
      }
    }).join("");

  return dfs(body);
}

exports.replaceVariable = replaceVariable;
exports.convertHtmlToWhatsappFormat = convertHtmlToWhatsappFormat;
exports.convertDateFormmat = convertDateFormmat;
