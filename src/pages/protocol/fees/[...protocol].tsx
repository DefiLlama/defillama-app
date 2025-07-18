import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { feesOptions } from '~/components/Filters/options'
import { IProtocolMetadata, IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { KeyMetrics } from '~/containers/ProtocolOverview'
import { TokenLogo } from '~/components/TokenLogo'

export const getStaticProps = withPerformanceLogging(
	'protocol/fees/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (protocolMetadata[key].name === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].fees) {
			return { notFound: true, props: null }
		}

		const [protocolData, feesData, revenueData, holdersRevenueData, bribeRevenueData, tokenTaxData] = await Promise.all(
			[
				getProtocol(protocol),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
				}),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyRevenue'
				}).catch(() => null),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyHoldersRevenue'
				}).catch(() => null),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyBribesRevenue'
				}).catch(() => null),
				getAdapterProtocolSummary({
					adapterType: 'fees',
					protocol: metadata[1].name,
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true,
					dataType: 'dailyTokenTaxes'
				}).catch(() => null)
			]
		)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const fees: IProtocolOverviewPageData['fees'] = {
			total24h: feesData.total24h ?? null,
			total7d: feesData.total7d ?? null,
			total30d: feesData.total30d ?? null,
			totalAllTime: feesData.totalAllTime ?? null
		}

		const revenue: IProtocolOverviewPageData['revenue'] = {
			total24h: revenueData?.total24h ?? null,
			total7d: revenueData?.total7d ?? null,
			total30d: revenueData?.total30d ?? null,
			totalAllTime: revenueData?.totalAllTime ?? null
		}

		const holdersRevenue: IProtocolOverviewPageData['holdersRevenue'] = {
			total24h: holdersRevenueData?.total24h ?? null,
			total7d: holdersRevenueData?.total7d ?? null,
			total30d: holdersRevenueData?.total30d ?? null,
			totalAllTime: holdersRevenueData?.totalAllTime ?? null
		}

		const bribeRevenue: IProtocolOverviewPageData['bribeRevenue'] = {
			total24h: bribeRevenueData?.total24h ?? null,
			total7d: bribeRevenueData?.total7d ?? null,
			total30d: bribeRevenueData?.total30d ?? null,
			totalAllTime: bribeRevenueData?.totalAllTime ?? null
		}

		const tokenTax: IProtocolOverviewPageData['tokenTax'] = {
			total24h: tokenTaxData?.total24h ?? null,
			total7d: tokenTaxData?.total7d ?? null,
			total30d: tokenTaxData?.total30d ?? null,
			totalAllTime: tokenTaxData?.totalAllTime ?? null
		}

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				fees,
				revenue,
				holdersRevenue,
				bribeRevenue,
				tokenTax,
				hasKeyMetrics: true,
				hasMultipleChain: feesData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: feesData?.linkedProtocols?.length > 0 && protocolData.isParentProtocol ? true : false
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="fees"
			toggleOptions={feesOptions}
		>
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
				<div className="col-span-1 flex flex-col gap-6 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 xl:min-h-[360px]">
					<h1 className="flex items-center flex-wrap gap-2 text-xl">
						<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
						<span className="font-bold">
							{props.name ? props.name + `${props.deprecated ? ' (*Deprecated*)' : ''}` + ' ' : ''}
						</span>
					</h1>
					<KeyMetrics {...props} formatPrice={(value) => formattedNum(value, true)} />
				</div>
				<div className="col-span-1 xl:col-[2/-1] border border-(--cards-border) rounded-md xl:min-h-[360px]">
					<DimensionProtocolChartByType chartType="overview" protocolName={slug(props.name)} adapterType="fees" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.hasMultipleChain ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full border border-(--cards-border) rounded-md">
						<DimensionProtocolChartByType chartType="chain" protocolName={slug(props.name)} adapterType="fees" />
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full border border-(--cards-border) rounded-md">
						<DimensionProtocolChartByType chartType="version" protocolName={slug(props.name)} adapterType="fees" />
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
