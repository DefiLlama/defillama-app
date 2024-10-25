import { useMemo } from 'react'
import Layout from '~/layout'
import { splitArrayByFalsyValues } from '~/components/Table/utils'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { TopGainersAndLosers } from '~/components/Table/Defi/Protocols'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('top-gainers-and-losers', async () => {
	const { protocols } = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl'])

	return {
		props: {
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function TopGainersLosers({ protocols }) {
	const data = useCalcStakePool2Tvl(protocols)
	const { topGainers, topLosers } = useMemo(() => {
		const values = splitArrayByFalsyValues(data, 'change_1d')
		const sortedData = values[0].sort((a, b) => b['change_1d'] - a['change_1d'])

		return {
			topGainers: sortedData.slice(0, 5),
			topLosers: sortedData.slice(-5).reverse()
		}
	}, [data])

	return (
		<Layout title={`Top Gainers and Losers - DefiLlama`} defaultSEO>
			<h1 className="text-2xl font-medium -mb-5">Top Gainers</h1>
			<TopGainersAndLosers data={topGainers} />

			<h1 className="text-2xl font-medium -mb-5">Top Losers</h1>
			<TopGainersAndLosers data={topLosers} />
		</Layout>
	)
}
