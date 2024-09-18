import { useMemo } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import Layout from '~/layout'
import { ProtocolsByToken } from '~/components/Table'
import { DesktopSearch } from '~/components/Search/Base'
import LocalLoader from '~/components/LocalLoader'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import { PROTOCOLS_BY_TOKEN_API } from '~/constants'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { fetcher } from '~/utils/useSWR'
import Announcement from '~/components/Announcement'
import { withPerformanceLogging } from '~/utils/perf'
import CSVDownloadButton from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'

export default function Tokens({ searchData }) {
	const router = useRouter()

	const { token, includecex } = router.query

	const tokenSybmol = token ? (typeof token === 'string' ? token : token[0]) : null
	const includeCentraliseExchanges = includecex
		? typeof includecex === 'string' && includecex === 'true'
			? true
			: false
		: false

	const { data: protocols, error: errorFetchingProtocols } = useSWR(
		`protocolsByToken-${token}`,
		() => tokenSybmol && fetcher(`${PROTOCOLS_BY_TOKEN_API}/${tokenSybmol.toUpperCase()}`)
	)

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	const isLoading = !errorFetchingProtocols && !protocols

	const layoutStyles = isLoading ? { overflow: 'hidden' } : {}

	const filteredProtocols = useMemo(() => {
		return (
			protocols
				?.filter((protocol) =>
					!protocol.misrepresentedTokens && protocol.category?.toLowerCase() === 'cex'
						? includeCentraliseExchanges
						: true
				)
				?.map((p) => ({ ...p, amountUsd: Object.values(p.amountUsd).reduce((s: number, a: number) => s + a, 0) })) ?? []
		)
	}, [protocols, includeCentraliseExchanges])

	const downloadCSV = () => {
		const data = filteredProtocols.map((p) => {
			return {
				Protocol: p.name,
				'Amount (USD)': p.amountUsd,
				Category: p.category
			}
		})
		const headers = ['Protocol', 'Category', 'Amount (USD)']
		const csv = [headers.join(',')].concat(data.map((row) => headers.map((header) => row[header]).join(','))).join('\n')
		download(`protocols-by-token-${tokenSybmol}.csv`, csv)
	}

	return (
		<Layout title="Token Usage - DefiLlama" defaultSEO style={layoutStyles}>
			<Announcement notCancellable>This is not an exhaustive list</Announcement>
			<DesktopSearch data={searchData} placeholder="Search tokens..." data-alwaysdisplay onItemClick={onItemClick} />
			<>
				{isLoading ? (
					<LocalLoader />
				) : !tokenSybmol || !protocols || protocols.length === 0 ? (
					<></>
				) : (
					<>
						<TableFilters>
							<TableHeader>{`${tokenSybmol.toUpperCase()} usage in protocols`}</TableHeader>
							<CSVDownloadButton onClick={downloadCSV} />

							{/* <ToggleWrapper>
								<input
									type="checkbox"
									value="includeCentraliseExchanges"
									checked={includeCentraliseExchanges}
									onChange={() =>
										router.push({
											pathname: router.pathname,
											query: { ...router.query, includecex: !includeCentraliseExchanges }
										})
									}
								/>
								<span>Include CEXs</span>
							</ToggleWrapper> */}
						</TableFilters>

						<ProtocolsByToken data={filteredProtocols} />
					</>
				)}
			</>
		</Layout>
	)
}

export const getStaticProps = withPerformanceLogging('tokenUsage', async () => {
	const searchData = await getAllCGTokensList()

	return {
		props: {
			searchData: searchData
				.filter((token) => token.name && token.symbol && token.image)
				.map((token) => ({
					name: `${token.name}`,
					route: `/tokenUsage?token=${token.symbol}`,
					symbol: token.symbol,
					logo: token.image2 || null,
					fallbackLogo: token.image || null
				}))
		},
		revalidate: maxAgeForNext([23])
	}
})
