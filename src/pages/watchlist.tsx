import PortfolioContainer from '~/containers/PortfolioContainer'
import Layout from '~/layout'
import { basicPropertiesToKeep, getSimpleProtocolsPageData, revalidate } from '~/utils/dataApi'

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData(basicPropertiesToKeep)

	return {
		props: { protocols },
		revalidate: revalidate()
	}
}

export default function Portfolio({ protocols }) {
	return (
		<Layout title={`Saved TVL Rankings - DefiLlama`} defaultSEO>
			<PortfolioContainer protocolsDict={protocols} />
		</Layout>
	)
}
