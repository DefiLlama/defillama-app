import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { ProtocolPools } from '~/containers/ProtocolOverview/Yields'
import { maxAgeForNext } from '~/api'
import { YIELD_POOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'

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
			if (protocolMetadata[key].name === normalizedName) {
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
			({ project }) =>
				project === metadata[1].name || (protocolData.parentProtocol ? false : otherProtocols.includes(project))
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
			<div className="col-span-full flex flex-col gap-2 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 xl:p-4">
				<h2 className="relative group text-base font-semibold flex items-center gap-1" id="yields">
					Yields for {props.name}
				</h2>
			</div>
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
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
