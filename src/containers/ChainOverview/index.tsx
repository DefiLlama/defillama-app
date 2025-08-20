import Layout from '~/layout'
import type { IChainOverviewData } from './types'
import { Stats } from './Stats'
import { SmolStats } from './SmolStats'
import { Suspense, lazy } from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Icon } from '~/components/Icon'
import { Metrics } from '~/components/Metrics'

const Table = lazy(() => import('./Table').then((m) => ({ default: m.ChainProtocolsTable })))

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			defaultSEO
			includeInMetricsOptions={props.tvlAndFeesOptions}
			includeInMetricsOptionslabel="Include in TVL"
		>
			<Metrics currentMetric="TVL" />
			<RowLinksWithDropdown links={props.allChains} activeLink={props.metadata.name} />
			<Stats {...props} />
			<Suspense fallback={<div className="min-h-[815px] md:min-h-[469px] xl:min-h-[269px]"></div>}>
				<SmolStats {...props} />
			</Suspense>
			{props.metadata.name === 'All' ? (
				<div className="relative isolate flex flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden">
					{linksToOtherLlamaApps.map((app) => (
						<a
							target="_blank"
							rel="noreferrer noopener"
							href={app.href}
							key={`llama-app-${app.href}`}
							className="relative flex max-h-[64px] max-w-[70vw] min-w-fit flex-1 items-center gap-[10px] overflow-hidden rounded-lg border border-(--cards-bg) bg-(--cards-bg) p-[10px]"
						>
							{app.background}
							<>{app.icon}</>
							<span className="flex flex-1 flex-col gap-[2px]">
								<span className="col-span-1 row-span-1 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">
									{app.name}
								</span>
								<span className="col-span-1 row-span-1 overflow-hidden text-sm font-light text-ellipsis whitespace-nowrap">
									{app.description}
								</span>
							</span>
							<Icon name="arrow-up-right-2" className="h-6 w-6 shrink-0" />
						</a>
					))}
				</div>
			) : null}
			<Suspense
				fallback={
					<div
						style={{ minHeight: `${props.protocols.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<Table protocols={props.protocols} />
			</Suspense>
		</Layout>
	)
}

const linksToOtherLlamaApps = [
	{
		name: 'LlamaSwap',
		description: 'No fees dex aggregator',
		href: 'https://swap.defillama.com',
		icon: (
			<img src="/icons/llamaswap.png" loading="lazy" alt="" height={44} width={44} className="z-10 object-contain" />
		),
		background: (
			<span
				style={{ transform: 'translate3d(0px, 0px, 0px)' }}
				className="absolute top-0 bottom-0 left-0 h-12 w-12 overflow-hidden bg-[#5C5CF9] blur-[32px]"
			/>
		)
	},
	{
		name: 'LlamaPay',
		description: 'Seamless crypto payments',
		href: 'https://llamapay.io',
		icon: (
			<span className="z-10 mx-[5px] block h-8 w-8 rotate-45 rounded-md bg-[linear-gradient(183deg,#23BD8F_0.79%,#1BDBAD_99.21%)]">
				<img
					src="/icons/llamapay.svg"
					loading="lazy"
					alt=""
					height={44}
					width={44}
					className="-rotate-45 object-contain"
				/>
			</span>
		),
		background: (
			<span
				style={{ transform: 'translate3d(0px, 0px, 0px)' }}
				className="absolute top-0 bottom-0 left-0 h-12 w-12 overflow-hidden bg-[#37E69A] blur-[32px]"
			/>
		)
	},
	{
		name: 'LlamaFeed',
		description: 'The ultimate crypto feed',
		href: 'https://llamafeed.io/',
		icon: (
			<img src="/icons/llamafeed.svg" loading="lazy" alt="" height={44} width={44} className="z-10 object-contain" />
		),
		background: (
			<span
				style={{ transform: 'translate3d(0px, 0px, 0px)' }}
				className="absolute top-0 bottom-0 left-0 h-12 w-12 overflow-hidden bg-[#5C5CF9] blur-[32px]"
			/>
		)
	},
	{
		name: 'DefiLlama API',
		description: 'Access to all our data',
		href: 'https://defillama.com/pro-api/docs',
		icon: (
			<img src="/icons/llamaswap.png" loading="lazy" alt="" height={44} width={44} className="z-10 object-contain" />
		),
		background: (
			<span
				style={{ transform: 'translate3d(0px, 0px, 0px)' }}
				className="absolute top-0 bottom-0 left-0 h-12 w-12 overflow-hidden bg-[#5C5CF9] blur-[32px]"
			/>
		)
	}
]
