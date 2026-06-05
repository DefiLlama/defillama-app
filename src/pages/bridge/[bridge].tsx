import type { GetStaticPropsContext, GetStaticPropsResult, InferGetStaticPropsType } from 'next'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BridgeProtocolOverview } from '~/containers/Bridges/BridgeProtocolOverview'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type BridgePageProps =
	| {
			state: 'ready'
			data: NonNullable<Awaited<ReturnType<typeof getBridgePageDatanew>>>
			bridgeSlug: string
	  }
	| {
			state: 'disabled'
			bridgeSlug: string
	  }

export const getStaticProps = withPerformanceLogging(
	'bridge/[bridge]',
	async ({ params }: GetStaticPropsContext<{ bridge: string }>): Promise<GetStaticPropsResult<BridgePageProps>> => {
		if (!params?.bridge) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const bridge = slug(params.bridge)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const supportedBridgeSlugs = metadataCache.bridgeProtocolSlugs ?? []
		const isKnownBridgeRoute = supportedBridgeSlugs.includes(bridge)

		if (!isKnownBridgeRoute) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		try {
			const data = await getBridgePageDatanew(bridge)

			if (!data) {
				return {
					props: { state: 'disabled', bridgeSlug: bridge },
					revalidate: maxAgeForNext([22])
				}
			}

			return {
				props: { state: 'ready', data, bridgeSlug: bridge },
				revalidate: maxAgeForNext([22])
			}
		} catch (error) {
			console.error(`[bridge] failed to fetch data for ${bridge}:`, error)

			return {
				props: { state: 'disabled', bridgeSlug: bridge },
				revalidate: maxAgeForNext([22])
			}
		}
	}
)

export const getStaticPaths = () => {
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

export default function Bridge(props: InferGetStaticPropsType<typeof getStaticProps>) {
	if (props.state === 'disabled') {
		return (
			<TemporarilyDisabledPage
				title={`Bridge Volume - DefiLlama`}
				description="This bridge route is temporarily unavailable and will be back shortly."
				canonicalUrl={`/bridge/${props.bridgeSlug}`}
				heading="Bridge data temporarily unavailable"
			>
				<p>We recognize this bridge route, but the upstream bridge APIs failed while loading this page.</p>
				<p>Please try again in a few minutes.</p>
			</TemporarilyDisabledPage>
		)
	}

	const data = props.data
	const bridgeSlug = props.bridgeSlug

	return (
		<Layout
			title={`${data.displayName}: Bridge Volume - DefiLlama`}
			description={`Track bridge volume and cross-chain transfers on ${data.displayName}. View bridged assets, transfer volumes, and DeFi bridge analytics from DefiLlama.`}
			canonicalUrl={`/bridge/${bridgeSlug}`}
		>
			<BridgeProtocolOverview {...data} />
		</Layout>
	)
}
