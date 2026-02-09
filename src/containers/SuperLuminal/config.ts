export interface SuperLuminalConfig {
	dashboardId: string
	branding: {
		name: string
		logo?: string
	}
}

export function getSuperLuminalConfig(): SuperLuminalConfig | null {
	const dashboardId = process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
	if (!dashboardId) return null

	return {
		dashboardId,
		branding: {
			name: process.env.NEXT_PUBLIC_SUPERLUMINAL_NAME || '',
			logo: process.env.NEXT_PUBLIC_SUPERLUMINAL_LOGO || undefined
		}
	}
}

export function isSuperLuminalMode(): boolean {
	return !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
}
