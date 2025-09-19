from __future__ import annotations

import re
from types import SimpleNamespace
from typing import Optional

from flask import (
    Blueprint,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)

from . import db
from .models import Page

cms_bp = Blueprint("cms", __name__)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "page"


def _make_unique_slug(base_slug: str, *, exclude_id: Optional[int] = None) -> str:
    slug = base_slug
    counter = 2
    while True:
        query = Page.query.filter_by(slug=slug)
        if exclude_id is not None:
            query = query.filter(Page.id != exclude_id)
        if query.first() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


@cms_bp.route("/")
def home() -> str:
    pages = (
        Page.query.filter_by(is_published=True)
        .order_by(Page.updated_at.desc())
        .all()
    )
    return render_template("index.html", pages=pages)


@cms_bp.route("/pages/<string:slug>")
def page_detail(slug: str) -> str:
    page = Page.query.filter_by(slug=slug, is_published=True).first()
    if page is None:
        abort(404)
    return render_template("page_detail.html", page=page)


@cms_bp.route("/admin")
def admin_home() -> str:
    return redirect(url_for("cms.admin_pages"))


@cms_bp.route("/admin/pages")
def admin_pages() -> str:
    pages = Page.query.order_by(Page.updated_at.desc()).all()
    return render_template("admin_list.html", pages=pages)


@cms_bp.route("/admin/pages/new", methods=["GET", "POST"])
def create_page() -> str:
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        slug = request.form.get("slug", "").strip().lower()
        content = request.form.get("content", "").strip()
        is_published = request.form.get("is_published") == "on"

        errors: list[str] = []
        if not title:
            errors.append("Title is required.")
        if not content:
            errors.append("Content is required.")

        if not slug:
            slug = _slugify(title)
        else:
            slug = _slugify(slug)

        slug = _make_unique_slug(slug)

        if errors:
            for message in errors:
                flash(message, "error")
            return render_template(
                "admin_form.html",
                page=None,
                form_data=SimpleNamespace(
                    title=title,
                    slug=slug,
                    content=content,
                    is_published=is_published,
                ),
            )

        page = Page(
            title=title,
            slug=slug,
            content=content,
            is_published=is_published,
        )
        db.session.add(page)
        db.session.commit()
        flash("Page created successfully.", "success")
        return redirect(url_for("cms.admin_pages"))

    return render_template("admin_form.html", page=None, form_data=None)


@cms_bp.route("/admin/pages/<int:page_id>/edit", methods=["GET", "POST"])
def edit_page(page_id: int) -> str:
    page = Page.query.get_or_404(page_id)

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        slug = request.form.get("slug", "").strip().lower()
        content = request.form.get("content", "").strip()
        is_published = request.form.get("is_published") == "on"

        errors: list[str] = []
        if not title:
            errors.append("Title is required.")
        if not content:
            errors.append("Content is required.")

        if slug:
            slug = _slugify(slug)
        else:
            slug = _slugify(title)

        slug = _make_unique_slug(slug, exclude_id=page.id)

        if errors:
            for message in errors:
                flash(message, "error")
            return render_template(
                "admin_form.html",
                page=page,
                form_data=SimpleNamespace(
                    title=title,
                    slug=slug,
                    content=content,
                    is_published=is_published,
                ),
            )

        page.title = title
        page.slug = slug
        page.content = content
        page.is_published = is_published
        db.session.commit()

        flash("Page updated successfully.", "success")
        return redirect(url_for("cms.admin_pages"))

    return render_template("admin_form.html", page=page, form_data=None)


@cms_bp.route("/admin/pages/<int:page_id>/delete", methods=["POST"])
def delete_page(page_id: int) -> str:
    page = Page.query.get_or_404(page_id)
    db.session.delete(page)
    db.session.commit()
    flash("Page deleted.", "success")
    return redirect(url_for("cms.admin_pages"))
