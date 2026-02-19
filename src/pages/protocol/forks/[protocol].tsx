import { useQuery } from '@tanstack/react-query'
import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { LocalLoader } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ForksByProtocol } from '~/containers/Forks/ForksByProtocol'
import { getForksByProtocolPageData } from '~/containers/Forks/queries'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { slug, tokenIconUrl } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/forks/[protocol]',
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

		if (!metadata || !metadata[1].forks) {
			return { notFound: true, props: null }
		}

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ clientSide: _clientSide, protocolData: _protocolData, ...props }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ['forks', props.name],
		queryFn: () => getForksByProtocolPageData({ fork: props.name }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="forks"
			warningBanners={props.warningBanners}
		>
			<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
				<h1 className="text-xl font-bold">{props.name} Forks</h1>
			</div>
			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : error || !data ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="p-2">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
				</div>
			) : (
				<ForksByProtocol {...data} />
			)}
		</ProtocolOverviewLayout>
	)
}
