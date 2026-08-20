"""Tests that marketing nurture scheduling has moved out of Celery."""

from __future__ import annotations


def test_celery_beat_no_longer_schedules_marketing_nurture() -> None:
    from app.core.celery_app import celery_app

    assert "send-due-nurture-emails" not in celery_app.conf.beat_schedule


def test_tasks_package_does_not_import_nurture_module() -> None:
    import app.tasks as tasks

    assert not hasattr(tasks, "nurture")
