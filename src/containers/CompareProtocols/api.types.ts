export type RawProtocolResponse = {
	name: string
	chainTvls?: Record<
		string,
		{
			tvl?: Array<{ date: number; totalLiquidityUSD: number }>
		}
	>
}
