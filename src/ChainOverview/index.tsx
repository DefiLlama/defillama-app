import Layout from '~/layout'
import { ChainProtocolsTable } from './Table'
import type { IChainOverviewData } from './types'

export function ChainOverview(props: IChainOverviewData) {
	console.log(props.protocols)
	return (
		<Layout title={props.metadata.name === 'All' ? 'DefiLlama' : `${props.metadata.name} - DefiLlama`} defaultSEO>
			<ChainProtocolsTable protocols={props.protocols} />
		</Layout>
	)
}
