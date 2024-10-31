import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { useComboboxState } from 'ariakit/combobox'
import { findActiveItem } from '../Base/utils'

interface IYieldSearchProps {
	lend?: boolean
	value?: string | null
	searchData: Array<{ name: string; symbol: string; image?: string | null; image2?: string | null }>
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
			logo: 'https://icons.llamao.fi/icons/pegged/usd_native?h=48&w=48'
		}

		const yieldsList =
			searchData?.map((el) => ({
				name: `${el.name}`,
				symbol: el.symbol?.toUpperCase(),
				route: {
					pathname: router.pathname,
					query: { [targetParam]: el.symbol?.toUpperCase(), [restParam]: router.query[restParam] || '', ...queryParams }
				},
				logo: el.image2 || null,
				fallbackLogo: el.image || null
			})) ?? []

		return [stablecoinsSearch].concat(yieldsList)
	}, [searchData, restParam, router.query, targetParam, router.pathname, queryParams])

	const onItemClick = (item) => {
		router.push(item.route, undefined, { shallow: true })
	}

	return { data, onItemClick }
}

export function YieldsSearch({ lend = false, searchData, value }: IYieldSearchProps) {
	const { data, onItemClick } = useFormatTokensSearchList({ lend, searchData })

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		...(value && { defaultValue: value }),
		list: data.map((x) => x.name)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	return (
		<Wrapper>
			{/* <Input
				state={combobox}
				placeholder={lend ? 'Collateral Token' : 'Token to Borrow'}
				withValue
				variant="secondary"
			/>

			<DesktopResults
				state={combobox}
				data={data}
				loading={false}
				onItemClick={(item) => {
					combobox.setValue(item.name)
					onItemClick(item)
				}}
			/> */}
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;

	input {
		width: 100%;
	}
`
