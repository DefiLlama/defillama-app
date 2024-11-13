import * as React from 'react'
import { BridgesLargeTxsTable } from '~/components/Table/Bridges'
import { LargeTxsData } from '~/components/Table/Bridges/Bridges/types'
import { LargeTxDownloadButton } from './DownloadButton'

export const LargeTxsTable = (props: { data: LargeTxsData[]; chain: string }) => {
	return (
		<>
			<div className="flex items-center gap-2 justify-end flex-wrap -mb-5">
				<p className="text-right italic opacity-60">
					Displaying {props.data.length} transactions from the the past {props.chain === 'All' ? '1d' : '7d'}
				</p>
				<LargeTxDownloadButton data={props.data} />
			</div>

			<BridgesLargeTxsTable data={props.data} />
		</>
	)
}
