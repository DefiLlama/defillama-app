import * as React from 'react'
import { LiquidatableProtocolsTable } from '~/components/Table/Liquidations'
import { ChartData } from '~/containers/Liquidations/utils'
import { useStackBy } from './utils'

export const LiqProtocolsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()

	const data = React.useMemo(() => {
		const result = []
		for (const name in props.data.totalLiquidables[stackBy]) {
			const current = props.data.totalLiquidables[stackBy][name]
			const prev = props.prevData.totalLiquidables[stackBy][name]
			const changes24h = ((current - prev) / prev) * 100
			const liquidableAmount = current
			const dangerousAmount = props.data.dangerousPositionsAmounts[stackBy][name]
			// const positionsCount = props.data.positionsCount[stackBy][name]
			result.push({
				name,
				changes24h,
				liquidableAmount,
				dangerousAmount
				// positionsCount
			})
		}
		return result
	}, [props.data.totalLiquidables, props.prevData.totalLiquidables, props.data.dangerousPositionsAmounts, stackBy])

	return <LiquidatableProtocolsTable data={data} />
}
