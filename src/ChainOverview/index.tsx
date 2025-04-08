import Layout from '~/layout'
import { IChainOverviewData } from './queries.server'

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout title={`${props.metadata.name} - DefiLlama`}>
			<></>
		</Layout>
	)
}
