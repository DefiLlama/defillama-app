export function isSuperLuminalEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
}
