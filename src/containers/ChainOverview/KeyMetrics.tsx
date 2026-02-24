import dayjs from 'dayjs'
import { Fragment, memo, useRef } from 'react'
import { BasicLink } from '~/components/Link'
import { Tooltip } from '~/components/Tooltip'
import { formatRaisedAmount } from '~/containers/ProtocolOverview/utils'
import { definitions } from '~/public/definitions'
import { formattedNum, slug } from '~/utils'
import { KeyMetricsPngExportButton } from './KeyMetricsPngExport'
import { ChainMetricRow, ChainMetricSection, ChainSubMetricRow } from './MetricComponents'
import type { IChainOverviewData } from './types'

const formatKeyMetricsValue = (value: number | string | null) => {
	if (Number.isNaN(Number(value))) return null
	return formattedNum(value, true)
}

interface KeyMetricsProps {
	metadata: IChainOverviewData['metadata']
	stablecoins: IChainOverviewData['stablecoins']
	chainStablecoins: IChainOverviewData['chainStablecoins']
	chainFees: IChainOverviewData['chainFees']
	chainRevenue: IChainOverviewData['chainRevenue']
	chainIncentives: IChainOverviewData['chainIncentives']
	appRevenue: IChainOverviewData['appRevenue']
	appFees: IChainOverviewData['appFees']
	dexs: IChainOverviewData['dexs']
	perps: IChainOverviewData['perps']
	inflows: IChainOverviewData['inflows']
	users: IChainOverviewData['users']
	treasury: IChainOverviewData['treasury']
	chainRaises: IChainOverviewData['chainRaises']
	chainAssets: IChainOverviewData['chainAssets']
	nfts: IChainOverviewData['nfts']
	chainTokenInfo: IChainOverviewData['chainTokenInfo']
	protocols: IChainOverviewData['protocols']
	totalValueUSD: number | null
	tvlSettingsGovtokens: boolean
}

export const KeyMetrics = memo(function KeyMetrics(props: KeyMetricsProps) {
	const keyMetricsRef = useRef<HTMLDivElement>(null)
	const keyMetricsTitle = props.metadata.name === 'All' ? 'All Chains' : props.metadata.name
	const hasKeyMetricsPrimary = props.protocols.length > 0 && props.totalValueUSD != null

	return (
		<div className="flex flex-1 flex-col gap-2">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold xl:text-sm">Key Metrics</h2>
				{props.metadata.name !== 'All' ? (
					<KeyMetricsPngExportButton
						containerRef={keyMetricsRef}
						chainName={keyMetricsTitle}
						chainIconSlug={props.metadata.name}
						primaryValue={props.totalValueUSD}
						primaryLabel="Total Value Locked in DeFi"
						formatPrice={formatKeyMetricsValue}
						hasTvlData={hasKeyMetricsPrimary}
					/>
				) : null}
			</div>
			<div className="flex flex-col" ref={keyMetricsRef}>
				<StablecoinsMcap stablecoins={props.stablecoins} isAll={props.metadata.name === 'All'} />
				<NativeStablecoins chainStablecoins={props.chainStablecoins} />
				{props.chainFees?.total24h != null ? (
					<ChainMetricRow
						label="Chain Fees (24h)"
						tooltip={definitions.fees.chain['24h']}
						value={formattedNum(props.chainFees.total24h, true)}
					/>
				) : null}
				{props.chainRevenue?.total24h != null ? (
					<ChainMetricRow
						label="Chain Revenue (24h)"
						tooltip={definitions.revenue.chain['24h']}
						value={formattedNum(props.chainRevenue.total24h, true)}
					/>
				) : null}
				{props.chainFees?.totalREV24h != null ? (
					<ChainMetricRow
						label="Chain REV (24h)"
						tooltip={definitions.rev.chain['24h']}
						value={formattedNum(props.chainFees.totalREV24h, true)}
					/>
				) : null}
				{props.chainIncentives?.emissions24h != null ? (
					<ChainMetricRow
						label="Token Incentives (24h)"
						tooltip={definitions.incentives.protocol['24h']}
						value={formattedNum(props.chainIncentives.emissions24h, true)}
					/>
				) : null}
				{props.appRevenue?.total24h != null && props.appRevenue.total24h > 1e3 ? (
					<ChainMetricRow
						label="App Revenue (24h)"
						tooltip={definitions.appRevenue.chain['24h']}
						value={formattedNum(props.appRevenue.total24h, true)}
					/>
				) : null}
				{props.appFees?.total24h != null && props.appFees.total24h > 1e3 ? (
					<ChainMetricRow
						label="App Fees (24h)"
						tooltip={definitions.appFees.chain['24h']}
						value={formattedNum(props.appFees.total24h, true)}
					/>
				) : null}
				<DexsVolume dexs={props.dexs} />
				<PerpsVolume perps={props.perps} />
				{props.inflows?.netInflows != null ? (
					<ChainMetricRow
						label="Inflows (24h)"
						tooltip="Net money bridged to the chain within the last 24h. Updates daily at 00:00 UTC"
						value={formattedNum(props.inflows.netInflows, true)}
					/>
				) : null}
				<ActiveAddresses users={props.users} />
				<TreasurySection treasury={props.treasury} />
				<RaisesSection chainRaises={props.chainRaises} />
				<BridgedTvlSection chainAssets={props.chainAssets} tvlSettingsGovtokens={props.tvlSettingsGovtokens} />
				{props.nfts ? (
					<ChainMetricRow
						label="NFT Volume (24h)"
						tooltip="Volume of Non Fungible Tokens traded in the last 24 hours"
						value={formattedNum(props.nfts.total24h, true)}
					/>
				) : null}
				<ChainTokenInfo chainTokenInfo={props.chainTokenInfo} />
			</div>
		</div>
	)
})

