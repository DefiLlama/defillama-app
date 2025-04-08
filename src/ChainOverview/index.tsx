import Layout from '~/layout'
import { ChainProtocolsTable } from './Table'
import type { IChainOverviewData } from './types'

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout title={`${props.metadata.name} - DefiLlama`}>
			<ChainProtocolsTable protocols={props.protocols} />
		</Layout>
	)
}
