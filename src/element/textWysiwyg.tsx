import { KEYS } from "../keys";
import { selectNode } from "../utils";

type TextWysiwygParams = {
  initText: string;
  x: number;
  y: number;
  strokeColor: string;
  font: string;
  opacity: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
};

// When WYSIWYG text ends with white spaces, the text gets vertically misaligned
// in order to fix this issue, we remove those white spaces
function trimText(text: string) {
  return text.trim();
}

export function textWysiwyg({
  initText,
  x,
  y,
  strokeColor,
  font,
  opacity,
  onSubmit,
  onCancel,
}: TextWysiwygParams) {
  // Using contenteditable here as it has dynamic width.
  // But this solution has an issue — it allows to paste
  // multiline text, which is not currently supported
  const editable = document.createElement("div");
  editable.contentEditable = "true";
  editable.tabIndex = 0;
  editable.innerText = initText;
  editable.dataset.type = "wysiwyg";

  Object.assign(editable.style, {
    color: strokeColor,
    position: "fixed",
    opacity: opacity / 100,
    top: `${y}px`,
    left: `${x}px`,
    transform: "translate(-50%, -50%)",
    textAlign: "left",
    display: "inline-block",
    font: font,
    padding: "4px",
    // This needs to have "1px solid" otherwise the carret doesn't show up
    // the first time on Safari and Chrome!
    outline: "1px solid transparent",
    whiteSpace: "nowrap",
    minHeight: "1em",
    backfaceVisibility: "hidden",
  });

  editable.onpaste = ev => {
    try {
      const selection = window.getSelection();
      if (!selection?.rangeCount) {
        return;
      }
      selection.deleteFromDocument();

      const text = ev.clipboardData!.getData("text").replace(/\r\n?/g, "\n");

      const span = document.createElement("span");
      span.innerText = text;
      const range = selection.getRangeAt(0);
      range.insertNode(span);

      // deselect
      window.getSelection()!.removeAllRanges();
      range.setStart(span, span.childNodes.length);
      range.setEnd(span, span.childNodes.length);
      selection.addRange(range);

      ev.preventDefault();
    } catch (err) {
      console.error(err);
    }
  };

  editable.onkeydown = ev => {
    if (ev.key === KEYS.ESCAPE) {
      ev.preventDefault();
      if (initText) {
        editable.innerText = initText;
        handleSubmit();
        return;
      }
      cleanup();
      return;
    }
    if (ev.key === KEYS.ENTER && !ev.shiftKey) {
      ev.preventDefault();
      if (ev.isComposing || ev.keyCode === 229) {
        return;
      }
      handleSubmit();
    }
  };
  editable.onblur = handleSubmit;

  function stopEvent(ev: Event) {
    ev.stopPropagation();
  }

  function handleSubmit() {
    if (editable.innerText) {
      onSubmit(trimText(editable.innerText));
    } else {
      onCancel();
    }
    cleanup();
  }

  function cleanup() {
    editable.onblur = null;
    editable.onkeydown = null;
    editable.onpaste = null;
    window.removeEventListener("wheel", stopEvent, true);
    document.body.removeChild(editable);
  }

  window.addEventListener("wheel", stopEvent, true);
  document.body.appendChild(editable);
  editable.focus();
  selectNode(editable);
}
