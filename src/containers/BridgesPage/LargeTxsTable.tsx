import * as React from 'react'
import styled from 'styled-components'
import { BridgesLargeTxsTable } from '~/components/Table'
import { LargeTxsData } from '~/components/Table/Bridges/Bridges/types'
import { LargeTxDownloadButton } from './DownloadButton'

const TableNoticeWrapper = styled.div`
	margin-bottom: -1rem;
`

export const LargeTxsTable = (props: { data: LargeTxsData[]; chain: string }) => {
	return (
		<>
			<TableNoticeWrapper>
				<SmolHints>
					<i>
						Displaying {props.data.length} transactions from the the past {props.chain === 'All' ? '1d' : '7d'}
					</i>
					<LargeTxDownloadButton data={props.data} />
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
`
