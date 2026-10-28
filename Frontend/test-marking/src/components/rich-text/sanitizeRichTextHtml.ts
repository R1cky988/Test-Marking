import DOMPurify, { type Config } from "dompurify";

const MATHJAX_TAGS = [
  "mjx-container",
  "mjx-math",
  "mjx-mrow",
  "mjx-mi",
  "mjx-mo",
  "mjx-mn",
  "mjx-msup",
  "mjx-msub",
  "mjx-mfrac",
  "mjx-msqrt",
  "mjx-mtext",
  "mjx-mover",
  "mjx-munder",
  "mjx-munderover",
  "mjx-mtable",
  "mjx-mtr",
  "mjx-mtd",
];

const RICH_TEXT_PURIFY_CONFIG: Config = {
  ADD_TAGS: MATHJAX_TAGS,
  ADD_ATTR: ["jax", "display", "style", "class", "id"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "base"],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

let hooksInstalled = false;

function ensureSanitizerHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook("uponSanitizeAttribute", (_, data) => {
    const attrName = data.attrName.toLowerCase();
    const attrValue = data.attrValue.trim();

    if (attrName.startsWith("on") || attrName === "srcdoc") {
      data.keepAttr = false;
      return;
    }

    if ((attrName === "href" || attrName === "src" || attrName === "xlink:href") && /^\s*javascript:/i.test(attrValue)) {
      data.keepAttr = false;
      return;
    }

    if (attrName === "style" && /(?:javascript:|expression\s*\()/i.test(attrValue)) {
      data.keepAttr = false;
    }
  });
}

export function sanitizeRichTextHtml(html: string) {
  ensureSanitizerHooks();
  return DOMPurify.sanitize(html, RICH_TEXT_PURIFY_CONFIG);
}
