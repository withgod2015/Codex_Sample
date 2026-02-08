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
const fullHexPanel = document.getElementById("fullHexPanel");
const fullHex = document.getElementById("fullHex");
const toggleFullText = document.getElementById("toggleFullText");
const toggleFullHex = document.getElementById("toggleFullHex");
const markdownOutput = document.getElementById("markdownOutput");
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

const toHexPreview = (buffer, maxBytes) => {
  const limit = maxBytes ?? buffer.byteLength;
  const bytes = new Uint8Array(buffer.slice(0, limit));
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

const extractPrintableText = (text, limit = 40) => {
  const sanitized = text.replace(/\u0000/g, " ");
  const matches = sanitized.match(/[\p{Script=Hangul}A-Za-z0-9 ,.!?\n\r\t-]{6,}/gu);
  if (!matches) {
    return "텍스트를 찾지 못했습니다. (바이너리 형식일 수 있습니다.)";
  }
  const preview = matches
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join("\n");
  return preview || "텍스트를 찾지 못했습니다. (바이너리 형식일 수 있습니다.)";
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

const toMarkdown = (file, fullTextContent) => {
  if (!fullTextContent) {
    return "텍스트를 추출하지 못했습니다.";
  }
  const lines = fullTextContent.split(/\r?\n/).map((line) => line.trim());
  const body = lines.filter(Boolean).join("\n\n");
  return `# ${file.name}\n\n${body}`;
};

const resetPanels = () => {
  textPreview.textContent = "파일을 업로드하면 텍스트가 표시됩니다.";
  hexPreview.textContent = "파일을 업로드하면 HEX가 표시됩니다.";
  fullText.textContent = "-";
  fullHex.textContent = "-";
  markdownOutput.value = "";
  fullTextPanel.classList.add("hidden");
  fullHexPanel.classList.add("hidden");
  toggleFullText.textContent = "전체 보기";
  toggleFullHex.textContent = "전체 보기";
};

const handleFile = async (file) => {
  if (!file) {
    return;
  }
  if (!file.name.toLowerCase().endsWith(".hwp")) {
    textPreview.textContent = "지원하지 않는 파일입니다. .hwp 파일을 선택하세요.";
    hexPreview.textContent = "-";
    fullText.textContent = "-";
    fullHex.textContent = "-";
    markdownOutput.value = "";
    return;
  }

  const buffer = await file.arrayBuffer();
  updateFileInfo(file, buffer);
  hexPreview.textContent = toHexPreview(buffer, 4096);
  fullHex.textContent = toHexPreview(buffer);

  const utf16 = decodeWith(buffer, "utf-16le");
  const utf8 = decodeWith(buffer, "utf-8");
  const candidateText = utf16 && utf16.length > 0 ? utf16 : utf8;

  if (!candidateText) {
    textPreview.textContent = "텍스트를 추출하지 못했습니다. 다른 파일을 시도해 주세요.";
    fullText.textContent = "텍스트를 추출하지 못했습니다. 다른 파일을 시도해 주세요.";
    markdownOutput.value = "텍스트를 추출하지 못했습니다.";
    return;
  }

  const previewText = extractPrintableText(candidateText, 40);
  const fullTextContent = extractPrintableText(candidateText, 5000);
  textPreview.textContent = previewText;
  fullText.textContent = fullTextContent;
  markdownOutput.value = toMarkdown(file, fullTextContent);
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
  fullTextPanel.classList.toggle("hidden");
  toggleFullText.textContent = fullTextPanel.classList.contains("hidden")
    ? "전체 보기"
    : "접기";
});

toggleFullHex.addEventListener("click", () => {
  fullHexPanel.classList.toggle("hidden");
  toggleFullHex.textContent = fullHexPanel.classList.contains("hidden")
    ? "전체 보기"
    : "접기";
});

downloadMarkdown.addEventListener("click", () => {
  const content = markdownOutput.value || "텍스트를 추출하지 못했습니다.";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName.textContent || "document"}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

resetPanels();
