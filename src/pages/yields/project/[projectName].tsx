import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { revalidate, getYieldPageData } from '~/utils/dataApi'

export async function getStaticPaths() {
	const data = await getYieldPageData()

	const paths = data.props.projectSlugList.slice(0, 20).map((project) => ({ params: { projectName: project } }))

	return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params: { projectName } }) {
	const data = await getYieldPageData({ project: projectName })

	return {
		...data,
		revalidate: revalidate()
	}
}

export default function YieldProjectPage(props) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage {...props} />
		</Layout>
	)
}
