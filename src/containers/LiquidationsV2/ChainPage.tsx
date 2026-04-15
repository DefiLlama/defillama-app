import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { LiquidationsChainPageProps } from './api.types'
import { LiquidationsPositionsTable, LiquidationsProtocolChainsTable } from './Table'
import { LiquidationsTableTabs } from './TableTabs'

const CHAIN_TABS = [
	{ id: 'chains', label: 'Chains' },
	{ id: 'positions', label: 'Positions' }
] as const

export function LiquidationsChainPage(props: LiquidationsChainPageProps) {
	const [activeTab, setActiveTab] = React.useState<(typeof CHAIN_TABS)[number]['id']>('positions')

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink={props.protocol} />
			<RowLinksWithDropdown links={props.chainLinks} activeLink={props.chain} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-4">
				<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					<span className="text-(--text-label)">Protocol</span>
					<span className="text-xl font-semibold">{props.protocol}</span>
				</div>
				<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					<span className="text-(--text-label)">Chain</span>
					<span className="text-xl font-semibold">{props.chain}</span>
				</div>
				<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					<span className="text-(--text-label)">Positions</span>
					<span className="font-jetbrains text-2xl font-semibold">{props.positionCount}</span>
				</div>
				<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					<span className="text-(--text-label)">Collateral IDs</span>
					<span className="font-jetbrains text-2xl font-semibold">{props.collateralCount}</span>
				</div>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
				<h2 className="text-lg font-semibold">Snapshot</h2>
				<p className="mt-2 text-(--text-label)">{new Date(props.timestamp * 1000).toUTCString()}</p>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'chains' ? (
					<LiquidationsProtocolChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={CHAIN_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				) : (
					<LiquidationsPositionsTable
						rows={props.positions}
						header="Positions"
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={CHAIN_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
