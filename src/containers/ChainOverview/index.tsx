import { lazy, Suspense } from 'react'
import { Bookmark } from '~/components/Bookmark'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import { chainIconUrl } from '~/utils'
import { SmolStats } from './SmolStats'
import { Stats } from './Stats'
import type { IChainOverviewData } from './types'

const Table = lazy(() => import('./Table').then((m) => ({ default: m.ChainProtocolsTable })))

const pageName = ['Overview']

export function ChainOverview(props: IChainOverviewData) {
	return (
		<Layout
			title={props.metadata.name === 'All' ? 'DefiLlama - DeFi Dashboard' : `${props.metadata.name} - DefiLlama`}
			description={props.description}
			keywords={props.keywords}
			canonicalUrl={props.metadata.name === 'All' ? '' : `/chain/${props.metadata.name}`}
			metricFilters={props.tvlAndFeesOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
		>
			<RowLinksWithDropdown links={props.allChains} activeLink={props.metadata.name} />
			{props.isDataAvailable ? (
				<>
					<Stats {...props} />
					<Suspense fallback={<div className="min-h-[815px] md:min-h-[469px] xl:min-h-[269px]"></div>}>
						<SmolStats {...props} />
					</Suspense>
				</>
			) : (
				<>
					<div className="flex flex-1 flex-col gap-10 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<h1 className="flex flex-nowrap items-center gap-2">
							<TokenLogo logo={chainIconUrl(props.metadata.name)} size={24} />
							<span className="text-xl font-semibold">{props.metadata.name}</span>
						</h1>
						<p className="my-auto py-10 text-center text-sm text-(--text-form)">
							We don't track any protocols with TVL, Fees, Revenue or Volume on this chain
						</p>
					</div>
				</>
			)}

			{props.metadata.name === 'All' ? (
				<div className="thin-scrollbar relative isolate flex flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden">
					{linksToOtherLlamaApps.map((app) => (
						<a
							target="_blank"
							rel="noreferrer noopener"
							href={app.href}
							key={`llama-app-${app.href}`}
							className="relative flex max-h-[64px] w-full max-w-[70vw] min-w-[270px] flex-1 items-center gap-2.5 overflow-hidden rounded-lg border border-(--cards-bg) bg-(--cards-bg) p-2.5"
						>
							{app.background}
							<>{app.icon}</>
							<span className="flex flex-1 flex-col gap-0.5">
								<span className="col-span-1 row-span-1 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">
									{app.name}
								</span>
								{app.description === '' ? null : (
									<span className="col-span-1 row-span-1 overflow-hidden text-sm font-light text-ellipsis whitespace-nowrap">
										{app.description}
									</span>
								)}
							</span>
							<Icon name="arrow-up-right-2" className="h-6 w-6 shrink-0" />
						</a>
					))}
				</div>
			) : null}
			{props.protocols.length > 0 ? (
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
			) : null}
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
		background: <span className="llama-app-background" />
	},
	{
		name: 'LlamaFeed',
		description: 'The ultimate crypto feed',
		href: 'https://llamafeed.io/',
		icon: (
			<img src="/icons/llamafeed.svg" loading="lazy" alt="" height={44} width={44} className="z-10 object-contain" />
		),
		background: <span className="llama-app-background" />
	},
	{
		name: 'DefiLlama API',
		description: 'Access to all our data',
		href: 'https://defillama.com/pro-api/docs',
		icon: (
			<img src="/icons/llamaswap.png" loading="lazy" alt="" height={44} width={44} className="z-10 object-contain" />
		),
		background: <span className="llama-app-background" />
	},
	{
		name: 'DLNews',
		description: '',
		href: 'https://www.dlnews.com',
		icon: (
			<svg width={44} height={44}>
				<use href={`/icons/dlnews-smol.svg#dlnews-logo`} />
			</svg>
		),
		background: <span className="llama-app-background" />
	},
	{
		name: 'DL Research',
		description: '',
		href: 'https://www.dlnews.com/research',
		icon: (
			<svg width={44} height={44}>
				<use href={`/icons/dlresearch.svg#dlresearch-logo`} />
			</svg>
		),
		background: <span className="llama-app-background" />
	}
]
