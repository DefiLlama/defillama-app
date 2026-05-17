export interface Project {
	id: string
	user_id: string
	name: string
	description: string | null
	icon: string | null
	color: string | null
	custom_instructions: string | null
	deleted_at?: string | null
	created_at: string
	updated_at: string
}

export interface ProjectWithStats extends Project {
	file_count: number
	total_bytes: number
}

export interface ProjectFile {
	id: string
	source_id: string
	path: string
	size: number
	content_hash: string
	mime_type: string | null
	created_at: string
	updated_at: string
}

export interface ProjectSource {
	id: string
	project_id: string
	adapter_type: 'blob' | 'github'
	mount_path: string
	config: Record<string, unknown> & {
		owner?: string
		repo?: string
		branch?: string
		installation_id?: number
	}
	last_refreshed_at: string | null
	created_at: string
}

export interface GitHubInstallation {
	installation_id: number
	user_id: string
	account_login: string
	account_type: string
	status: 'active' | 'revoked'
	installed_at: string
	revoked_at: string | null
}

export interface GitHubRepo {
	id: number
	name: string
	full_name: string
	private: boolean
	default_branch: string
}

export interface ImportResult {
	imported: Array<{ path: string; size: number; fileId: string }>
	skipped: Array<{ path: string; reason: string }>
}

export interface ProjectUsage {
	tier: ProjectTier
	bytes_used: number
	bytes_reserved: number
	file_count: number
	project_count: number
	limits: {
		user_bytes: number | null
		project_bytes: number
		project_files: number
		projects: number | null
	}
}

export interface ProjectChatSession {
	sessionId: string
	title: string | null
	createdAt: string
	lastActivity: string | null
	isPinned: boolean
	pinnedAt: string | null
	isPublic: boolean
	shareToken: string | null
	hasUnseenCompletion?: boolean
}

export type ProjectTier = 'free' | 'trial' | 'paid' | 'llama'
