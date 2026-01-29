// import { maxAgeForNext } from '~/api'
// import { RWAOverview } from '~/containers/RWA'
// import { getRWAAssetsOverview, getRWAPlatformsOverview } from '~/containers/RWA/queries'
// import { rwaSlug } from '~/containers/RWA/rwaSlug'
// import Layout from '~/layout'
// import { withPerformanceLogging } from '~/utils/perf'

// export async function getStaticPaths() {
// 	const platforms = await getRWAPlatformsOverview()

// 	return {
// 		paths: platforms.map(({ platform }) => ({ params: { platform: [rwaSlug(platform)] } })),
// 		fallback: false
// 	}
// }

// export const getStaticProps = withPerformanceLogging(`rwa/platform/[...platform]`, async ({ params: { platform } }) => {
// 	const platformSlug = Array.isArray(platform) ? platform.join('/') : platform
// 	const props = await getRWAAssetsOverview({ platform: platformSlug })

// 	if (!props) return { notFound: true }

// 	return {
// 		props,
// 		revalidate: maxAgeForNext([22])
// 	}
// })

// const pageName = ['RWA']

// export default function RWAPage(props) {
// 	return (
// 		<Layout
// 			title="Real World Assets - DefiLlama"
// 			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
// 			keywords={`real world assets, defi rwa rankings, rwa on chain`}
// 			pageName={pageName}
// 			canonicalUrl={`/rwa`}
// 		>
// 			<RWAOverview {...props} />
// 		</Layout>
// 	)
// }

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: false
	}
}

export default function RWAPage() {
	return <></>
}
