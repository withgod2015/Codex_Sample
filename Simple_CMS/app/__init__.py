import os
from pathlib import Path

from flask import Flask
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def create_app(test_config: dict | None = None) -> Flask:
    """Application factory for the CMS service."""
    app = Flask(__name__, instance_relative_config=True)

    default_db = f"sqlite:///{Path(app.instance_path) / 'cms.db'}"
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev"),
        SQLALCHEMY_DATABASE_URI=os.environ.get("SQLALCHEMY_DATABASE_URI", default_db),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    if test_config:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    db.init_app(app)

    from .routes import cms_bp  # noqa: E402

    app.register_blueprint(cms_bp)

    with app.app_context():
        db.create_all()

    @app.get("/health")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
