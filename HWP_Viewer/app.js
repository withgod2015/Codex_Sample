const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const extractMode = document.getElementById("extractMode");
const textPreview = document.getElementById("textPreview");
const hexPreview = document.getElementById("hexPreview");
const fullTextPanel = document.getElementById("fullTextPanel");
const fullText = document.getElementById("fullText");
const toggleFullText = document.getElementById("toggleFullText");
const markdownPreview = document.getElementById("markdownPreview");
const downloadMarkdown = document.getElementById("downloadMarkdown");

const HWP_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes)) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const matchesSignature = (buffer) => {
  const bytes = new Uint8Array(buffer.slice(0, HWP_SIGNATURE.length));
  return HWP_SIGNATURE.every((value, index) => bytes[index] === value);
};

const toHexPreview = (buffer, maxBytes = 4096) => {
  const bytes = new Uint8Array(buffer.slice(0, maxBytes));
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = Array.from(chunk)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = Array.from(chunk)
      .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "."))
      .join("");
    lines.push(`${i.toString(16).padStart(6, "0")}  ${hex.padEnd(47, " ")}  ${ascii}`);
  }
  return lines.join("\n");
};

const extractPrintableText = (text) => {
  const sanitized = text.replace(/\u0000/g, " ");
  const matches = sanitized.match(/[\p{Script=Hangul}A-Za-z0-9 ,.!?\n\r\t-]{6,}/gu);
  if (!matches) {
    return null;
  }
  const full = matches
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
  if (!full) {
    return null;
  }
  const preview = full.split("\n").slice(0, 40).join("\n");
  return { preview, full };
};

const decodeWith = (buffer, encoding) => {
  try {
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(buffer);
  } catch (error) {
    return null;
  }
};

const updateFileInfo = (file, buffer) => {
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  fileType.textContent = file.type || "application/haansoft-hwp";
  extractMode.textContent = matchesSignature(buffer)
    ? "HWP 시그니처 확인됨 (OLE)"
    : "HWP 시그니처 미확인";
};

const normalizeText = (text) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

const toMarkdown = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "Markdown으로 변환할 텍스트가 없습니다.";
  }
  const lines = normalized.split("\n");
  const output = [];
  let previousBlank = true;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (!previousBlank) {
        output.push("");
      }
      previousBlank = true;
      continue;
    }

    const isBullet = /^[\-*\u2022]\s+/.test(line);
    const isNumbered = /^[0-9]+[.)]\s+/.test(line);
    const isShortTitle =
      previousBlank &&
      line.length <= 24 &&
      !/[.!?]$/.test(line) &&
      !isBullet &&
      !isNumbered;

    if (isShortTitle) {
      output.push(`## ${line}`);
    } else {
      output.push(line);
    }
    previousBlank = false;
  }

  return output.join("\n");
};

const downloadText = (content, filename) => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleFile = async (file) => {
  if (!file) {
    return;
  }
  if (!file.name.toLowerCase().endsWith(".hwp")) {
    textPreview.textContent = "지원하지 않는 파일입니다. .hwp 파일을 선택하세요.";
    hexPreview.textContent = "-";
    return;
  }

  const buffer = await file.arrayBuffer();
  updateFileInfo(file, buffer);
  hexPreview.textContent = toHexPreview(buffer);

  const utf16 = decodeWith(buffer, "utf-16le");
  const utf8 = decodeWith(buffer, "utf-8");
  const candidateText = utf16 && utf16.length > 0 ? utf16 : utf8;

  if (!candidateText) {
    textPreview.textContent = "텍스트를 추출하지 못했습니다. 다른 파일을 시도해 주세요.";
    fullText.textContent = "전체 텍스트를 추출하지 못했습니다.";
    markdownPreview.textContent = "Markdown으로 변환할 텍스트가 없습니다.";
    return;
  }

  const extracted = extractPrintableText(candidateText);
  if (!extracted) {
    textPreview.textContent = "텍스트를 찾지 못했습니다. (바이너리 형식일 수 있습니다.)";
    fullText.textContent = "전체 텍스트를 찾지 못했습니다. (바이너리 형식일 수 있습니다.)";
    markdownPreview.textContent = "Markdown으로 변환할 텍스트가 없습니다.";
    return;
  }

  textPreview.textContent = extracted.preview;
  fullText.textContent = extracted.full;
  markdownPreview.textContent = toMarkdown(extracted.full);
};

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

toggleFullText.addEventListener("click", () => {
  const isVisible = fullTextPanel.classList.toggle("visible");
  toggleFullText.textContent = isVisible ? "접기" : "전체 보기";
});

downloadMarkdown.addEventListener("click", () => {
  const content = markdownPreview.textContent;
  if (!content || content === "Markdown으로 변환할 텍스트가 없습니다.") {
    return;
  }
  downloadText(content, "hwp-preview.md");
});
