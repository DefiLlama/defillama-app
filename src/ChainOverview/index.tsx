import Layout from '~/layout'
import type { IChainOverviewData } from './types'
import { Stats } from './Stats'
import { SmolStats } from './SmolStats'
import { Suspense, lazy } from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'

const Table = lazy(() => import('./Table').then((m) => ({ default: m.ChainProtocolsTable })))

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			defaultSEO
		>
			<RowLinksWithDropdown links={props.allChains} activeLink={props.metadata.name} />
			<Stats {...props} />
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
				<Table protocols={props.protocols} />
			</Suspense>
		</Layout>
	)
}
