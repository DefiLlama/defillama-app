export const SUPERLUMINAL_PROJECTS = [
	{ id: 'etherfi', name: 'Ether.fi', dashboardId: '73x90j3b28pfhgx' },
	{ id: 'spark', name: 'Spark', dashboardId: 'lvp2u48lc11kdy1' },
	{ id: 'maple', name: 'Maple', dashboardId: 'l5accmh9zooc32q' }
] as const

export const SUPERLUMINAL_PROTOCOL_IDS: string[] = SUPERLUMINAL_PROJECTS.map((p) => p.id)

export function isSuperLuminalEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
}
