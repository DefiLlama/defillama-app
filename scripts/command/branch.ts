const BRANCH_ENV_KEYS = ['BRANCH_NAME', 'COOLIFY_BRANCH', 'GITHUB_HEAD_REF', 'GITHUB_REF_NAME', 'GITHUB_REF'] as const

export function normalizeBranchName(value: string | undefined): string {
	const normalized = value?.trim() ?? ''
	if (!normalized || normalized === 'HEAD') return ''
	return normalized.replace(/^refs\/(heads|tags)\//, '').replace(/^refs\//, '')
}

export function detectBranchName(env: NodeJS.ProcessEnv = process.env): string {
	for (const key of BRANCH_ENV_KEYS) {
		const branchName = normalizeBranchName(env[key])
		if (branchName) return branchName
	}
	return ''
}
