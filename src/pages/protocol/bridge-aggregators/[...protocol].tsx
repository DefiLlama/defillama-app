import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'

export const getStaticProps = withPerformanceLogging(
	'protocol/bridge-aggregators/[...protocol]',
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

		if (!metadata || !metadata[1].bridgeAggregators) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'bridge-aggregators',
				protocol: metadata[1].name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			})
		])

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				hasMultipleChain: adapterData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: adapterData?.linkedProtocols?.length > 0 && protocolData.isParentProtocol ? true : false
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
			tab="bridge-aggregators"
		>
			<div className="bg-(--cards-bg) border border-[#e6e6e6] dark:border-[#222324] rounded-md">
				<div className="grid grid-cols-2 rounded-md">
					<DimensionProtocolChartByType
						chartType="overview"
						protocolName={slug(props.name)}
						adapterType="bridge-aggregators"
					/>
					{props.hasMultipleChain ? (
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="bridge-aggregators"
						/>
					) : null}
					{props.hasMultipleVersions ? (
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="bridge-aggregators"
						/>
					) : null}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}
