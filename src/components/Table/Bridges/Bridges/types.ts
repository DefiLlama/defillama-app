export interface IBridge {
	name: string
	symbol: string
	icon: string
	chains: Array<string>
	lastDailyVolume: number
	dayBeforeLastVolume: number
	weeklyVolume: number
	monthlyVolume: number
	change_1d: number
	change_7d: number
	change_1m: number
	txsPrevDay: number
	address: string
}

export interface IBridgeChain {
	name: string
	prevDayUsdDeposits: number
	prevDayUsdWithdrawals: number
	topTokenDepositedSymbol: string
	topTokenDepositedUsd: number
	topTokenWithdrawnSymbol: string
	topTokenWithdrawnUsd: number
	netFlow: number
}

export type LargeTxsData = {
	date: number
	txHash: string
	from: string
	to: string
	token: string
	amount: string
	isDeposit: boolean
	chain: string
	usdValue: string
}
