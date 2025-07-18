import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata, IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { TokenLogo } from '~/components/TokenLogo'
import { KeyMetrics } from '~/containers/ProtocolOverview'

export const getStaticProps = withPerformanceLogging(
	'protocol/options/[...protocol]',
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

		if (!metadata || !metadata[1].options) {
			return { notFound: true, props: null }
		}

		const [protocolData, premiumVolumeData, notionalVolumeData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'options',
				protocol: metadata[1].name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}),
			getAdapterProtocolSummary({
				adapterType: 'options',
				protocol: metadata[1].name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true,
				dataType: 'dailyNotionalVolume'
			}).catch(() => null)
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const optionsPremiumVolume: IProtocolOverviewPageData['optionsPremiumVolume'] = {
			total24h: premiumVolumeData.total24h ?? null,
			total7d: premiumVolumeData.total7d ?? null,
			total30d: premiumVolumeData.total30d ?? null,
			totalAllTime: premiumVolumeData.totalAllTime ?? null
		}

		const optionsNotionalVolume: IProtocolOverviewPageData['optionsNotionalVolume'] = {
			total24h: notionalVolumeData?.total24h ?? null,
			total7d: notionalVolumeData?.total7d ?? null,
			total30d: notionalVolumeData?.total30d ?? null,
			totalAllTime: notionalVolumeData?.totalAllTime ?? null
		}

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				optionsPremiumVolume,
				optionsNotionalVolume,
				hasKeyMetrics: true,
				hasMultipleChain: premiumVolumeData?.chains?.length > 1 ? true : false,
				hasMultipleVersions:
					premiumVolumeData?.linkedProtocols?.length > 0 && protocolData.isParentProtocol ? true : false
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
			tab="options"
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
					<DimensionProtocolChartByType chartType="overview" protocolName={slug(props.name)} adapterType="options" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{props.hasMultipleChain ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full border border-(--cards-border) rounded-md">
						<DimensionProtocolChartByType chartType="chain" protocolName={slug(props.name)} adapterType="options" />
					</div>
				) : null}
				{props.hasMultipleVersions ? (
					<div className="col-span-full xl:col-span-1 xl:only:col-span-full border border-(--cards-border) rounded-md">
						<DimensionProtocolChartByType chartType="version" protocolName={slug(props.name)} adapterType="options" />
					</div>
				) : null}
			</div>
		</ProtocolOverviewLayout>
	)
}
