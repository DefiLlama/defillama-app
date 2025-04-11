import Layout from '~/layout'
import type { IChainOverviewData } from './types'
import { OverviewStats } from './OverviewStats'
import { SmolStats } from './SmolStats'
import { Suspense, lazy } from 'react'

const ChainProtocolsTable = lazy(() => import('./Table').then((m) => ({ default: m.ChainProtocolsTable })))

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			defaultSEO
		>
			<OverviewStats {...props} />
			<Suspense fallback={<div className="min-h-[815px] md:min-h-[469px] xl:min-h-[269px]"></div>}>
				<SmolStats {...props} />
			</Suspense>
			<Suspense
				fallback={
					<div
						style={{ minHeight: `${props.protocols.length * 50 + 200}px` }}
						className="bg-[var(--cards-bg)] rounded-md"
					/>
				}
			>
				<ChainProtocolsTable protocols={props.protocols} />
			</Suspense>
		</Layout>
	)
}
