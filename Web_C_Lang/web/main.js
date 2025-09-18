// main.js
// Emscripten ������ ������� hello.mjs �� �ҷ��ͼ� ���������� C �Լ��� ȣ���մϴ�.

import createModule from "./hello.mjs";

const state = {
  module: null,
  factorial: null,
  add: null,
};

const logEl = document.getElementById("log");
const runMainButton = document.getElementById("run-main");
const addForm = document.getElementById("add-form");
const addResultEl = document.getElementById("add-result");
const factForm = document.getElementById("fact-form");
const factResultEl = document.getElementById("fact-result");

function appendLog(message) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function handleError(error) {
  console.error(error);
  const text = typeof error?.message === "string" ? error.message : String(error);
  appendLog(`WARNING: ${text}`);
}

async function loadModule() {
  appendLog("WebAssembly ����� �ε��ϴ� ��...");

  try {
    state.module = await createModule({
      print: appendLog,
      printErr: appendLog,
    });

    state.factorial = state.module.cwrap("factorial", "number", ["number"]);
    state.add = state.module.cwrap("add", "number", ["number", "number"]);

    appendLog("��� �ε� �Ϸ�! main()�� �����ϰų� �Լ��� ȣ���غ�����.");
  } catch (error) {
    handleError(error);
  }
}

runMainButton?.addEventListener("click", () => {
  if (!state.module) {
    appendLog("����� ���� �ε���� �ʾҽ��ϴ�.");
    return;
  }

  appendLog("main()�� �����մϴ�...");
  try {
    state.module.ccall("main", "number", [], []);
  } catch (error) {
    handleError(error);
  }
});

addForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.add) {
    appendLog("����� ���� �ε���� �ʾҽ��ϴ�.");
    return;
  }

  const a = Number.parseInt(document.getElementById("add-a").value, 10);
  const b = Number.parseInt(document.getElementById("add-b").value, 10);

  const value = state.add(a, b);
  addResultEl.textContent = `${a} + ${b} = ${value}`;
  appendLog(`add(${a}, ${b}) = ${value}`);
});

factForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.factorial) {
    appendLog("����� ���� �ε���� �ʾҽ��ϴ�.");
    return;
  }

  const n = Number.parseInt(document.getElementById("fact-n").value, 10);
  const value = state.factorial(n);
  factResultEl.textContent = `factorial(${n}) = ${value}`;
  appendLog(`factorial(${n}) = ${value}`);
});

loadModule();
