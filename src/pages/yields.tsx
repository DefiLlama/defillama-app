import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { getYieldPageData, getLendBorrowData } from '~/api/categories/yield'
import { maxAgeForNext } from '~/api'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields', async () => {
	const data = await getYieldPageData()
	const dataBorrow = await getLendBorrowData()
	data.props.pools = data.props.pools.map((p) => {
		const x = dataBorrow.props.pools.find((i) => i.pool === p.pool)
		return {
			...p,
			apyBaseBorrow: x?.apyBaseBorrow ?? null,
			apyRewardBorrow: x?.apyRewardBorrow ?? null,
			apyBorrow: x?.apyBorrow ?? null,
			totalSupplyUsd: x?.totalSupplyUsd ?? null,
			totalBorrowUsd: x?.totalBorrowUsd ?? null,
			totalAvailableUsd: x?.totalAvailableUsd ?? null,
			ltv: x?.ltv ?? null
		}
	})

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([23])
	}
})

export default function ApyHomePage(data) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
