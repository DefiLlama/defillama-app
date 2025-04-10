import Layout from '~/layout'
import { ChainProtocolsTable } from './Table'
import type { IChainOverviewData } from './types'
import { OverviewStats } from './OverviewStats'
import { OverallCharts } from './OverallCharts'
import { Suspense } from 'react'

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			defaultSEO
		>
			<OverviewStats {...props} />
			{props.metadata.name === 'All' ? (
				<Suspense fallback={<div className="min-h-[815px] md:min-h-[469px] xl:min-h-[269px]"></div>}>
					<OverallCharts {...props} />{' '}
				</Suspense>
			) : null}
			<ChainProtocolsTable protocols={props.protocols} />
		</Layout>
	)
}
