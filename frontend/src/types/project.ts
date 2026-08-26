export type ProjectStatusDto = "ACTIVE" | "ARCHIVED";
export type ProjectRoleDto = "OWNER" | "EDITOR" | "VIEWER";

export interface ProjectDto {
  id: string;
  name: string;
  product_name: string | null;
  description: string | null;
  goal: string | null;
  target_users: string[];
  platform: string | null;
  main_features: string[];
  additional_context: string | null;
  status: ProjectStatusDto;
  archived_at: string | null;
  current_user_role: ProjectRoleDto | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  product_name?: string | null;
  description?: string | null;
  goal?: string | null;
  target_users?: string[];
  platform?: string | null;
  main_features?: string[];
  additional_context?: string | null;
}

export interface ProjectUpdateRequest {
  name?: string;
  product_name?: string | null;
  description?: string | null;
  goal?: string | null;
  target_users?: string[] | null;
  platform?: string | null;
  main_features?: string[] | null;
  additional_context?: string | null;
}

export interface ProjectMemberDto {
  id: string;
  email: string;
  full_name: string;
  role: ProjectRoleDto;
  joined_at: string;
}

export interface ProjectMemberCreateRequest {
  email: string;
  role: Exclude<ProjectRoleDto, "OWNER">;
}

export interface ProjectMemberUpdateRequest {
  role: Exclude<ProjectRoleDto, "OWNER">;
}
