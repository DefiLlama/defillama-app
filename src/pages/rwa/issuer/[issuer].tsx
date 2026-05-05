import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAOverview } from '~/containers/RWA'
import { fetchRWAActiveTVLs } from '~/containers/RWA/api'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { RWATabNav } from '~/containers/RWA/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return { paths: [], fallback: 'blocking' as const }
	}

	// Issuers are derived from the live `/rwa/current` rows rather than metadata; prebuild the
	// top issuers by on-chain market cap so the most-clicked pages skip the blocking fallback,
	// and let everything else render on-demand via `fallback: 'blocking'`.
	const data = await fetchRWAActiveTVLs()
	const mcapByIssuer = new Map<string, number>()
	for (const item of data ?? []) {
		const issuer = item.issuer
		if (typeof issuer !== 'string' || issuer.length === 0) continue
		let onChainMcap = 0
		for (const value of Object.values(item.onChainMcap ?? {})) {
			if (Number.isFinite(value)) onChainMcap += value
		}
		mcapByIssuer.set(issuer, (mcapByIssuer.get(issuer) ?? 0) + onChainMcap)
	}
	const issuers = Array.from(mcapByIssuer.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([issuer]) => issuer)

	return {
		paths: issuers.map((issuer) => ({ params: { issuer: rwaSlug(issuer) } })),
		fallback: 'blocking' as const
	}
}

export const getStaticProps = withPerformanceLogging(
	'rwa/issuer/[issuer]',
	async ({ params }: GetStaticPropsContext<{ issuer: string }>) => {
		if (!params?.issuer) return { notFound: true }

		const issuerSlug = rwaSlug(params.issuer)

		const data = await fetchRWAActiveTVLs()
		let issuerName: string | null = null
		for (const item of data ?? []) {
			const issuer = item.issuer ?? 'Unknown'
			if (rwaSlug(issuer) === issuerSlug) {
				issuerName = issuer
				break
			}
		}
		if (!issuerName) return { notFound: true }

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList

		const props = await getRWAAssetsOverview({ issuer: issuerSlug, rwaList, prefetchedRwaProjects: data ?? [] })
		if (!props) return { notFound: true }

		return {
			props: { ...props, issuerName },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAIssuerPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.issuerName} RWA Dashboard & Analytics - DefiLlama`}
			description={`Explore tokenized real-world assets issued by ${props.issuerName}, including market cap, DeFi usage, and asset breakdowns.`}
			pageName={pageName}
			canonicalUrl={`/rwa/issuer/${props.issuerSlug}`}
		>
			<RWATabNav active="issuers" />
			<RWAOverview {...props} />
		</Layout>
	)
}
