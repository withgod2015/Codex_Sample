# WebAssembly 로 실행하는 C 프로그램 샘플

이 프로젝트는 Emscripten을 사용해 `src/hello.c`를 WebAssembly로 컴파일하고,
브라우저에서 JavaScript로 C 함수를 호출하는 최소 예제를 제공합니다.

## 구성
- `src/hello.c` ? 브라우저로 가져올 C 소스 코드
- `web/index.html` ? 데모 UI와 모듈 로딩 엔트리 포인트
- `web/main.js` ? WebAssembly 모듈을 로드하고 C 함수를 호출하는 스크립트
- `web/styles.css` ? 간단한 스타일 정의

## 준비 사항
1. [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) 설치
   ```powershell
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   emsdk install latest
   emsdk activate latest
   ./emsdk_env.ps1  # 또는 emsdk_env.bat
   ```
2. 정적 파일을 제공할 간단한 HTTP 서버 (예: `python -m http.server`)

## 빌드
PowerShell 기준 예시입니다. `emsdk_env.ps1`를 실행해 Emscripten 환경 변수를 적용한 뒤 실행하세요.

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

위 명령은 `web/hello.mjs` 파일을 생성하며, `index.html`과 동일한 폴더에 있어야 합니다.

## 실행
1. 빌드 후 `Web_C_Lang/web` 디렉터리에서 정적 서버를 실행합니다.
   ```powershell
   cd Web_C_Lang/web
   python -m http.server 8080
   ```
2. 브라우저에서 <http://localhost:8080> 접속
3. "main() 실행" 버튼이나 폼을 이용해 C 함수 호출 결과를 확인합니다.

## 참고
- `-sNO_INITIAL_RUN=1` 옵션 덕분에 모듈 로드 시 `main()`이 자동 실행되지 않습니다.
- `EMSCRIPTEN_KEEPALIVE` 매크로를 통해 `add`, `factorial` 함수를 최적화 과정에서 제거하지 않도록 표시했습니다.
