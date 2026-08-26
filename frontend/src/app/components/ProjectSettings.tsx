import { useEffect, useState } from "react";
import { Loader, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "../data/mockData";
import { ConfirmDialog } from "./Modal";
import { getErrorMessage } from "../../services/api";
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  transferProjectOwnership,
  updateProjectMember,
} from "../../services/projects";
import type { ProjectMemberDto, ProjectRoleDto, ProjectUpdateRequest } from "../../types/project";

interface ProjectSettingsProps {
  project: Project;
  onUpdate: (payload: ProjectUpdateRequest) => Promise<void>;
  onArchive: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export function ProjectSettings({ project, onUpdate, onArchive, onLeave }: ProjectSettingsProps) {
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [name, setName] = useState(project.name);
  const [productName, setProductName] = useState(project.productName ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [confirmAction, setConfirmAction] = useState<"archive" | "leave" | null>(null);
  const isOwner = project.currentUserRole === "OWNER";

  const loadMembers = async () => {
    setLoading(true);
    try { setMembers(await listProjectMembers(project.id)); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to load project members.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadMembers(); }, [project.id]);

  const saveProject = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onUpdate({ name: name.trim(), product_name: productName.trim() || null, description: description.trim() || null });
      toast.success("Project settings saved");
    } catch (error) { toast.error(getErrorMessage(error, "Unable to update project.")); }
    finally { setBusy(false); }
  };

  const addMember = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    try { const added = await addProjectMember(project.id, { email: email.trim(), role }); setMembers((current) => [...current, added]); setEmail(""); toast.success("Member added"); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to add member.")); }
    finally { setBusy(false); }
  };

  const changeRole = async (member: ProjectMemberDto, nextRole: ProjectRoleDto) => {
    if (nextRole === "OWNER") return;
    try { const updated = await updateProjectMember(project.id, member.id, { role: nextRole }); setMembers((current) => current.map((item) => item.id === updated.id ? updated : item)); toast.success("Member role updated"); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to update member role.")); }
  };

  const remove = async (member: ProjectMemberDto) => {
    try { await removeProjectMember(project.id, member.id); setMembers((current) => current.filter((item) => item.id !== member.id)); toast.success("Member removed"); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to remove member.")); }
  };

  const transfer = async (member: ProjectMemberDto) => {
    if (!window.confirm(`Transfer project ownership to ${member.email}?`)) return;
    try { await transferProjectOwnership(project.id, member.id); await loadMembers(); toast.success("Ownership transferred"); }
    catch (error) { toast.error(getErrorMessage(error, "Unable to transfer ownership.")); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div><h1 className="text-xl font-bold text-slate-900">Project settings</h1><p className="mt-1 text-sm text-slate-500">Manage project metadata, access, and lifecycle.</p></div>
        <section className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="mb-4 text-sm font-semibold">General</h2>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-medium text-slate-600">Project name<input value={name} onChange={(event) => setName(event.target.value)} disabled={!isOwner && project.currentUserRole !== "EDITOR"} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Product name<input value={productName} onChange={(event) => setProductName(event.target.value)} disabled={!isOwner && project.currentUserRole !== "EDITOR"} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50" /></label></div>
          <label className="mt-4 block text-xs font-medium text-slate-600">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!isOwner && project.currentUserRole !== "EDITOR"} rows={3} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-50" /></label>
          {project.currentUserRole !== "VIEWER" && <button onClick={() => void saveProject()} disabled={busy || !name.trim()} className="mt-4 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save changes</button>}
        </section>

        <section className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--border)" }}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Members</h2><p className="mt-1 text-xs text-slate-500">OWNER controls membership; EDITOR can change content; VIEWER is read-only.</p></div><Shield size={18} className="text-blue-900" /></div>
          {isOwner && <div className="mb-4 flex gap-2"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Registered user email" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><select value={role} onChange={(event) => setRole(event.target.value as "EDITOR" | "VIEWER")} className="rounded-lg border px-3 py-2 text-sm"><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select><button onClick={() => void addMember()} disabled={!email.trim() || busy} className="flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={14} /> Add</button></div>}
          {loading ? <Loader size={18} className="animate-spin" /> : <div className="divide-y">{members.map((member) => <div key={member.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.full_name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div>{isOwner && member.role !== "OWNER" ? <select value={member.role} onChange={(event) => void changeRole(member, event.target.value as ProjectRoleDto)} className="rounded-md border px-2 py-1 text-xs"><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select> : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{member.role}</span>}{isOwner && member.role !== "OWNER" && <><button onClick={() => void transfer(member)} className="text-xs font-medium text-blue-800">Make owner</button><button onClick={() => void remove(member)} title="Remove member"><Trash2 size={15} className="text-red-600" /></button></>}</div>)}</div>}
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-5"><h2 className="text-sm font-semibold text-red-700">Danger zone</h2><p className="my-2 text-xs text-slate-500">Archived projects become read-only. Non-owners can leave the project instead.</p>{isOwner ? <button onClick={() => setConfirmAction("archive")} disabled={project.status === "Archived"} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Archive project</button> : <button onClick={() => setConfirmAction("leave")} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Leave project</button>}</section>
      </div>
      {confirmAction && <ConfirmDialog title={confirmAction === "archive" ? "Archive project?" : "Leave project?"} message={confirmAction === "archive" ? "This project will become read-only." : "You will lose access to this project."} confirmLabel={confirmAction === "archive" ? "Archive" : "Leave"} confirmDanger onConfirm={() => void (confirmAction === "archive" ? onArchive() : onLeave()).then(() => setConfirmAction(null)).catch((error) => toast.error(getErrorMessage(error, "Action failed.")))} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
