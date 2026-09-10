from __future__ import annotations

# DOCX XML templates intentionally use long single-line literals.
# ruff: noqa: E501
import csv
import re
from collections import Counter
from datetime import UTC, datetime
from io import BytesIO, StringIO
from uuid import UUID
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session

from app.core.exceptions import BaselineCreationError, NotFoundError
from app.db.models import Project, Requirement, RequirementBaseline
from app.db.models.enums import (
    FeedbackStatus,
    IssueStatus,
    ProjectRole,
    RequirementStatus,
    UserNeedStatus,
)
from app.modules.projects.service import ProjectService
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import (
    ApprovedRequirement,
    BaselineResponse,
    BaselineSummary,
    FeedbackSummary,
    KeyUserNeed,
    OutstandingConsistencyFinding,
    OutstandingIssue,
    ProjectReport,
    ReportProjectSummary,
    RequirementSummary,
    SupportingNeed,
    TraceabilityRow,
    UserNeedSummary,
    ValidationSummary,
)


class BaselineNotFound(NotFoundError):
    code = "BASELINE_NOT_FOUND"


class ReportService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ReportRepository(session)
        self.projects = ProjectService(session)

    def get_live_report(self, project_id: UUID, user_id: UUID) -> ProjectReport:
        project = self.projects.get(project_id, user_id)
        return self._build_report(project)

    def create_baseline(self, project_id: UUID, user_id: UUID, name: str, notes: str | None) -> RequirementBaseline:
        project = self.projects.get(project_id, user_id, ProjectRole.EDITOR)
        report = self._build_report(project)
        if not report.approved_requirement_set:
            raise BaselineCreationError(
                "At least one approved requirement is required before creating a baseline"
            )
        baseline = self.repository.create_baseline(
            RequirementBaseline(
                project_id=project.id,
                version=self.repository.next_baseline_version(project.id),
                name=name,
                notes=notes,
                snapshot=report.model_dump(mode="json"),
                created_by_id=user_id,
            )
        )
        self.session.commit()
        self.session.refresh(baseline)
        return baseline

    def list_baselines(self, project_id: UUID, user_id: UUID) -> list[RequirementBaseline]:
        self.projects.get(project_id, user_id)
        return self.repository.list_baselines(project_id)

    def get_baseline(
        self, project_id: UUID, baseline_id: UUID, user_id: UUID
    ) -> RequirementBaseline:
        baseline = self.repository.get_baseline(baseline_id)
        if baseline is None or baseline.project_id != project_id:
            raise BaselineNotFound("Requirement baseline not found")
        self.projects.get(project_id, user_id)
        return baseline

    def baseline_response(self, baseline: RequirementBaseline) -> BaselineResponse:
        return BaselineResponse(
            id=baseline.id,
            project_id=baseline.project_id,
            version=baseline.version,
            name=baseline.name,
            notes=baseline.notes,
            created_at=baseline.created_at,
            created_by_id=baseline.created_by_id,
            snapshot=ProjectReport.model_validate(baseline.snapshot),
        )

    def baseline_summary(self, baseline: RequirementBaseline) -> BaselineSummary:
        return BaselineSummary.model_validate(baseline)

    def requirements_csv(self, baseline: RequirementBaseline) -> tuple[str, str]:
        report = ProjectReport.model_validate(baseline.snapshot)
        output = StringIO(newline="")
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "requirement_id",
                "title",
                "description",
                "type",
                "status",
                "generated_by",
                "source_type",
                "source_reference",
                "confidence",
                "source_need_ids",
                "source_need_titles",
                "supporting_feedback_ids",
                "supporting_feedback_count",
                "validation_outdated",
                "open_issue_count",
            ],
        )
        writer.writeheader()
        for requirement in report.approved_requirement_set:
            writer.writerow(
                {
                    "requirement_id": str(requirement.id),
                    "title": requirement.title,
                    "description": requirement.description,
                    "type": requirement.type.value,
                    "status": requirement.status.value,
                    "generated_by": requirement.generated_by.value,
                    "source_type": requirement.source_type.value,
                    "source_reference": requirement.source_reference or "",
                    "confidence": (
                        requirement.confidence if requirement.confidence is not None else ""
                    ),
                    "source_need_ids": ";".join(str(need.id) for need in requirement.source_needs),
                    "source_need_titles": ";".join(need.title for need in requirement.source_needs),
                    "supporting_feedback_ids": ";".join(
                        str(feedback_id) for feedback_id in requirement.supporting_feedback_ids
                    ),
                    "supporting_feedback_count": requirement.supporting_feedback_count,
                    "validation_outdated": str(requirement.validation_outdated).lower(),
                    "open_issue_count": requirement.open_issue_count,
                }
            )
        slug = re.sub(r"[^a-z0-9]+", "-", report.project.name.lower()).strip("-") or "project"
        filename = f"reqforge_{slug}_baseline_v{baseline.version}_requirements.csv"
        return "\ufeff" + output.getvalue(), filename

    def report_docx(self, report: ProjectReport, filename: str) -> tuple[bytes, str]:
        """Build a small, portable Word document without browser print/screenshot rendering."""
        def paragraph(text: str = "", style: str | None = None) -> str:
            style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
            return f'<w:p>{style_xml}<w:r><w:t xml:space="preserve">{escape(str(text))}</w:t></w:r></w:p>'

        def table(headers: list[str], rows: list[list[str]]) -> str:
            parts = ['<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>']
            for row_index, row in enumerate([headers, *rows]):
                parts.append("<w:tr>")
                for cell in row:
                    bold = "<w:rPr><w:b/></w:rPr>" if row_index == 0 else ""
                    parts.append(f'<w:tc><w:p><w:r>{bold}<w:t xml:space="preserve">{escape(str(cell))}</w:t></w:r></w:p></w:tc>')
                parts.append("</w:tr>")
            parts.append("</w:tbl>")
            return "".join(parts)

        body = [paragraph("REQFORGE", "Title"), paragraph("BÁO CÁO YÊU CẦU DỰ ÁN", "Title")]
        body += [paragraph(report.project.name, "Heading1"), paragraph(f"Ngày tạo báo cáo: {report.project.generated_at:%d/%m/%Y %H:%M}")]
        body += [paragraph("1. Tổng quan dự án", "Heading1"), paragraph(report.project.goal or "Chưa cập nhật mục tiêu."), paragraph(f"Đối tượng người dùng: {', '.join(report.project.target_users) or 'Chưa cập nhật'}"), paragraph(f"Nền tảng: {report.project.platform or 'Chưa cập nhật'}")]
        body += [paragraph("2. Tóm tắt", "Heading1"), table(["Chỉ số", "Giá trị"], [["Tổng phản hồi", report.feedback.total], ["Phản hồi đã phân tích", report.feedback.by_status.get("ANALYZED", 0)], ["Nhu cầu đã xác nhận", report.user_needs.confirmed], ["Yêu cầu đã phê duyệt", report.requirements.approved], ["Vấn đề còn mở", report.validation.open_issues]])]
        body.append(paragraph("3. Nhu cầu người dùng", "Heading1"))
        for need in report.key_user_needs:
            body += [paragraph(need.title, "Heading2"), paragraph(need.description), paragraph(f"Độ tin cậy: {need.confidence if need.confidence is not None else 'Chưa xác định'} · {need.supporting_feedback_count} phản hồi nguồn")]
            if need.supporting_feedback_ids:
                body.append(paragraph("Feedback nguồn: " + ", ".join(str(item) for item in need.supporting_feedback_ids)))
        body.append(paragraph("4. Yêu cầu đã duyệt", "Heading1"))
        for requirement in report.approved_requirement_set:
            body += [paragraph(requirement.title, "Heading2"), paragraph(requirement.description), paragraph(f"Trạng thái: {requirement.status.value} · Loại: {requirement.type.value}"), paragraph("Nhu cầu nguồn: " + (", ".join(item.title for item in requirement.source_needs) or "Chưa xác định"))]
        body += [paragraph("5. Traceability", "Heading1"), table(["Yêu cầu", "Nhu cầu", "Feedback"], [[row.requirement_title, row.need_title, ", ".join(str(item) for item in row.supporting_feedback_ids)] for row in report.traceability_matrix])]
        body += [paragraph("6. Vấn đề còn mở", "Heading1"), table(["Yêu cầu", "Mức độ", "Mô tả"], [[issue.requirement_title, issue.severity.value, issue.description] for issue in report.outstanding_issues] or [["-", "-", "Không có"]])]
        document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{"".join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>'''
        styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:outlineLvl w:val="0"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:outlineLvl w:val="1"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style></w:styles>'''
        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'''
        rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
        output = BytesIO()
        with ZipFile(output, "w", ZIP_DEFLATED) as archive:
            archive.writestr("[Content_Types].xml", content_types)
            archive.writestr("_rels/.rels", rels)
            archive.writestr("word/document.xml", document)
            archive.writestr("word/styles.xml", styles)
        return output.getvalue(), filename

    def _build_report(self, project: Project) -> ProjectReport:
        feedback = self.repository.feedback_for_project(project.id)
        needs = self.repository.needs_for_project(project.id)
        requirements = self.repository.requirements_for_project(project.id)
        validation_runs = self.repository.completed_validation_runs(project.id)
        validation_by_requirement = self._latest_validation_runs(validation_runs)
        consistency_findings = self.repository.open_consistency_findings(project.id)

        feedback_statuses = self._status_counts(feedback, FeedbackStatus)
        need_statuses = self._status_counts(needs, UserNeedStatus)
        requirement_statuses = self._status_counts(requirements, RequirementStatus)
        issues = [issue for requirement in requirements for issue in requirement.issues]
        issue_statuses = self._status_counts(issues, IssueStatus)
        severity_counts = Counter(issue.severity.value for issue in issues)
        feedback_dates = [item.feedback_date for item in feedback if item.feedback_date is not None]

        key_needs = sorted(
            needs,
            key=lambda need: (-len(need.feedback_links), need.created_at, str(need.id)),
        )
        confirmed_needs = [need for need in key_needs if need.status is UserNeedStatus.CONFIRMED]
        approved_requirements = [
            requirement
            for requirement in requirements
            if requirement.status is RequirementStatus.APPROVED
        ]

        approved_set = [
            self._approved_requirement(requirement, validation_by_requirement.get(requirement.id))
            for requirement in approved_requirements
        ]
        traceability = self._traceability(approved_requirements)
        outstanding_issues = sorted(
            [
                OutstandingIssue(
                    id=issue.id,
                    requirement_id=requirement.id,
                    requirement_title=requirement.title,
                    issue_type=issue.issue_type,
                    severity=issue.severity,
                    status=issue.status,
                    description=issue.description,
                    suggestion=issue.suggestion,
                    confidence=issue.confidence,
                    created_at=issue.created_at,
                )
                for requirement in requirements
                for issue in requirement.issues
                if issue.status is IssueStatus.OPEN
            ],
            key=lambda issue: (issue.created_at, str(issue.id)),
        )

        return ProjectReport(
            project=ReportProjectSummary(
                id=project.id,
                name=project.name,
                product_name=project.product_name,
                goal=project.goal,
                target_users=project.target_users,
                platform=project.platform,
                main_features=project.main_features,
                generated_at=datetime.now(UTC),
                feedback_coverage_start=min(feedback_dates) if feedback_dates else None,
                feedback_coverage_end=max(feedback_dates) if feedback_dates else None,
            ),
            feedback=FeedbackSummary(
                total=len(feedback),
                by_status=feedback_statuses,
                by_source=dict(
                    sorted(Counter(item.source for item in feedback if item.source).items())
                ),
            ),
            user_needs=UserNeedSummary(
                total=len(needs),
                confirmed=need_statuses[UserNeedStatus.CONFIRMED.value],
                candidate=need_statuses[UserNeedStatus.CANDIDATE.value],
                rejected=need_statuses[UserNeedStatus.REJECTED.value],
            ),
            requirements=RequirementSummary(
                total=len(requirements),
                approved=requirement_statuses[RequirementStatus.APPROVED.value],
                needs_review=requirement_statuses[RequirementStatus.NEEDS_REVIEW.value],
                rejected=requirement_statuses[RequirementStatus.REJECTED.value],
                archived=requirement_statuses[RequirementStatus.ARCHIVED.value],
                draft=requirement_statuses[RequirementStatus.DRAFT.value],
            ),
            validation=ValidationSummary(
                total_issues=len(issues),
                open_issues=issue_statuses[IssueStatus.OPEN.value],
                resolved_issues=issue_statuses[IssueStatus.RESOLVED.value],
                dismissed_issues=issue_statuses[IssueStatus.DISMISSED.value],
                by_severity=dict(sorted(severity_counts.items())),
            ),
            key_user_needs=[
                KeyUserNeed(
                    id=need.id,
                    title=need.title,
                    description=need.description,
                    confidence=need.confidence,
                    supporting_feedback_count=len(need.feedback_links),
                    supporting_feedback_ids=self._feedback_ids(need.feedback_links),
                    created_at=need.created_at,
                )
                for need in confirmed_needs
            ],
            approved_requirement_set=approved_set,
            traceability_matrix=traceability,
            outstanding_issues=outstanding_issues,
            consistency_findings=[
                OutstandingConsistencyFinding(
                    id=item.id,
                    finding_type=item.finding_type,
                    severity=item.severity,
                    status=item.status,
                    need_id=item.need_id,
                    requirement_id=item.requirement_id,
                    description=item.description,
                    suggestion=item.suggestion,
                    confidence=item.confidence,
                    created_at=item.created_at,
                )
                for item in consistency_findings
            ],
        )

    @staticmethod
    def _status_counts(items: list[object], enum_type: type) -> dict[str, int]:
        counts = {item.value: 0 for item in enum_type}  # type: ignore[union-attr]
        counts.update(Counter(item.status.value for item in items))  # type: ignore[union-attr]
        return counts

    @staticmethod
    def _latest_validation_runs(runs: list) -> dict[UUID, object]:
        latest: dict[UUID, object] = {}
        for run in runs:
            requirement_id = (run.input_snapshot or {}).get("requirement_id")
            try:
                parsed_id = UUID(requirement_id)
            except (TypeError, ValueError):
                continue
            latest.setdefault(parsed_id, run)
        return latest

    def _approved_requirement(
        self, requirement: Requirement, latest_run: object | None
    ) -> ApprovedRequirement:
        run = latest_run
        validation_outdated = True
        latest_validation_run_id = None
        if run is not None and run.completed_at is not None:
            completed_at = self._as_utc(run.completed_at)
            updated_at = self._as_utc(requirement.updated_at)
            validation_outdated = completed_at < updated_at
            latest_validation_run_id = run.id
        feedback_ids = {
            feedback_id
            for link in requirement.need_links
            for feedback_id in self._feedback_ids(link.need.feedback_links)
        }
        needs = sorted(
            (
                SupportingNeed(id=link.need.id, title=link.need.title)
                for link in requirement.need_links
            ),
            key=lambda need: str(need.id),
        )
        return ApprovedRequirement(
            id=requirement.id,
            title=requirement.title,
            description=requirement.description,
            type=requirement.type,
            status=requirement.status,
            generated_by=requirement.generated_by,
            source_type=requirement.source_type,
            source_reference=requirement.source_reference,
            review_note=requirement.review_note,
            acknowledged_outdated_validation=requirement.acknowledged_outdated_validation,
            acknowledged_open_high_issues=requirement.acknowledged_open_high_issues,
            confidence=requirement.confidence,
            source_needs=needs,
            supporting_feedback_ids=sorted(feedback_ids, key=str),
            supporting_feedback_count=len(feedback_ids),
            validation_outdated=validation_outdated,
            latest_validation_run_id=latest_validation_run_id,
            open_issue_count=sum(issue.status is IssueStatus.OPEN for issue in requirement.issues),
        )

    def _traceability(self, requirements: list[Requirement]) -> list[TraceabilityRow]:
        rows = []
        for requirement in requirements:
            for link in sorted(requirement.need_links, key=lambda item: str(item.need_id)):
                rows.append(
                    TraceabilityRow(
                        requirement_id=requirement.id,
                        requirement_title=requirement.title,
                        need_id=link.need.id,
                        need_title=link.need.title,
                        supporting_feedback_ids=self._feedback_ids(link.need.feedback_links),
                    )
                )
        return rows

    @staticmethod
    def _feedback_ids(links: list) -> list[UUID]:
        return sorted({link.feedback_id for link in links}, key=str)

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
