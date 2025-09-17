export const processAdjustedTvl = (data: any): [number, number][] => {
	const { tvl = [], liquidstaking = [], doublecounted = [], dcAndLsOverlap = [] } = data || {}

	const extraTvlCharts = {
		liquidstaking: {} as Record<number, number>,
		doublecounted: {} as Record<number, number>,
		dcAndLsOverlap: {} as Record<number, number>
	}

	for (const [date, totalLiquidityUSD] of liquidstaking) {
		extraTvlCharts.liquidstaking[Number(date)] = Math.trunc(totalLiquidityUSD)
	}
	for (const [date, totalLiquidityUSD] of doublecounted) {
		extraTvlCharts.doublecounted[Number(date)] = Math.trunc(totalLiquidityUSD)
	}
	for (const [date, totalLiquidityUSD] of dcAndLsOverlap) {
		extraTvlCharts.dcAndLsOverlap[Number(date)] = Math.trunc(totalLiquidityUSD)
	}

	const adjustedTvl: [number, number][] = tvl.map(([date, totalLiquidityUSD]) => {
		const timestamp = Number(date)
		let sum = Math.trunc(totalLiquidityUSD)
		if (extraTvlCharts['liquidstaking']?.[timestamp]) {
			sum -= Math.trunc(extraTvlCharts['liquidstaking'][timestamp])
		}
		if (extraTvlCharts['doublecounted']?.[timestamp]) {
			sum -= Math.trunc(extraTvlCharts['doublecounted'][timestamp])
		}
		if (extraTvlCharts['dcAndLsOverlap']?.[timestamp]) {
			sum += Math.trunc(extraTvlCharts['dcAndLsOverlap'][timestamp])
		}
		return [timestamp, sum] as [number, number]
	})

	return adjustedTvl
}
