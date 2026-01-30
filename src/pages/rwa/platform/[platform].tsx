import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	return {
		paths: metadataCache.rwaList.platforms
			.slice(0, 10)
			.map((platform) => ({ params: { platform: rwaSlug(platform) } })),
		fallback: false
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/platform/[platform]`,
	async ({ params }: GetStaticPropsContext<{ platform: string }>) => {
		if (!params?.platform) {
			return { notFound: true, props: null }
		}

		const platformSlug = params.platform

		let platformExists = false
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList
		for (const platform of rwaList.platforms) {
			if (rwaSlug(platform) === platformSlug) {
				platformExists = true
				break
			}
		}
		if (!platformExists) {
			return { notFound: true, props: null }
		}

		const props = await getRWAAssetsOverview({ platform: platformSlug })

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props) {
	return (
		<Layout
			title="Real World Assets - DefiLlama"
			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
