export type RawCoinsChartResponse = {
	coins: Record<string, { prices: Array<{ timestamp?: number; price?: number }> }>
}
