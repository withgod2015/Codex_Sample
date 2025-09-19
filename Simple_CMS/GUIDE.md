# Simple CMS Implementation Guide

이 가이드는 Python 기반 Flask 프레임워크와 Docker를 활용해 심플 CMS를 구현하는 전 과정을 상세하게 설명합니다. 각 단계는 독립적으로 수행 가능하지만, 순서대로 따라가면 개발과 배포 흐름을 이해하는 데 도움이 됩니다.

## 1. 개발 환경 준비

1. **필수 소프트웨어 설치**
   - Python 3.11 이상 (가상환경 권장)
   - Git (선택 사항, 버전 관리용)
   - Docker Desktop (또는 Docker Engine)과 Docker Compose
2. **프로젝트 디렉터리 준비**
   ```bash
   mkdir Simple_CMS
   cd Simple_CMS
   ```
3. **가상환경 생성 (선택)**
   ```bash
   python -m venv .venv
   # Windows
   . .venv/Scripts/activate
   # macOS / Linux
   source .venv/bin/activate
   ```

## 2. 프로젝트 구조 설계

```
Simple_CMS/
├─ app/
│  ├─ __init__.py      # Flask 앱 팩토리 및 설정
│  ├─ models.py        # SQLAlchemy 모델
│  ├─ routes.py        # 공개/관리자 라우트와 뷰
│  ├─ templates/       # Jinja 템플릿 (base, index, admin 등)
│  └─ static/          # 정적 자원 (CSS)
├─ app.py              # 로컬 개발 실행 진입점
├─ requirements.txt    # Python 의존성 목록
├─ Dockerfile          # Docker 이미지 정의
├─ docker-compose.yml  # 컨테이너 실행 구성
├─ README.md           # 요약 사용법
└─ GUIDE.md            # 구현 상세 가이드 (본 문서)
```

디렉터리는 `app` 폴더를 중심으로 구성되며, Flask 블루프린트 패턴을 사용해 라우트와 템플릿을 모듈화합니다.

## 3. Flask 애플리케이션 구현

### 3.1 의존성 설치

```bash
pip install Flask>=3.0,<4.0 Flask-SQLAlchemy>=3.1,<4.0
```
`requirements.txt`에 의존성을 관리해 Docker 또는 다른 환경에서 동일하게 설치할 수 있게 합니다.

### 3.2 애플리케이션 팩토리 (`app/__init__.py`)

- Flask 인스턴스를 생성하고 기본 설정(SECRET_KEY, DB URI)을 적용합니다.
- `instance` 디렉터리를 생성해 SQLite 데이터베이스(`cms.db`)를 저장합니다.
- SQLAlchemy 확장을 초기화하고, 애플리케이션 컨텍스트에서 `db.create_all()`을 호출해 초기 스키마를 구축합니다.
- 블루프린트(`cms_bp`)를 등록하고 `/health` 엔드포인트로 상태 점검 기능을 제공합니다.

### 3.3 데이터 모델 (`app/models.py`)

`Page` 모델은 다음 필드를 포함합니다:
- `title`: 페이지 제목 (필수)
- `slug`: URL 식별자 (유니크)
- `content`: 본문 (HTML 허용)
- `is_published`: 게시 여부 토글
- `created_at`, `updated_at`: 생성/수정 시각 (자동 관리)

SQLite를 사용하지만, SQLAlchemy 덕분에 다른 DB로도 쉽게 교체할 수 있습니다.

### 3.4 라우트 및 컨트롤러 (`app/routes.py`)

- **공개 영역**: `/`에서 게시된 페이지 목록을 불러오고, `/pages/<slug>`로 상세 페이지를 제공합니다.
- **관리 영역**: `/admin` 리다이렉트, `/admin/pages` 목록, `/admin/pages/new` 생성, `/admin/pages/<id>/edit` 수정, `/admin/pages/<id>/delete` 삭제.
- 폼 검증 후 오류 메시지를 플래시로 표시하고, 슬러그가 중복되지 않도록 `_slugify`, `_make_unique_slug` 헬퍼를 제공합니다.
- `POST` 요청 성공 시 데이터베이스에 커밋하고 관리 목록으로 이동합니다.

### 3.5 템플릿과 스타일

- `base.html`: 공용 레이아웃, 헤더/푸터, 플래시 메시지 영역을 정의합니다.
- `index.html`: 게시된 페이지 목록을 카드 형태로 표시합니다.
- `page_detail.html`: 단일 페이지 내용을 렌더링합니다.
- `admin_list.html`: 관리자용 테이블 UI와 삭제 폼을 구성합니다.
- `admin_form.html`: 생성/수정 폼을 공유하고 기본 HTML 입력을 사용합니다.
- `static/styles.css`: 간단한 반응형 스타일, 버튼/테이블/폼 요소 디자인.

