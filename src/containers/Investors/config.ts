export const INVESTORS_PROJECTS = [
	{ id: 'etherfi', name: 'Ether.fi', dashboardId: '73x90j3b28pfhgx', customOnly: false },
	{ id: 'spark', name: 'Spark', dashboardId: '9vn8xp43tdzo6gt', customOnly: false },
	{ id: 'maple', name: 'Maple', dashboardId: 'l5accmh9zooc32q', customOnly: false },
	{ id: 'berachain', name: 'Berachain', dashboardId: 't62luatlj9thwx2', customOnly: true },
	{ id: 'aave', name: 'Aave', dashboardId: 'g3rswlkr9khxa03', customOnly: false },
	{ id: 'sonic', name: 'Sonic', dashboardId: 's0n1cd4shb0ard1', customOnly: true },
	{ id: 'near', name: 'NEAR', dashboardId: 'n34rr3v3nu3d4sh', customOnly: true },
	{ id: 'flare', name: 'Flare', dashboardId: 'fl4r3d4shb0ard1', customOnly: true }
] as const

export const INVESTORS_PROTOCOL_IDS: string[] = INVESTORS_PROJECTS.map((p) => p.id)

export function isInvestorsEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
}
