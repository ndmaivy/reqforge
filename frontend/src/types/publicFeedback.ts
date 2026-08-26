export interface PublicFormDto {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicFormTokenDto extends PublicFormDto {
  token: string;
  public_url: string;
}

export interface PublicFormCreateRequest {
  title: string;
  description?: string | null;
  expires_at?: string | null;
}

export interface PublicFormUpdateRequest {
  title?: string;
  description?: string | null;
  is_active?: boolean;
  expires_at?: string | null;
}

export interface PublicFormContextDto {
  project_name: string;
  product_name: string | null;
  title: string;
  description: string | null;
  allowed_metadata_options: string[];
}

export interface PublicFeedbackSubmissionRequest {
  content: string;
  user_segment?: string | null;
  context?: string | null;
  feedback_date?: string | null;
  submission_key?: string | null;
}

export interface PublicSubmissionReceiptDto {
  receipt_id: string;
  created_at: string;
  accepted: boolean;
}