function StablecoinsMcap({ stablecoins, isAll }: { stablecoins: IChainOverviewData['stablecoins']; isAll: boolean }) {
	if (!stablecoins?.mcap) return null

	return (
		<ChainMetricSection
			label="Stablecoins Mcap"
			tooltip={
				isAll
					? 'Sum of market cap of all stablecoins circulating on all chains'
					: 'Sum of market cap of all stablecoins circulating on the chain'
			}
			value={formattedNum(stablecoins.mcap, true)}
		>
			{stablecoins.change7d != null ? (
				<ChainSubMetricRow
					label="Change (7d)"
					value={
						<Tooltip
							content={`${formattedNum(stablecoins.change7dUsd, true)}`}
							className={`ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap underline decoration-dotted ${
								+stablecoins.change7d >= 0 ? 'text-(--success)' : 'text-(--error)'
							}`}
						>
							{`${+stablecoins.change7d > 0 ? '+' : ''}${stablecoins.change7d}%`}
						</Tooltip>
					}
				/>
			) : null}
			{stablecoins.dominance != null ? (
				<ChainSubMetricRow label={`${stablecoins.topToken.symbol} Dominance`} value={`${stablecoins.dominance}%`} />
			) : null}
		</ChainMetricSection>
	)
}

function NativeStablecoins({ chainStablecoins }: { chainStablecoins: IChainOverviewData['chainStablecoins'] }) {
	if (!chainStablecoins?.length) return null

	return (
		<ChainMetricRow
			label={`Native Stablecoin${chainStablecoins.length > 1 ? 's' : ''}`}
			value={
				<>
					{chainStablecoins.map((coin) => (
						<BasicLink key={`native-stablecoin-${coin.name}`} href={coin.url} className="hover:underline">
							{coin.symbol ?? coin.name}
						</BasicLink>
					))}
				</>
			}
		/>
	)
}

function DexsVolume({ dexs }: { dexs: IChainOverviewData['dexs'] }) {
	if (dexs?.total24h == null) return null

	return (
		<ChainMetricSection
			label="DEXs Volume (24h)"
			tooltip={definitions.dexs.chain['24h']}
			value={formattedNum(dexs.total24h, true)}
		>
			{dexs.total7d != null ? (
				<ChainSubMetricRow
					label="Volume (7d)"
					tooltip={definitions.dexs.chain['7d']}
					value={formattedNum(dexs.total7d, true)}
				/>
			) : null}
			{dexs.change_7dover7d != null && (
				<ChainSubMetricRow
					label="Weekly Change"
					tooltip={definitions.dexs.chain['change7dover7d']}
					value={
						<span className={dexs.change_7dover7d >= 0 ? 'text-(--success)' : 'text-(--error)'}>
							{`${dexs.change_7dover7d >= 0 ? '+' : ''}${dexs.change_7dover7d}%`}
						</span>
					}
				/>
			)}
			{dexs.dexsDominance != null ? (
				<ChainSubMetricRow label="DEX vs CEX dominance" value={`${dexs.dexsDominance}%`} />
			) : null}
		</ChainMetricSection>
	)
}

