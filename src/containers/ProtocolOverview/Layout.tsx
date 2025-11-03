import * as React from 'react'
import { useMemo } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { DEFI_SETTINGS_KEYS, FEES_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { slug, tokenIconUrl } from '~/utils'
import { IProtocolPageMetrics } from './types'

const tabs: Record<string, { id: string; name: string; route: string }> = {
	information: { id: 'information', name: 'Information', route: '/protocol' },
	assets: { id: 'assets', name: 'Assets', route: '/protocol/assets' },
	tvl: { id: 'tvl', name: 'TVL', route: '/protocol/tvl' },
	borrowed: { id: 'borrowed', name: 'Borrowed', route: '/protocol/borrowed' },
	stablecoins: { id: 'stablecoins', name: 'Stablecoin Info', route: '/protocol/stablecoins' },
	bridges: { id: 'bridges', name: 'Bridge Info', route: '/protocol/bridges' },
	treasury: { id: 'treasury', name: 'Treasury', route: '/protocol/treasury' },
	unlocks: { id: 'unlocks', name: 'Unlocks', route: '/protocol/unlocks' },
	yields: { id: 'yields', name: 'Yields', route: '/protocol/yields' },
	fees: { id: 'fees', name: 'Fees and Revenue', route: '/protocol/fees' },
	dexs: { id: 'dexs', name: 'DEX Volume', route: '/protocol/dexs' },
	perps: { id: 'perps', name: 'Perp Volume', route: '/protocol/perps' },
	dexAggregators: { id: 'dexAggregators', name: 'DEX Aggregator Volume', route: '/protocol/dex-aggregators' },
	perpsAggregators: { id: 'perpsAggregators', name: 'Perp Aggregator Volume', route: '/protocol/perps-aggregators' },
	bridgeAggregators: {
		id: 'bridgeAggregators',
		name: 'Bridge Aggregator Volume',
		route: '/protocol/bridge-aggregators'
	},
	options: { id: 'options', name: 'Options Volume', route: '/protocol/options' },
	governance: { id: 'governance', name: 'Governance', route: '/protocol/governance' },
	forks: { id: 'forks', name: 'Forks', route: '/protocol/forks' }
} as const

export function ProtocolOverviewLayout({
	children,
	isCEX,
	name,
	category,
	otherProtocols,
	toggleOptions,
	metrics,
	tab,
	warningBanners,
	seoDescription,
	seoKeywords
}: {
	children: React.ReactNode
	isCEX?: boolean
	name: string
	category: string
	otherProtocols?: Array<string>
	toggleOptions?: Array<{
		name: string
		key: string
	}>
	metrics: IProtocolPageMetrics
	tab?: keyof typeof tabs
	warningBanners?: Array<{
		message: string
		until?: number | string // unix timestamp or "forever" or date string  in 'YYYY-MM-DD' format, 'forever' if the field is not set
		level: 'low' | 'alert' | 'rug'
	}>
	seoDescription?: string
	seoKeywords?: string
}) {
	const metricFiltersLabel = useMemo(() => {
		const hasTvl = toggleOptions?.some((option) => DEFI_SETTINGS_KEYS.includes(option.key))
		const hasFees = toggleOptions?.some((option) => FEES_SETTINGS_KEYS.includes(option.key))

		if (hasTvl && hasFees) {
			return 'Include TVL & Fees'
		}

		if (hasTvl) {
			return 'Include in TVL'
		}

		if (hasFees) {
			return 'Include in Fees'
		}

		return null
	}, [toggleOptions])

	const protocolTabs = useMemo(() => {
		const final = []
		if (metrics.stablecoins) {
			final.push(tabs.stablecoins)
		}
		if (metrics.bridge) {
			final.push(tabs.bridges)
		}
		if (metrics.treasury) {
			final.push(tabs.treasury)
		}
		if (metrics.unlocks) {
			final.push(tabs.unlocks)
		}
		if (metrics.yields) {
			final.push(tabs.yields)
		}
		if (metrics.fees) {
			final.push(tabs.fees)
		}
		if (metrics.dexs) {
			final.push(tabs.dexs)
		}
		if (metrics.perps) {
			final.push(tabs.perps)
		}
		if (metrics.dexAggregators) {
			final.push(tabs.dexAggregators)
		}
		if (metrics.perpsAggregators) {
			final.push(tabs.perpsAggregators)
		}
		if (metrics.bridgeAggregators) {
			final.push(tabs.bridgeAggregators)
		}
		if (metrics.optionsPremiumVolume || metrics.optionsNotionalVolume) {
			final.push(tabs.options)
		}
		if (metrics.governance) {
			final.push(tabs.governance)
		}
		if (metrics.forks) {
			final.push(tabs.forks)
		}
		return final
	}, [metrics])

	return (
		<Layout
			title={`${name} - DefiLlama`}
			description={
				seoDescription ||
				`Track ${name} metrics on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`
			}
			keywords={seoKeywords || `${name.toLowerCase()} defillama`}
			canonicalUrl={`/protocol/${slug(name)}`}
			metricFilters={toggleOptions}
			metricFiltersLabel={metricFiltersLabel}
		>
			{(category === 'Uncollateralized Lending' || category === 'RWA Lending') && (
				<p className="relative rounded-md border border-(--bg-color) bg-(--btn-bg) p-2 text-center text-xs text-black dark:text-white">
					Borrowed coins are not included into TVL by default, to include them toggle Borrows. For more info on this
					click{' '}
					<a
						href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/6163"
						target="_blank"
						rel="noreferrer noopener"
						className="underline"
					>
						here
					</a>
					.
				</p>
			)}

			{warningBanners?.map((banner) => (
				<p
					className={`relative rounded-md border p-2 text-center text-xs text-black dark:text-white ${
						banner.level === 'rug'
							? 'border-(--error) bg-(--error)/20'
							: banner.level === 'alert'
								? 'border-(--warning) bg-(--warning)/20'
								: 'border-(--bg-color) bg-(--btn-bg)'
					}`}
					key={`${banner.message}-${banner.level}-${name}`}
				>
					{banner.message}
				</p>
			))}

			<div className="isolate flex flex-col gap-2">
				<div className="flex w-full overflow-x-auto text-xs font-medium">
					{otherProtocols?.length > 1 && (
						<Ariakit.MenuProvider>
							<Ariakit.MenuButton className="mr-4 flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
								<TokenLogo logo={tokenIconUrl(name)} size={16} />
								<span className="whitespace-nowrap">{name === otherProtocols[0] ? `${name} (Combined)` : name}</span>
								<Ariakit.MenuButtonArrow />
							</Ariakit.MenuButton>
							<Ariakit.Menu
								unmountOnHide
								hideOnInteractOutside
								gutter={8}
								wrapperProps={{
									className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
								}}
								className="max-sm:drawer thin-scrollbar z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
								portal
							>
								<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
									<Icon name="x" className="h-5 w-5" />
								</Ariakit.PopoverDismiss>

								{otherProtocols.map((value, i) => {
									return (
										<Ariakit.MenuItem
											key={'navigate to ' + `/protocol/${slug(value)}`}
											render={<BasicLink href={`/protocol/${slug(value)}`} />}
											data-active={name === value}
											className={`group relative flex items-center gap-2 py-2 ${
												i === 0 ? 'px-3' : 'ml-5.5 pr-3'
											} shrink-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap first-of-type:rounded-t-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) data-[active=true]:bg-(--primary-hover)`}
										>
											{i !== 0 && (
												<>
													<span className="absolute top-0 bottom-0 left-0 block h-full w-0.5 bg-(--form-control-border) group-last:h-[50%]" />
													<span className="-mr-2 h-0.5 w-3 bg-(--form-control-border)" />
												</>
											)}
											<TokenLogo logo={tokenIconUrl(value)} size={24} />
											{i === 0 ? (
												<span className="flex flex-col">
													<span>{`${value} (Combined)`}</span>
													<span className="text-[10px] text-(--text-form)">Aggregated view</span>
												</span>
											) : (
												<span>{value}</span>
											)}
										</Ariakit.MenuItem>
									)
								})}
							</Ariakit.Menu>
						</Ariakit.MenuProvider>
					)}

					{isCEX ? (
						<BasicLink
							href={`/cex/${slug(name)}`}
							data-active={!tab || tab === 'information'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Information
						</BasicLink>
					) : (
						<BasicLink
							href={`/protocol/${slug(name)}`}
							data-active={!tab || tab === 'information'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Information
						</BasicLink>
					)}
					{metrics.tvlTab ? (
						isCEX ? (
							<BasicLink
								href={`/cex/assets/${slug(name)}`}
								data-active={tab === 'assets'}
								className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							>
								Assets
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/tvl/${slug(name)}`}
								data-active={tab === 'tvl'}
								className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							>
								TVL
							</BasicLink>
						)
					) : null}
					{metrics.tvlTab && category === 'Lending' ? (
						<BasicLink
							href={`/protocol/borrowed/${slug(name)}`}
							data-active={tab === 'borrowed'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Borrowed
						</BasicLink>
					) : null}
					{metrics.stablecoins && isCEX ? (
						<BasicLink
							href={`/cex/stablecoins/${slug(name)}`}
							data-active={tab === 'stablecoins'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Stablecoin Info
						</BasicLink>
					) : null}
					{protocolTabs
						.filter((pt) => (isCEX ? pt.id !== 'stablecoins' : true))
						.map((pt) => (
							<BasicLink
								key={`${pt.id}-${name}`}
								href={`${pt.route}/${slug(name)}`}
								data-active={pt.id === tab}
								className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							>
								{pt.name}
							</BasicLink>
						))}
				</div>
				{children}
			</div>
		</Layout>
	)
}
