import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { tvlOptionsMap } from '~/components/Filters/options'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { TokenRights } from '~/containers/ProtocolOverview/TokenRights'
import type {
	IProtocolMetadata,
	IProtocolOverviewPageData,
	IProtocolPageMetrics,
	ITokenRights
} from '~/containers/ProtocolOverview/types'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_OTHER_PROTOCOLS: string[] = []

type TokenRightsPageProps = {
	name: string
	parentProtocol: string | null
	otherProtocols: string[]
	category: string | null
	metrics: IProtocolPageMetrics
	warningBanners: IProtocolOverviewPageData['warningBanners']
	toggleOptions: Array<{ name: string; key: string }>
	tokenRights: ITokenRights
}

export const getStaticProps = withPerformanceLogging(
	'protocol/token-rights/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}
		const { protocol } = params
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

		if (!metadata || !metadata[1].tokenRights) {
			return { notFound: true, props: null }
		}

		// Uses the updateProtocol endpoint under the hood (`getProtocol` -> `PROTOCOL_API`).
		const protocolData = await getProtocol(protocol)

		if (!protocolData?.tokenRights) {
			return { notFound: true, props: null }
		}

		const computedMetrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })
		const metrics: IProtocolPageMetrics = { ...computedMetrics, tokenRights: true }

		const toggleOptions: Array<{ name: string; key: string }> = []
		for (const chain in protocolData.chainTvls ?? {}) {
			if (TVL_SETTINGS_KEYS_SET.has(chain)) {
				const option = tvlOptionsMap.get(chain as any)
				if (option) toggleOptions.push(option)
			}
		}

		const props: TokenRightsPageProps = {
			name: protocolData.name,
			parentProtocol: protocolData.parentProtocol ?? null,
			otherProtocols: protocolData.otherProtocols ?? EMPTY_OTHER_PROTOCOLS,
			category: protocolData.category ?? null,
			metrics,
			warningBanners: getProtocolWarningBanners(protocolData),
			toggleOptions,
			tokenRights: protocolData.tokenRights
		}

		return { props, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function ProtocolTokenRightsPage(props: TokenRightsPageProps) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category ?? ''}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="tokenRights"
			warningBanners={props.warningBanners}
			toggleOptions={props.toggleOptions}
		>
			<div className="grid grid-cols-1 gap-2">
				<TokenRights tokenRights={props.tokenRights} />
			</div>
		</ProtocolOverviewLayout>
	)
}