function PerpsVolume({ perps }: { perps: IChainOverviewData['perps'] }) {
	if (perps?.total24h == null) return null

	return (
		<ChainMetricSection
			label="Perps Volume (24h)"
			tooltip={definitions.perps.chain['24h']}
			value={formattedNum(perps.total24h, true)}
		>
			{perps.total7d != null ? (
				<ChainSubMetricRow
					label="Volume (7d)"
					tooltip={definitions.perps.chain['7d']}
					value={formattedNum(perps.total7d, true)}
				/>
			) : null}
			{perps.change_7dover7d != null ? (
				<ChainSubMetricRow
					label="Weekly Change"
					tooltip={definitions.perps.chain['change7dover7d']}
					value={
						<span className={perps.change_7dover7d >= 0 ? 'text-(--success)' : 'text-(--error)'}>
							{`${perps.change_7dover7d >= 0 ? '+' : ''}${perps.change_7dover7d}%`}
						</span>
					}
				/>
			) : null}
		</ChainMetricSection>
	)
}

function ActiveAddresses({ users }: { users: IChainOverviewData['users'] }) {
	if (users.activeUsers == null) return null

	const hasSubMetrics = users.newUsers != null || users.transactions != null

	if (!hasSubMetrics) {
		return (
			<ChainMetricRow
				label="Active Addresses (24h)"
				tooltip={
					<p>
						Number of unique addresses that have interacted with the protocol directly in the last 24 hours.
						Interactions are counted as transactions sent directly against the protocol, thus transactions that go
						through an aggregator or some other middleman contract are not counted here.
						<br />
						<br />
						The reasoning for this is that this is meant to help measure stickiness/loyalty of users, and users that are
						interacting with the protocol through another product aren't likely to be sticky.
						<br />
						<br />
						Updates daily at 00:00 UTC
					</p>
				}
				value={formattedNum(users.activeUsers, false)}
			/>
		)
	}

	return (
		<ChainMetricSection
			label="Active Addresses (24h)"
			tooltip="Number of unique addresses that have interacted with the protocol directly in the last 24 hours. Interactions are counted as transactions sent directly against the protocol, thus transactions that go through an aggregator or some other middleman contract are not counted here. The reasoning for this is that this is meant to help measure stickiness/loyalty of users, and users that are interacting with the protocol through another product aren't likely to be sticky. Updates daily at 00:00 UTC"
			value={formattedNum(users.activeUsers, false)}
		>
			{users.newUsers != null ? (
				<ChainSubMetricRow label="New Addresses (24h)" value={formattedNum(users.newUsers, false)} />
			) : null}
			{users.transactions != null ? (
				<ChainSubMetricRow label="Transactions (24h)" value={formattedNum(users.transactions, false)} />
			) : null}
		</ChainMetricSection>
	)
}

function TreasurySection({ treasury }: { treasury: IChainOverviewData['treasury'] }) {
	if (!treasury) return null

	return (
		<ChainMetricSection label="Treasury" value={formattedNum(treasury.tvl, true)}>
			{treasury.tokenBreakdowns?.stablecoins != null ? (
				<ChainSubMetricRow label="Stablecoins" value={formattedNum(treasury.tokenBreakdowns.stablecoins, true)} />
			) : null}
			{treasury.tokenBreakdowns?.majors != null ? (
				<ChainSubMetricRow
					label="Major Tokens (ETH, BTC)"
					value={formattedNum(treasury.tokenBreakdowns.majors, true)}
				/>
			) : null}
			{treasury.tokenBreakdowns?.others != null ? (
				<ChainSubMetricRow label="Other Tokens" value={formattedNum(treasury.tokenBreakdowns.others, true)} />
			) : null}
			{treasury.tokenBreakdowns?.ownTokens != null ? (
				<ChainSubMetricRow label="Own Tokens" value={formattedNum(treasury.tokenBreakdowns.ownTokens, true)} />
			) : null}
		</ChainMetricSection>
	)
}

