import * as React from 'react'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { getAirdropDirectoryData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { maxAgeForNext } from '~/api'

import { TableWithSearch } from '~/components/Table/TableWithSearch'

import { AirdropColumn } from '~/components/Table/Defi/columns'

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const airdrops = await getAirdropDirectoryData()

	return {
		props: { airdrops },
		revalidate: maxAgeForNext([22])
	}
})

const PageView = ({ airdrops }) => {
	return (
		<>
			<ProtocolsChainsSearch />

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