### 3.6 로컬 실행 엔트리 포인트 (`app.py`)

```python
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
```

로컬 개발 시 `python app.py`로 서버를 실행하면 `http://localhost:5000`에서 접근할 수 있습니다.

## 4. 데이터베이스 및 마이그레이션

- 기본적으로 SQLite를 사용하며 `instance/cms.db`에 저장됩니다.
- 다른 데이터베이스를 사용하려면 `SQLALCHEMY_DATABASE_URI` 환경 변수를 설정합니다.
  ```bash
  export SQLALCHEMY_DATABASE_URI="postgresql+psycopg2://user:password@host/db"
  ```
- 현재는 `db.create_all()`로 초기 테이블을 생성합니다. 스키마 변경이 많은 프로젝트라면 Flask-Migrate를 추가하는 것이 좋습니다.

## 5. Docker로 배포하기

### 5.1 Dockerfile

- `python:3.11-slim` 이미지를 기반으로 하며, `requirements.txt`를 설치하고 전체 애플리케이션을 복사합니다.
- Gunicorn을 이용해 프로덕션 WSGI 서버를 실행합니다.

### 5.2 docker-compose.yml

- `web` 서비스 하나로 구성되며, 포트 5000을 개방하고 `instance-data` 볼륨을 `/app/instance`에 마운트합니다.
- `docker compose up --build` 명령으로 빌드와 실행을 동시에 할 수 있습니다.

### 5.3 실행 명령

```bash
docker compose build
docker compose up
```
또는 Docker CLI 단독 사용:
```bash
docker build -t simple-cms .
docker run --rm -p 5000:5000 -v simple_cms_instance:/app/instance simple-cms
```

컨테이너가 준비되면 브라우저에서 `http://localhost:5000`에 접속합니다.

## 6. 기능 사용법

1. **페이지 생성**: `/admin/pages/new`에서 제목/본문을 입력하고 게시 여부를 선택합니다. 슬러그를 비워두면 제목 기반으로 자동 생성됩니다.
2. **수정**: 목록에서 `Edit` 버튼을 눌러 내용을 수정하고 게시 상태를 변경할 수 있습니다.
3. **삭제**: `Delete` 버튼을 누르면 확인 창 후 페이지가 삭제됩니다.
4. **공개 확인**: 게시된 페이지는 공개 홈(`/`) 목록과 `pages/<slug>` URL을 통해 확인합니다.

## 7. 테스트 및 검증

- 최소한의 문법 검증을 위해 `python -m compileall .`로 바이트코드 컴파일 체크를 수행했습니다.
- 추가적으로 pytest와 같은 테스트 러너를 도입해 라우트/모델 단위 테스트를 작성하는 것을 권장합니다.

## 8. 확장 아이디어

- **인증**: Flask-Login 등을 활용해 관리자 인증을 추가합니다.
- **미디어 업로드**: 이미지 첨부를 위해 Flask-Uploads, Flask-Cloudy 등을 통합합니다.
- **Markdown 지원**: Flask-Markdown이나 마크다운 파서를 통해 콘텐츠 입력을 개선합니다.
- **버전 관리**: 페이지 버전을 기록하고 롤백할 수 있도록 모델을 확장합니다.
- **검색 기능**: 페이지만 검색할 수 있는 간단한 풀텍스트 검색을 도입합니다.

## 9. 문제 해결 가이드

- **SQLite 파일 권한 오류**: 컨테이너나 호스트에서 `/app/instance` 디렉터리의 쓰기 권한을 확인합니다.
- **슬러그 충돌**: 제목이 동일한 페이지를 여러 개 만들면 숫자 후미가 자동으로 붙습니다. 필요하면 직접 슬러그를 지정하세요.
- **스타일 미반영**: `app/static/styles.css`가 제대로 연결됐는지 템플릿의 `<link>` 태그를 확인하세요.
- **환경 변수 변경 반영**: Docker 컨테이너를 사용할 경우 `docker compose down && docker compose up`으로 재시작해야 합니다.

## 10. 마무리

본 가이드는 최소 기능을 갖춘 CMS를 구축하기 위한 청사진을 제공합니다. Flask의 확장성과 Docker의 배포 편의성을 활용해 추가 기능을 단계적으로 확장해 나가세요. 프로덕션 배포 전에는 SSL, 리버스 프록시(Nginx), 성능 모니터링 등의 요소를 함께 검토하는 것이 좋습니다.
