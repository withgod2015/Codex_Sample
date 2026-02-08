const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const extractMode = document.getElementById("extractMode");
const textPreview = document.getElementById("textPreview");
const hexPreview = document.getElementById("hexPreview");

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
    return "텍스트를 찾지 못했습니다. (바이너리 형식일 수 있습니다.)";
  }
  const preview = matches
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40)
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
    return;
  }

  textPreview.textContent = extractPrintableText(candidateText);
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
