export interface IYieldTableRow {
	id: string
	pool: string
	projectslug: string
	project: string
	airdrop?: boolean
	chains: Array<string>
	tvl: number
	apy: number
	apyBase: number
	apyReward: number
	rewardTokensSymbols: Array<string>
	rewards: Array<string>
	change1d: number
	change7d: number
	outlook: string
	confidence: number | null
	url: string
	category: string
	strikeTvl?: boolean
	configID: string
}

export interface IYieldsTableProps {
	data: Array<IYieldTableRow>
}
