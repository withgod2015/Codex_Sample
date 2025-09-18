# WebAssembly �� �����ϴ� C ���α׷� ����

�� ������Ʈ�� Emscripten�� ����� `src/hello.c`�� WebAssembly�� �������ϰ�,
���������� JavaScript�� C �Լ��� ȣ���ϴ� �ּ� ������ �����մϴ�.

## ����
- `src/hello.c` ? �������� ������ C �ҽ� �ڵ�
- `web/index.html` ? ���� UI�� ��� �ε� ��Ʈ�� ����Ʈ
- `web/main.js` ? WebAssembly ����� �ε��ϰ� C �Լ��� ȣ���ϴ� ��ũ��Ʈ
- `web/styles.css` ? ������ ��Ÿ�� ����

## �غ� ����
1. [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) ��ġ
   ```powershell
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   emsdk install latest
   emsdk activate latest
   ./emsdk_env.ps1  # �Ǵ� emsdk_env.bat
   ```
2. ���� ������ ������ ������ HTTP ���� (��: `python -m http.server`)

## ����
PowerShell ���� �����Դϴ�. `emsdk_env.ps1`�� ������ Emscripten ȯ�� ������ ������ �� �����ϼ���.

```powershell
cd Web_C_Lang

emcc src/hello.c `
  -O2 `
  -sEXPORTED_FUNCTIONS='["_main","_factorial","_add"]' `
  -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' `
  -sMODULARIZE=1 `
  -sEXPORT_ES6=1 `
  -sNO_INITIAL_RUN=1 `
  -sEXIT_RUNTIME=0 `
  -o web/hello.mjs
```

�� ����� `web/hello.mjs` ������ �����ϸ�, `index.html`�� ������ ������ �־�� �մϴ�.

## ����
1. ���� �� `Web_C_Lang/web` ���͸����� ���� ������ �����մϴ�.
   ```powershell
   cd Web_C_Lang/web
   python -m http.server 8080
   ```
2. ���������� <http://localhost:8080> ����
3. "main() ����" ��ư�̳� ���� �̿��� C �Լ� ȣ�� ����� Ȯ���մϴ�.

## ����
- `-sNO_INITIAL_RUN=1` �ɼ� ���п� ��� �ε� �� `main()`�� �ڵ� ������� �ʽ��ϴ�.
- `EMSCRIPTEN_KEEPALIVE` ��ũ�θ� ���� `add`, `factorial` �Լ��� ����ȭ �������� �������� �ʵ��� ǥ���߽��ϴ�.
