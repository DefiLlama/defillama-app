export const UNBOUNDED_DEBT_CEILING_PROJECTS = ['liquity-v1', 'liquity-v2'] as const

export const lockupsRewards = ['Geist Finance', 'Radiant', 'Valas Finance', 'UwU Lend']

export const lockupsCollateral = [
	'Ribbon',
	'TrueFi',
	'Maple',
	'Clearpool',
	'Centrifuge',
	'UniCrypt',
	'Osmosis',
	'HedgeFarm',
	'BarnBridge',
	'WOOFi',
	'Kokoa Finance',
	'Lyra',
	'Arbor Finance',
	'Sommelier'
]

export const badDebt = ['moonwell-apollo', 'inverse-finance', 'venus', 'iron-bank']

export const exploitedProjects = ['resolv-protocol']
export const exploitedTokens = ['USR']

export function isExploitedPool(project: string, symbol: string): boolean {
	return exploitedProjects.includes(project) || exploitedTokens.some((t) => symbol?.toUpperCase().includes(t))
}

export const disclaimer =
	"DefiLlama doesn't audit nor endorse any of the protocols listed, we just focus on providing accurate data. Ape at your own risk."

export const earlyExit =
	'Rewards are calculated assuming an early exit penalty applies. So this is the minimum APY you can expect when claiming your rewards early.'
