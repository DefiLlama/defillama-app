export const SUPERLUMINAL_PROJECTS = [
	{ id: 'etherfi', name: 'Ether.fi', dashboardId: '73x90j3b28pfhgx', customOnly: false },
	{ id: 'spark', name: 'Spark', dashboardId: 'roxh2oxb1b7fhjz', customOnly: false },
	{ id: 'maple', name: 'Maple', dashboardId: 'l5accmh9zooc32q', customOnly: false },
	{ id: 'berachain', name: 'Berachain', dashboardId: 't62luatlj9thwx2', customOnly: true }
] as const

export const SUPERLUMINAL_PROTOCOL_IDS: string[] = SUPERLUMINAL_PROJECTS.map((p) => p.id)

export function isSuperLuminalEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
}
