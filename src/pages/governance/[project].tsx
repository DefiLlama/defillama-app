import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import GovernanceProject from '~/containers/Governance/GovernanceProject'
import { getGovernanceDetailsPageData } from '~/containers/Governance/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'governance/[project]',
	async ({ params }: GetStaticPropsContext<{ project: string }>) => {
		const revalidate = maxAgeForNext([22])

		if (!params?.project) {
			return { notFound: true, revalidate }
		}

		const data = await getGovernanceDetailsPageData({ project: params.project })
		if ('notFound' in data) {
			return { notFound: true, revalidate }
		}

		return { props: data, revalidate }
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

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
