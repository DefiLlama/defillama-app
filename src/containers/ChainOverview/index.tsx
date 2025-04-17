import Layout from '~/layout'
import type { IChainOverviewData } from './types'
import { Stats } from './Stats'
import { SmolStats } from './SmolStats'
import { Suspense, lazy } from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Icon } from '~/components/Icon'

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
			{props.metadata.name === 'All' ? (
				<div className="flex flex-nowrap items-center overflow-x-auto overflow-y-hidden gap-1 relative isolate">
					{linksToOtherLlamaApps.map((app) => (
						<a
							target="_blank"
							rel="noreferrer noopener"
							href={app.href}
							key={`llama-app-${app.href}`}
							className="min-w-fit max-w-[70vw] flex-1 flex items-center gap-[10px] p-[10px] rounded-lg bg-[var(--cards-bg)] border border-[var(--cards-bg)] max-h-[64px] relative overflow-hidden"
						>
							{app.background}
							<>{app.icon}</>
							<span className="flex flex-col gap-[2px] flex-1">
								<span className="col-span-1 row-span-1 overflow-hidden whitespace-nowrap text-ellipsis text-sm font-semibold">
									{app.name}
								</span>
								<span className="col-span-1 row-span-1 overflow-hidden whitespace-nowrap text-ellipsis text-sm font-light">
									{app.description}
								</span>
							</span>
							<Icon name="arrow-up-right-2" className="h-6 w-6 flex-shrink-0" />
						</a>
					))}
				</div>
			) : null}
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

const linksToOtherLlamaApps = [
	{
		name: 'LlamaSwap',
		description: 'No fees dex aggregator',
		href: 'https://swap.defillama.com',
		icon: (
			<img src="/llama-apps/llamaswap.png" loading="lazy" alt="" height={44} width={44} className="object-contain" />
		),
		background: <span className="h-12 w-12 absolute left-0 top-0 bottom-0 blur-[32px] bg-[#5C5CF9] overflow-hidden" />
	},
	{
		name: 'LlamaPay',
		description: 'Seamless crypto payments',
		href: 'https://llamapay.io',
		icon: (
			<span className="mx-[5px] block h-8 w-8 rotate-45 bg-[linear-gradient(183deg,#23BD8F_0.79%,#1BDBAD_99.21%)] rounded-md">
				<img
					src="/llama-apps/llamapay.svg"
					loading="lazy"
					alt=""
					height={44}
					width={44}
					className="-rotate-45  object-contain"
				/>
			</span>
		),
		background: <span className="h-12 w-12 absolute left-0 top-0 bottom-0 blur-[32px] bg-[#37E69A] overflow-hidden" />
	},
	{
		name: 'LlamaFeed',
		description: 'The ultimate crypto feed',
		href: 'https://llamafeed.io',
		icon: (
			<img src="/llama-apps/llamafeed.svg" loading="lazy" alt="" height={44} width={44} className="object-contain" />
		),
		background: <span className="h-12 w-12 absolute left-0 top-0 bottom-0 blur-[32px] bg-[#5C5CF9] overflow-hidden" />
	},
	{
		name: 'DefiLlama API',
		description: 'Access to all our data',
		href: 'https://defillama.com/pro-api/docs',
		icon: (
			<img src="/llama-apps/llamaswap.png" loading="lazy" alt="" height={44} width={44} className="object-contain" />
		),
		background: <span className="h-12 w-12 absolute left-0 top-0 bottom-0 blur-[32px] bg-[#5C5CF9] overflow-hidden" />
	}
]

// #5C5CF9
