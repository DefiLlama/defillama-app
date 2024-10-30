import { ChartData } from '~/utils/liquidations'
import * as React from 'react'
import styled from 'styled-components'
import { LiquidatablePositionsTable } from '~/components/Table'

const TableNoticeWrapper = styled.div`
	margin-bottom: -1rem;
`

export const SmolHints = styled.div`
	display: flex;
	gap: 6px;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: -1rem;
	opacity: 0.6;
`

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
			<TableNoticeWrapper>
				<SmolHints>
					<i>
						Displaying the largest {rows.length} positions out of {props.data.totalPositions} in total
					</i>
				</SmolHints>
			</TableNoticeWrapper>

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
