import Governance from '~/containers/Governance'
import { getGovernancePageData } from '~/containers/Governance/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('governance', async () => {
	const data = await getGovernancePageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Governance']

export default function GovernancePage({ data }) {
		return (
		<Layout
			title="Governance Tracker - DeFi Proposals & DAO Voting - DefiLlama"
			description="Track DeFi governance proposals and DAO voting activity across protocols. Monitor active proposals, voter participation, and governance outcomes for 200+ DeFi DAOs including Uniswap, Aave, and MakerDAO."
			canonicalUrl={`/governance`}
			pageName={pageName}
		>
			<Governance data={data} />
		</Layout>
	)
}
