import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/ProtocolChart'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/dexs/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

		if (!metadata || !metadata.dexs) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				adapterType: 'dexs',
				protocol: metadata.name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			})
		])

		const metrics = getProtocolMetrics({ protocolData, metadata })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				hasMultipleChain: adapterData?.chains?.length > 1 ? true : false,
				hasMultipleVersions: adapterData?.linkedProtocols?.length > 0 && protocolData.isParentProtocol ? true : false,
				metrics
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
			tab="dexs"
		>
			<div className="bg-(--cards-bg) border border-[#e6e6e6] dark:border-[#222324] rounded-md">
				<div className="grid grid-cols-2 rounded-md">
					<DimensionProtocolChartByType chartType="overview" protocolName={slug(props.name)} adapterType="dexs" />
					{props.hasMultipleChain ? (
						<DimensionProtocolChartByType chartType="chain" protocolName={slug(props.name)} adapterType="dexs" />
					) : null}
					{props.hasMultipleVersions ? (
						<DimensionProtocolChartByType chartType="version" protocolName={slug(props.name)} adapterType="dexs" />
					) : null}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}
