import { ChartData } from '~/utils/liquidations'
import * as React from 'react'
import { LiquidatablePositionsTable } from '~/components/Table/Liquidations'

export const PositionsTable = (props: { data: ChartData; prevData: ChartData }) => {
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
			<p className="text-right italic opacity-60 -mb-5 md:-mt-6">
				Displaying the largest {rows.length} positions out of {props.data.totalPositions} in total
			</p>
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
