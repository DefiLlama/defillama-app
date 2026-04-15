import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { LiquidationsOverviewPageProps } from './api.types'
import { LiquidationsOverviewChainsTable, LiquidationsProtocolsTable } from './Table'
import { LiquidationsTableTabs } from './TableTabs'

const OVERVIEW_TABS = [
	{ id: 'protocols', label: 'Protocols' },
	{ id: 'chains', label: 'Chains' }
] as const

export function LiquidationsOverview(props: LiquidationsOverviewPageProps) {
	const [activeTab, setActiveTab] = React.useState<(typeof OVERVIEW_TABS)[number]['id']>('protocols')

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink="Overview" />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">Liquidations</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Protocols</span>
						<span className="font-jetbrains text-2xl font-semibold">{props.protocolCount}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Chains</span>
						<span className="font-jetbrains text-2xl font-semibold">{props.chainCount}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Positions</span>
						<span className="font-jetbrains text-2xl font-semibold">{props.positionCount}</span>
					</p>
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					<h2 className="text-lg font-semibold">Snapshot</h2>
					<p className="mt-2 text-(--text-label)">{new Date(props.timestamp * 1000).toUTCString()}</p>
					<p className="mt-4 text-sm text-(--text-label)">
						This dashboard shows the latest protocol and chain liquidation positions from the new liquidations API.
					</p>
				</div>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'protocols' ? (
					<LiquidationsProtocolsTable
						rows={props.protocolRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={OVERVIEW_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				) : (
					<LiquidationsOverviewChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={OVERVIEW_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