function RaisesSection({ chainRaises }: { chainRaises: IChainOverviewData['chainRaises'] }) {
	if (!chainRaises || chainRaises.length === 0) return null

	return (
		<ChainMetricSection
			label="Total Raised"
			tooltip="Sum of all money raised by the chain, including VC funding rounds, public sales and ICOs."
			value={formatRaisedAmount(chainRaises.reduce((sum, r) => sum + Number(r.amount), 0))}
		>
			{chainRaises
				.sort((a, b) => a.date - b.date)
				.map((raise) => (
					<p
						className="flex flex-col gap-1 border-b border-dashed border-(--cards-border) py-1 group-last:border-none"
						key={`${raise.date}-${raise.amount}-${raise.source}-${raise.round}`}
					>
						<span className="flex flex-wrap justify-between">
							<span className="text-(--text-label)">{dayjs(raise.date * 1000).format('MMM D, YYYY')}</span>
							<span className="font-jetbrains">{formattedNum(raise.amount * 1_000_000, true)}</span>
						</span>
						<span className="flex flex-wrap justify-between gap-1 text-(--text-label)">
							<span>Round: {raise.round}</span>
							{(raise as any).leadInvestors?.length || (raise as any).otherInvestors?.length ? (
								<span>
									Investors:{' '}
									{(raise as any).leadInvestors.concat((raise as any).otherInvestors).map((i, index, arr) => (
										<Fragment key={'raised from ' + i}>
											<a href={`/raises/${slug(i)}`}>{i}</a>
											{index < arr.length - 1 ? ', ' : ''}
										</Fragment>
									))}
								</span>
							) : null}
						</span>
					</p>
				))}
		</ChainMetricSection>
	)
}

function BridgedTvlSection({
	chainAssets,
	tvlSettingsGovtokens
}: {
	chainAssets: IChainOverviewData['chainAssets']
	tvlSettingsGovtokens: boolean
}) {
	if (!chainAssets) return null

	return (
		<ChainMetricSection
			label="Bridged TVL"
			tooltip="Value of all tokens held on the chain"
			value={formattedNum(
				chainAssets.total.total + (tvlSettingsGovtokens ? +(chainAssets?.ownTokens?.total ?? 0) : 0),
				true
			)}
		>
			{chainAssets.native?.total ? (
				<ChainSubMetricRow
					label="Native"
					tooltip="Sum of marketcaps of all tokens that were issued on the chain (excluding the chain's own token)"
					value={formattedNum(chainAssets.native.total, true)}
				/>
			) : null}
			{chainAssets.ownTokens?.total ? (
				<ChainSubMetricRow
					label="Own Tokens"
					tooltip="Marketcap of the governance token of the chain"
					value={formattedNum(chainAssets.ownTokens.total, true)}
				/>
			) : null}
			{chainAssets.canonical?.total ? (
				<ChainSubMetricRow
					label="Canonical"
					tooltip="Tokens that were bridged to the chain through the canonical bridge"
					value={formattedNum(chainAssets.canonical.total, true)}
				/>
			) : null}
			{chainAssets.thirdParty?.total ? (
				<ChainSubMetricRow
					label="Third Party"
					tooltip="Tokens that were bridged to the chain through third party bridges"
					value={formattedNum(chainAssets.thirdParty.total, true)}
				/>
			) : null}
		</ChainMetricSection>
	)
}

function ChainTokenInfo({ chainTokenInfo }: { chainTokenInfo: IChainOverviewData['chainTokenInfo'] }) {
	if (!chainTokenInfo?.token_symbol) return null

	return (
		<>
			<ChainMetricRow
				label={`$${chainTokenInfo.token_symbol} Price`}
				value={formattedNum(chainTokenInfo.current_price, true)}
			/>
			<ChainMetricRow
				label={`$${chainTokenInfo.token_symbol} Market Cap`}
				value={formattedNum(chainTokenInfo.market_cap ?? 0, true)}
			/>
			<ChainMetricRow
				label={`$${chainTokenInfo.token_symbol} FDV`}
				value={formattedNum(chainTokenInfo.fully_diluted_valuation ?? 0, true)}
			/>
		</>
	)
}
