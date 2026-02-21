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
			title={`Governance - DefiLlama`}
			description={`Governance overview by projects. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`governance proposals, governance by project`}
			canonicalUrl={`/governance`}
			pageName={pageName}
		>
			<Governance data={data} />
		</Layout>
	)
}
