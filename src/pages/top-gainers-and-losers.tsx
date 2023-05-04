import { useMemo } from 'react'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
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
			<Header>Top Gainers</Header>
			<TopGainersAndLosers data={topGainers} />

			<Header>Top Losers</Header>
			<TopGainersAndLosers data={topLosers} />
		</Layout>
	)
}

const Header = styled(TYPE.largeHeader)`
	margin: 12px 0 -12px !important;
`
