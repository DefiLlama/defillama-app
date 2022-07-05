import { useMemo } from 'react'
import orderBy from 'lodash.orderby'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import Table, { columnsToShow, splitArrayByFalsyValues } from '~/components/Table'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl'])

	return {
		props: {
			protocols
		},
		revalidate: revalidate()
	}
}

const columns = columnsToShow('protocolName', 'chains', '1dChange', 'tvl', 'mcaptvl')

export default function TopGainersLosers({ protocols }) {
	const data = useCalcStakePool2Tvl(protocols)
	const { topGainers, topLosers } = useMemo(() => {
		const values = splitArrayByFalsyValues(data, 'change_1d')
		const sortedData = orderBy(values[0], ['change_1d'], ['desc'])
		return {
			topGainers: sortedData.slice(0, 5),
			topLosers: sortedData.slice(-5).reverse()
		}
	}, [data])

	return (
		<Layout title={`Top Gainers and Losers - DefiLlama`} defaultSEO>
			<Header>Top Gainers</Header>
			<Table data={topGainers} columns={columns} />

			<Header>Top Losers</Header>
			<Table data={topLosers} columns={columns} />
		</Layout>
	)
}

const Header = styled(TYPE.largeHeader)`
	margin: 12px 0 -12px !important;
`
