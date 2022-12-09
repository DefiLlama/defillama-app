import * as React from 'react'
import { useRouter } from 'next/router'
import { Input, SearchIcon, SearchWrapper } from '~/components/Filters/yields/v2/IncludeExcludeTokens'

interface IYieldSearchProps {
	pathname?: string
	lend?: boolean
	value?: string | null
	searchData: Array<{ name: string; symbol: string; image: string }>
}

export function useFormatTokensSearchList({ lend, searchData }) {
	const router = useRouter()

	const { lend: lendQuery, borrow, ...queryParams } = router.query

	const [targetParam, restParam] = lend ? ['lend', 'borrow'] : ['borrow', 'lend']

	const data = React.useMemo(() => {
		const stablecoinsSearch = {
			name: `All USD Stablecoins`,
			symbol: 'USD_Stables',
			route: {
				pathname: router.pathname,
				query: {
					[targetParam]: 'USD_Stables',
					[restParam]: router.query[restParam] || '',
					...queryParams
				}
			},
			logo: '/icons/usd_native.png'
		}

		const yieldsList =
			searchData?.map((el) => ({
				name: `${el.name} (${el.symbol?.toUpperCase()})`,
				symbol: el.symbol?.toUpperCase(),
				route: {
					pathname: router.pathname,
					query: { [targetParam]: el.symbol?.toUpperCase(), [restParam]: router.query[restParam] || '', ...queryParams }
				},
				logo: el.image
			})) ?? []

		return [stablecoinsSearch].concat(yieldsList)
	}, [searchData, restParam, router.query, targetParam, router.pathname, queryParams])

	return data
}

export default function YieldsSearch({ lend = false, searchData, pathname, value }: IYieldSearchProps) {
	const data = useFormatTokensSearchList({ lend, searchData })

	return (
		<>
			<SearchWrapper style={{ padding: '8px' }}>
				<SearchIcon size={16} />
				<Input placeholder={lend ? 'Collateral Token' : 'Token to Borrow'} />
			</SearchWrapper>
		</>
	)
}
