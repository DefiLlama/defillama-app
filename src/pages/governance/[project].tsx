import type { GetStaticPropsContext } from 'next'
import GovernanceProject from '~/containers/Governance/GovernanceProject'
import { getGovernanceDetailsPageData } from '~/containers/Governance/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'governance/[project]',
	async ({ params }: GetStaticPropsContext<{ project: string }>) => {
		if (!params?.project) {
			return { notFound: true, props: null }
		}

		return getGovernanceDetailsPageData({ project: params.project })
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function GovernanceProjectPage({ projectName, governanceData, governanceTypes }) {
	return (
		<Layout
			title={`${projectName} Governance - DefiLlama`}
			description={`${projectName} Governance on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${projectName} governance, governance on blockchain`}
			canonicalUrl={`/governance/${slug(projectName)}`}
		>
			{governanceData?.length ? (
				<GovernanceProject
					projectName={projectName}
					governanceData={governanceData}
					governanceTypes={governanceTypes ?? []}
				/>
			) : null}
		</Layout>
	)
}
