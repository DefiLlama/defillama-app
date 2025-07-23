import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { GovernanceData } from '~/containers/ProtocolOverview/Governance'
import { maxAgeForNext } from '~/api'
import {
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API
} from '~/constants'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'

export const getStaticProps = withPerformanceLogging(
	'protocol/governance/[...protocol]',
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

		if (!metadata || !metadata[1].governance) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const governanceApis = (
			protocolData.governanceID?.map((gid) =>
				gid.startsWith('snapshot:')
					? `${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${gid.split('snapshot:')[1].replace(/(:|’|')/g, '/')}.json`
					: gid.startsWith('compound:')
					? `${PROTOCOL_GOVERNANCE_COMPOUND_API}/${gid.split('compound:')[1].replace(/(:|’|')/g, '/')}.json`
					: gid.startsWith('tally:')
					? `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.split('tally:')[1].replace(/(:|’|')/g, '/')}.json`
					: `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.replace(/(:|’|')/g, '/')}.json`
			) ?? []
		).map((g) => g.toLowerCase())

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				governanceApis: governanceApis.filter((x) => !!x),
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="governance"
			toggleOptions={[]}
			warningBanners={props.warningBanners}
		>
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<GovernanceData apis={props.governanceApis} />
			</div>
		</ProtocolOverviewLayout>
	)
}
