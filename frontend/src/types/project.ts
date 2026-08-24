export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  target_users: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
  goal?: string | null;
  target_users?: string | null;
  platform?: string | null;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string | null;
  goal?: string | null;
  target_users?: string | null;
  platform?: string | null;
}
