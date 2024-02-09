import * as React from 'react'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { getAirdropDirectoryData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { maxAgeForNext } from '~/api'

import { TableWithSearch } from '~/components/Table/TableWithSearch'

import { AirdropColumn } from '~/components/Table/Defi/columns'

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getAirdropDirectoryData()

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([22])
	}
})

const PageView = ({ airdrops }) => {
	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Airdrop Directory' }} />

			<TableWithSearch
				data={airdrops}
				columns={AirdropColumn}
				columnToSearch={'name'}
				placeholder={'Search Airdrop...'}
			/>
		</>
	)
}

export default function Airdrops(props) {
	return (
		<Layout title={`Airdrop Directory - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
