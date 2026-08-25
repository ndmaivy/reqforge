from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook


def create_project(client, name: str = "Hotel Booking") -> dict:
    response = client.post(
        "/api/v1/projects",
        json={
            "name": name,
            "description": "Improve booking UX",
            "goal": "Make hotel discovery easier",
            "target_users": "Travelers",
            "platform": "Web",
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_health_and_project_crud(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}

    project = create_project(client)
    project_id = project["id"]
    response = client.patch(
        f"/api/v1/projects/{project_id}", json={"name": "Booking Experience"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Booking Experience"
    assert client.get("/api/v1/projects").json()["meta"]["total"] == 1

    missing = client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "PROJECT_NOT_FOUND"


def test_feedback_csv_import_is_atomic(client):
    project_id = create_project(client)["id"]
    response = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={
            "file": (
                "feedback.csv",
                "content,source,feedback_date\nHard to filter,INTERVIEW,2026-08-23\n,FORM,\n",
                "text/csv",
            )
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_FILE_ERROR"
    assert client.get(f"/api/v1/projects/{project_id}/feedback").json()["meta"]["total"] == 0

    valid = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={
            "file": (
                "feedback.csv",
                "content,source,feedback_date\nHard to filter,INTERVIEW,2026-08-23\n",
                "text/csv",
            )
        },
    )
    assert valid.status_code == 201
    assert valid.json()["data"]["imported_count"] == 1


def test_feedback_xlsx_import(client):
    project_id = create_project(client)["id"]
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["content", "source", "feedback_date"])
    sheet.append(["The mobile page is difficult to read", "INTERVIEW", "2026-08-23"])
    stream = BytesIO()
    workbook.save(stream)

    response = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={
            "file": (
                "feedback.xlsx",
                stream.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 201
    assert response.json()["data"]["imported_count"] == 1


def test_feedback_import_validates_headers_dates_and_empty_files(client):
    project_id = create_project(client)["id"]
    endpoint = f"/api/v1/projects/{project_id}/feedback/import"

    missing_content = client.post(
        endpoint,
        files={"file": ("feedback.csv", "message,source\nMissing header,SURVEY\n", "text/csv")},
    )
    empty_file = client.post(
        endpoint,
        files={"file": ("feedback.csv", "content,source,feedback_date\n", "text/csv")},
    )
    invalid_date = client.post(
        endpoint,
        files={
            "file": (
                "feedback.csv",
                "content,source,feedback_date\nValid row,SURVEY,not-a-date\n",
                "text/csv",
            )
        },
    )

    assert missing_content.status_code == 422
    assert empty_file.status_code == 422
    assert invalid_date.status_code == 422
    assert client.get(f"/api/v1/projects/{project_id}/feedback").json()["meta"]["total"] == 0


def test_feedback_xlsx_import_ignores_completely_empty_rows(client):
    project_id = create_project(client)["id"]
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["content", "source", "feedback_date"])
    sheet.append(["Actual workbook feedback", "APP_REVIEW", "2026-07-01T08:00:00"])
    sheet.append([None, None, None])
    stream = BytesIO()
    workbook.save(stream)

    response = client.post(
        f"/api/v1/projects/{project_id}/feedback/import",
        files={
            "file": (
                "feedback.xlsx",
                stream.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 201
    assert response.json()["data"]["imported_count"] == 1
