import * as React from 'react'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { MarketPair } from './api.types'
import { buildExchangePairColumns } from './marketPairColumns'
import type { Segment } from './segments'

export function ExchangePairsTable({ pairs, segment }: { pairs: MarketPair[]; segment: Segment }) {
	const columns = React.useMemo(() => buildExchangePairColumns(segment), [segment])

	return (
		<TableWithSearch
			key={segment}
			data={pairs}
			columns={columns}
			columnToSearch="symbol"
			placeholder="Search pairs..."
			header="Markets"
			csvFileName={`markets-exchange-pairs-${segment}`}
			sortingState={[{ id: 'volume_24h', desc: true }]}
		/>
	)
}
