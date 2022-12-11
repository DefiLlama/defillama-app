import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { addMaxAgeHeaderForNext, getAllCGTokensList } from '~/api'
import { getYieldPageData, getYieldMedianData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [23], 3600)
	const {
		props: { ...data }
	} = await getYieldPageData()
	data.pools = data.pools.filter((p) => p.apy > 0)
	const median = await getYieldMedianData()

	const cgTokens = await getAllCGTokensList()

	const tokens = []
	const tokenSymbolsList = []

	cgTokens.forEach((token) => {
		if (token.symbol) {
			tokens.push({ name: token.name, symbol: token.symbol.toUpperCase(), logo: token.image })
			tokenSymbolsList.push(token.symbol.toUpperCase())
		}
	})

	const compressed = compressPageProps({ ...data, median: median.props, tokens, tokenSymbolsList })

	return {
		props: { compressed }
	}
}

export default function YieldPlots({ compressed }) {
	const data = decompressPageProps(compressed)
	return (
		<Layout title={`Overview - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<PlotsPage {...data} />
		</Layout>
	)
}
