import * as React from 'react'
import styled from 'styled-components'
import { BridgesLargeTxsTable } from '~/components/Table'
import { LargeTxsData } from '../Table/Bridges/Bridges/types'

const TableNoticeWrapper = styled.div`
	margin-bottom: -1rem;
`

export const LargeTxsTable = (props:{ data: LargeTxsData[]}) => {
	return (
		<>
			<TableNoticeWrapper>
				<SmolHints>
					<i>
						Displaying {props.data.length} transactions from the the past 7d
					</i>
				</SmolHints>
			</TableNoticeWrapper>

			<BridgesLargeTxsTable data={props.data} />
		</>
	)
}

export const SmolHints = styled.div`
	display: flex;
	gap: 6px;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: -1rem;
	opacity: 0.6;
`
