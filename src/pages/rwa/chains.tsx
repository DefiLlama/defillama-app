// import { maxAgeForNext } from '~/api'
// import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
// import { RWAChainsTable } from '~/containers/RWA/Chains'
// import { getRWAChainsOverview } from '~/containers/RWA/queries'
// import { rwaSlug } from '~/containers/RWA/rwaSlug'
// import Layout from '~/layout'
// import { withPerformanceLogging } from '~/utils/perf'

// export const getStaticProps = withPerformanceLogging(`rwa/chains`, async () => {
// 	const chains = await getRWAChainsOverview()

// 	if (!chains) return { notFound: true }

// 	return {
// 		props: {
// 			chains,
// 			chainLinks: [
// 				{ label: 'All', to: '/rwa/chains' },
// 				...chains.map((chain) => ({ label: chain.chain, to: `/rwa/chain/${rwaSlug(chain.chain)}` }))
// 			]
// 		},
// 		revalidate: maxAgeForNext([22])
// 	}
// })

// const pageName = ['RWA Chains']

// export default function RWAChainsPage({ chains, chainLinks }) {
// 	return (
// 		<Layout
// 			title="RWA Chains - DefiLlama"
// 			description={`Real World Assets by chain on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
// 			keywords={`real world assets, rwa chains, rwa onchain by chain`}
// 			pageName={pageName}
// 			canonicalUrl={`/rwa/chains`}
// 		>
// 			<RowLinksWithDropdown links={chainLinks} activeLink={'All'} />
// 			<RWAChainsTable chains={chains} />
// 		</Layout>
// 	)
// }

export default function RWAPage() {
	return <></>
}
