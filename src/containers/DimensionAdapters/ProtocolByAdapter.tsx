import * as React from 'react'
import Layout from '~/layout'
import { CopyHelper } from '~/components/Copy'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { AuditInfo } from '~/components/AuditInfo'
import { capitalizeFirstLetter, formattedNum, slug } from '~/utils'
import { formatTimestampAsDate } from '~/api/categories/adaptors/utils'
import { Announcement } from '~/components/Announcement'
import { SEO } from '~/components/SEO'
import type { IProtocolContainerProps } from './types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'
import { DimensionProtocolChartByType, DimensionProtocolOverviewChart } from './ProtocolChart'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { ADAPTER_TYPES, VOLUME_TYPE_ADAPTERS } from './constants'
import { BasicLink } from '~/components/Link'
import { defaultPageStyles } from '../ProtocolOverview/queries'

export function ProtocolByAdapter(props: IProtocolContainerProps) {
	const {
		name,
		logo,
		type,
		linkedProtocols,
		totalDataChart,
		blockExplorers,
		gecko_id,
		url,
		twitter,
		audit_links,
		audits,
		methodologyURL,
		methodology,
		slug: pSlug,
		latestFetchIsOk,
		displayName,
		total24h,
		change_1d,
		description,
		category,
		forkedFrom,
		totalAllTime,
		parentProtocol,
		chains,
		totalAllTimeBribes,
		totalAllTimeTokenTaxes,
		disabled,
		dailyBribesRevenue,
		dailyRevenue,
		dailyTokenTaxes
	} = props.protocolSummary
	const [enabledSettings] = useLocalStorageSettingsManager('fees')

	const enableVersionsChart = linkedProtocols?.length > 0 && !parentProtocol ? true : false
	const enableChainsChart = chains?.length > 1 ? true : false

	const typeSimple = VOLUME_TYPE_ADAPTERS.includes(type) ? 'volume' : type
	const typeString = VOLUME_TYPE_ADAPTERS.includes(type) ? 'Volume' : capitalizeFirstLetter(type)

	const router = useRouter()

	return (
		<Layout title={props.title} style={defaultPageStyles}>
			<SEO
				cardName={displayName}
				tvl={formattedNum(total24h)?.toString()}
				volumeChange={change_1d?.toString()}
				pageType={type}
			/>

			<AdaptorsSearch type={type} />

			{!latestFetchIsOk && (
				<Announcement notCancellable>
					Looks like {displayName} latest {type} data might not be accurate or up-to-date, 🦙🦙🦙 are working on it.
				</Announcement>
			)}

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				{linkedProtocols && linkedProtocols.length > 0 && (
					<nav className="col-span-2 text-xs font-medium xl:col-span-3 flex overflow-x-auto rounded-md bg-[var(--cards-bg)] border-b border-[var(--form-control-border)]">
						{linkedProtocols.map((p) => (
							<BasicLink
								href={`/${type}/${slug(p)}`}
								key={p}
								data-active={router.asPath.split('#')[0].split('?')[0] === `/${type}/${slug(p)}`}
								className="flex-shrink-0 py-2 px-6 whitespace-nowrap first:rounded-tl-md data-[active=true]:bg-[var(--link-hover-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] border-l border-[var(--form-control-border)] first:border-l-0"
							>
								{p}
							</BasicLink>
						))}
					</nav>
				)}

				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto text-base">
					<>
						{name && (
							<h1 className="flex items-center gap-2 text-xl">
								<TokenLogo logo={logo} size={24} />
								<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
							</h1>
						)}
						{total24h || total24h === 0 ? (
							<p className="flex flex-col gap-1">
								<span className="text-[#545757] dark:text-[#cccccc]">
									{disabled === true
										? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
												+totalDataChart[0][totalDataChart[0].length - 1].date
										  )})`
										: `${typeString} (24h)`}
								</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(
										(total24h ?? 0) +
											(enabledSettings.bribes ? dailyBribesRevenue ?? 0 : 0) +
											(enabledSettings.tokentax ? dailyTokenTaxes ?? 0 : 0),
										true
									)}
								</span>
							</p>
						) : null}
						{dailyRevenue != null || dailyBribesRevenue != null ? (
							<p className="flex flex-col gap-1">
								<span className="text-[#545757] dark:text-[#cccccc]">
									{disabled === true
										? `Last day revenue (${formatTimestampAsDate(
												+totalDataChart[0][totalDataChart[0].length - 1].date
										  )})`
										: `${type === 'options' ? 'Notional Volume' : 'Revenue'} (24h)`}
								</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(
										(dailyRevenue ?? 0) +
											(enabledSettings.bribes ? dailyBribesRevenue ?? 0 : 0) +
											(enabledSettings.tokentax ? dailyTokenTaxes ?? 0 : 0),
										true
									)}
								</span>
							</p>
						) : null}
						{totalAllTime ? (
							<p className="flex flex-col gap-1">
								<span className="text-[#545757] dark:text-[#cccccc]">{`All time ${typeSimple}`}</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(
										(totalAllTime ?? 0) +
											(enabledSettings.bribes ? totalAllTimeBribes ?? 0 : 0) +
											(enabledSettings.tokentax ? totalAllTimeTokenTaxes ?? 0 : 0),
										true
									)}
								</span>
							</p>
						) : null}
					</>
				</div>
				<DimensionProtocolOverviewChart totalDataChart={totalDataChart} />
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-1 only:*:col-span-full odd:last:*:col-span-full">
				<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
					<h3 className="font-semibold text-lg">Protocol information</h3>
					{description && <p>{description}</p>}

					{category && (
						<p className="flex items-center gap-2">
							<span>Category:</span>
							<BasicLink href={`/${type}?category=${category}`}>{category}</BasicLink>
						</p>
					)}

					{forkedFrom && forkedFrom.length > 0 && (
						<p className="flex items-center gap-2">
							<span>Forked from:</span>
							<>
								{forkedFrom.map((p, index) => (
									<BasicLink href={`/protocol/${p}`} key={p}>
										{forkedFrom[index + 1] ? p + ', ' : p}
									</BasicLink>
								))}
							</>
						</p>
					)}

					{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} />}

					<div className="flex items-center gap-4 flex-wrap">
						{url && (
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-[var(--btn-bg)] whitespace-nowrap hover:bg-[var(--btn-hover-bg)]"
							>
								<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
							</a>
						)}

						{twitter && (
							<a
								href={`https://twitter.com/${twitter}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-[var(--btn-bg)] whitespace-nowrap hover:bg-[var(--btn-hover-bg)]"
							>
								<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
							</a>
						)}
					</div>
				</div>

				{(blockExplorers?.length > 0 || gecko_id) && (
					<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
						<h3 className="font-semibold text-lg">Token Information</h3>

						{blockExplorers && (
							<>
								{blockExplorers.map((blockExplorer) => (
									<p className="flex items-center gap-2" key={blockExplorer.address}>
										<span>{`${capitalizeFirstLetter(
											blockExplorer.chain ? `${blockExplorer.chain} address:` : 'address:'
										)}`}</span>
										<span>{blockExplorer.address.slice(0, 8) + '...' + blockExplorer.address?.slice(36, 42)}</span>
										<CopyHelper toCopy={blockExplorer.address} disabled={!blockExplorer.address} />

										<a
											href={blockExplorer.blockExplorerLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-[var(--btn-bg)] whitespace-nowrap hover:bg-[var(--btn-hover-bg)]"
										>
											<span>View on {blockExplorer.blockExplorerName}</span>{' '}
											<Icon name="arrow-up-right" height={14} width={14} />
										</a>
									</p>
								))}
							</>
						)}

						{gecko_id && (
							<div className="flex items-center gap-4 flex-wrap">
								<a
									href={`https://www.coingecko.com/en/coins/${gecko_id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-[var(--btn-bg)] whitespace-nowrap hover:bg-[var(--btn-hover-bg)]"
								>
									<span>View on CoinGecko</span> <Icon name="arrow-up-right" height={14} width={14} />
								</a>
							</div>
						)}
					</div>
				)}
				{methodologyURL && (
					<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4">
						<h3 className="font-semibold text-lg">Methodology</h3>
						{methodology?.['Fees'] ? <p>{`Fees: ${methodology['Fees']}`}</p> : null}

						{methodology?.['Revenue'] ? <p>{`Revenue: ${methodology['Revenue']}`}</p> : null}

						<div className="flex items-center gap-4 flex-wrap">
							<a
								href={methodologyURL}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-[var(--btn-bg)] whitespace-nowrap hover:bg-[var(--btn-hover-bg)]"
							>
								<span>Check the code</span>
								<Icon name="arrow-up-right" height={14} width={14} />
							</a>
						</div>
					</div>
				)}
			</div>
			{(enableVersionsChart || enableChainsChart) && (
				<>
					<div className="grid grid-cols-2 gap-1">
						{enableVersionsChart && (
							<DimensionProtocolChartByType
								adapterType={type as `${ADAPTER_TYPES}`}
								protocolName={pSlug}
								chartType="version"
								metadata={{
									bribeRevenue: totalAllTimeBribes ? true : false,
									tokenTax: totalAllTimeTokenTaxes ? true : false
								}}
							/>
						)}
						{enableChainsChart && (
							<DimensionProtocolChartByType
								adapterType={type as `${ADAPTER_TYPES}`}
								protocolName={pSlug}
								chartType="chain"
								metadata={{
									bribeRevenue: totalAllTimeBribes ? true : false,
									tokenTax: totalAllTimeTokenTaxes ? true : false
								}}
							/>
						)}
					</div>
				</>
			)}
		</Layout>
	)
}
