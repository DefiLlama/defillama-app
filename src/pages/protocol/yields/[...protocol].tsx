import { maxAgeForNext } from '~/api'
import { YIELD_POOLS_API } from '~/constants'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { ProtocolPools } from '~/containers/ProtocolOverview/Yields'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/yields/[...protocol]',
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
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].yields) {
			return { notFound: true, props: null }
		}

		const [protocolData, yields] = await Promise.all([
			getProtocol(protocol),
			fetchJson(YIELD_POOLS_API).catch((err) => {
				console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
				return {}
			})
		])

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const otherProtocols = protocolData?.otherProtocols?.map((p) => slug(p)) ?? []

		const projectYields = yields?.data?.filter(
			({ project, apy }) =>
				(project === slug(metadata[1].displayName) ||
					(protocolData.parentProtocol ? false : otherProtocols.includes(project))) &&
				apy != 0
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
						: null,
				warningBanners: getProtocolWarningBanners(protocolData)
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
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<ProtocolPools
				data={props.yields}
				protocol={props.name}
				parentProtocol={props.parentProtocol}
				otherProtocols={props.otherProtocols}
			/>
		</ProtocolOverviewLayout>
	)
}
