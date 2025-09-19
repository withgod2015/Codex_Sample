# Simple CMS (Flask + Docker)

A lightweight content management system built with Python (Flask) and packaged for Docker.

## Features
- Create, edit, publish, and delete simple pages
- Auto-generated unique slugs with optional manual override
- SQLite storage with automatic migrations at startup
- Minimal UI for both public site and admin dashboard

## Quickstart (Docker Compose)
```bash
# Build the image
docker compose build

# Launch the container
docker compose up
```

The application will be available at http://localhost:5000. A persistent Docker volume (`instance-data`) is mounted at `/app/instance` to hold the SQLite database file.

## Quickstart (Docker CLI)
```bash
docker build -t simple-cms .
docker run --rm -p 5000:5000 -v simple_cms_instance:/app/instance simple-cms
```

## Local Development (without Docker)
```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows
# source .venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
python app.py
```

Point a browser to http://localhost:5000 to view the public site. Visit http://localhost:5000/admin to manage pages.

## Environment Variables
- `SECRET_KEY` (optional): override the default Flask secret key for production use.
- `SQLALCHEMY_DATABASE_URI` (optional): provide a custom database connection string.

## Project Layout
```
Simple_CMS/
├─ app/
│  ├─ __init__.py      # Flask application factory and DB wiring
│  ├─ models.py        # SQLAlchemy models
│  ├─ routes.py        # Web routes for public and admin pages
│  ├─ templates/       # Jinja templates for UI
│  └─ static/          # Stylesheet and static assets
├─ app.py              # Local development entry point
├─ requirements.txt    # Python dependencies
├─ Dockerfile          # Container image definition
└─ docker-compose.yml  # Compose configuration
```

## Notes
- The SQLite database file (`cms.db`) lives in the Flask `instance` folder, created automatically at runtime.
- For production use, configure a stronger `SECRET_KEY` and switch to a managed database backend.
