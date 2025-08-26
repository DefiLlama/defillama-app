import * as React from 'react'
import { useMemo } from 'react'
import * as Ariakit from '@ariakit/react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { DEFI_SETTINGS_KEYS, FEES_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { slug, tokenIconUrl } from '~/utils'
import { IProtocolPageMetrics } from './types'

export function ProtocolOverviewLayout({
	children,
	isCEX,
	name,
	category,
	otherProtocols,
	toggleOptions,
	metrics,
	tab,
	warningBanners
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
	tab?:
		| 'information'
		| 'assets'
		| 'tvl'
		| 'stablecoins'
		| 'bridges'
		| 'treasury'
		| 'unlocks'
		| 'yields'
		| 'fees'
		| 'dexs'
		| 'perps'
		| 'dex-aggregators'
		| 'perps-aggregators'
		| 'bridge-aggregators'
		| 'options'
		| 'governance'
		| 'forks'
	warningBanners?: Array<{
		message: string
		until?: number | string // unix timestamp or "forever" or date string  in 'YYYY-MM-DD' format, 'forever' if the field is not set
		level: 'low' | 'alert' | 'rug'
	}>
}) {
	const includeInMetricsOptionslabel = useMemo(() => {
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

	return (
		<Layout
			title={`${name} - DefiLlama`}
			includeInMetricsOptions={toggleOptions}
			includeInMetricsOptionslabel={includeInMetricsOptionslabel}
			customSEO
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
								className="max-sm:drawer z-10 flex h-[calc(100vh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
								portal
							>
								{otherProtocols.map((value, i) => {
									return (
										<Ariakit.MenuItem
											key={'navigate to ' + `/protocol/${slug(value)}`}
											render={<BasicLink href={`/protocol/${slug(value)}`} />}
											data-active={name === value}
											className={`group relative flex items-center gap-2 py-2 ${
												i === 0 ? 'px-3' : 'ml-[22px] pr-3'
											} shrink-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap first-of-type:rounded-t-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) data-[active=true]:bg-(--primary-hover)`}
										>
											{i !== 0 && (
												<>
													<span className="absolute top-0 bottom-0 left-0 block h-full w-[2px] bg-(--form-control-border) group-last:h-[50%]" />
													<span className="-mr-2 h-[2px] w-3 bg-(--form-control-border)" />
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
					{metrics.stablecoins && (
						<BasicLink
							href={`/protocol/stablecoins/${slug(name)}`}
							data-active={tab === 'stablecoins'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Stablecoin Info
						</BasicLink>
					)}
					{metrics.bridge && (
						<BasicLink
							href={`/protocol/bridges/${slug(name)}`}
							data-active={tab === 'bridges'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Bridge Info
						</BasicLink>
					)}
					{metrics.treasury && (
						<BasicLink
							href={`/protocol/treasury/${slug(name)}`}
							data-active={tab === 'treasury'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Treasury
						</BasicLink>
					)}
					{metrics.unlocks && (
						<BasicLink
							href={`/protocol/unlocks/${slug(name)}`}
							data-active={tab === 'unlocks'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Unlocks
						</BasicLink>
					)}
					{metrics.yields && (
						<BasicLink
							href={`/protocol/yields/${slug(name)}`}
							data-active={tab === 'yields'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Yields
						</BasicLink>
					)}
					{metrics.fees && (
						<BasicLink
							href={`/protocol/fees/${slug(name)}`}
							data-active={tab === 'fees'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Fees and Revenue
						</BasicLink>
					)}
					{metrics.dexs && (
						<BasicLink
							href={`/protocol/dexs/${slug(name)}`}
							data-active={tab === 'dexs'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							DEX Volume
						</BasicLink>
					)}
					{metrics.perps && (
						<BasicLink
							href={`/protocol/perps/${slug(name)}`}
							data-active={tab === 'perps'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Perp Volume
						</BasicLink>
					)}
					{metrics.dexAggregators && (
						<BasicLink
							href={`/protocol/dex-aggregators/${slug(name)}`}
							data-active={tab === 'dex-aggregators'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Aggregator Volume
						</BasicLink>
					)}
					{metrics.perpsAggregators && (
						<BasicLink
							href={`/protocol/perps-aggregators/${slug(name)}`}
							data-active={tab === 'perps-aggregators'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Perp Aggregator Volume
						</BasicLink>
					)}
					{metrics.bridgeAggregators && (
						<BasicLink
							href={`/protocol/bridge-aggregators/${slug(name)}`}
							data-active={tab === 'bridge-aggregators'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Bridge Aggregator Volume
						</BasicLink>
					)}
					{(metrics.optionsPremiumVolume || metrics.optionsNotionalVolume) && (
						<BasicLink
							href={`/protocol/options/${slug(name)}`}
							data-active={tab === 'options'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Options Volume
						</BasicLink>
					)}
					{metrics.governance && (
						<BasicLink
							href={`/protocol/governance/${slug(name)}`}
							data-active={tab === 'governance'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Governance
						</BasicLink>
					)}
					{metrics.forks && (
						<BasicLink
							href={`/protocol/forks/${slug(name)}`}
							data-active={tab === 'forks'}
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
						>
							Forks
						</BasicLink>
					)}
				</div>
				{children}
			</div>
		</Layout>
	)
}
