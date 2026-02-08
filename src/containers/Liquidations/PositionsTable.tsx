import * as React from 'react'
import { LiquidatablePositionsTable } from '~/containers/Liquidations/Table'
import { ChartData } from '~/containers/Liquidations/utils'

export const LiqPositionsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const rows = React.useMemo(() => {
		return props.data.topPositions.map((p) => ({
			chainName: p.chain,
			protocolName: p.protocol,
			value: p.collateralValue,
			amount: p.collateralAmount,
			liqPrice: p.liqPrice,
			owner: {
				displayName: p.displayName,
				url: p.url
			}
		})) as RowValues[]
	}, [props.data])

	return (
		<>
			<LiquidatablePositionsTable data={rows} />
		</>
	)
}

type RowValues = {
	chainName: string
	protocolName: string
	value: number
	amount: number
	liqPrice: number
	owner: {
		displayName: string
		url: string
	}
}
