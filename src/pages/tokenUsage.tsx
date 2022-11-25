import { useRouter } from 'next/router'
import useSWR from 'swr'
import pako from 'pako'
import { ProtocolsByToken } from '~/components/Table'
import { PROTOCOLS_BY_TOKEN_API } from '~/constants'
import Layout from '~/layout'
import { getCGMarketsDataURLs, revalidate } from '~/api'
import { arrayFetcher, fetcher } from '~/utils/useSWR'
import { DesktopSearch } from '~/components/Search/Base'
import type { IBaseSearchProps } from '~/components/Search/types'
import LocalLoader from '~/components/LocalLoader'

export default function Tokens({ compressed }) {
	const b = new Uint8Array(Buffer.from(compressed, 'base64'))
	const { searchData } = JSON.parse(pako.inflate(b, { to: 'string' }))

	const router = useRouter()

	const { token } = router.query

	const tokenSybmol = token ? (typeof token === 'string' ? token : token[0]) : null

	const { data: protocols, error: errorFetchingProtocols } = useSWR(
		`protocolsByToken-${token}`,
		() => tokenSybmol && fetcher(`${PROTOCOLS_BY_TOKEN_API}/${tokenSybmol.toUpperCase()}`)
	)

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	const isLoading = !errorFetchingProtocols && !protocols

	const layoutStyles = isLoading ? { overflow: 'hidden' } : {}

	return (
		<Layout title="Token Usage - DefiLlama" defaultSEO style={layoutStyles}>
			<DesktopSearch
				data={searchData}
				placeholder="Search tokens..."
				data-alwaysdisplay
				onItemClick={onItemClick}
				value="Ethereum"
				withValue
			/>
			<>{isLoading ? <LocalLoader /> : <ProtocolsByToken data={protocols || []} />}</>
		</Layout>
	)
}

export async function getStaticProps() {
	const tokensList = await arrayFetcher(getCGMarketsDataURLs())

	const searchData: IBaseSearchProps['data'] = []

	if (tokensList) {
		tokensList.forEach((tokens) => {
			if (tokens) {
				tokens.forEach((token) => {
					searchData.push({
						name: `${token.name}`,
						route: `/tokenUsage?token=${token.symbol}`,
						symbol: token.symbol,
						logo: token.image
					})
				})
			}
		})
	}

	const strData = JSON.stringify({
		searchData
	})

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}
