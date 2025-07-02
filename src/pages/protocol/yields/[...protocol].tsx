import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { ProtocolPools } from '~/containers/ProtocolOverview/Yields'
import { maxAgeForNext } from '~/api'
import { YIELD_POOLS_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'
import { slug } from '~/utils'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/yields/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

		if (!metadata || !metadata.yields) {
			return { notFound: true, props: null }
		}

		const [protocolData, yields] = await Promise.all([
			getProtocol(protocol),
			fetchWithErrorLogging(YIELD_POOLS_API)
				.then((res) => res.json())
				.catch((err) => {
					console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
					return {}
				})
		])

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetrics({ protocolData, metadata })

		const otherProtocols = protocolData?.otherProtocols?.map((p) => slug(p)) ?? []

		const projectYields = yields?.data?.filter(
			({ project }) =>
				project === metadata.name || (protocolData.parentProtocol ? false : otherProtocols.includes(project))
		)

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics,
				yields:
					yields && yields.data && projectYields.length > 0
						? {
								noOfPoolsTracked: projectYields.length,
								averageAPY: projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length
						  }
						: null
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
			tab="yields"
		>
			<div className="bg-(--cards-bg) rounded-md">
				<ProtocolPools
					data={props.yields}
					protocol={slug(props.name)}
					parentProtocol={props.parentProtocol}
					otherProtocols={props.otherProtocols}
				/>
			</div>
		</ProtocolOverviewLayout>
	)
}
