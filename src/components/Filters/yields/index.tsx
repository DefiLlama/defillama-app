import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldsSearch } from '~/components/Search/Yields/Optimizer'
import { useMedia } from '~/hooks/useMedia'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'
import { LTV } from './LTV'
import { SlidingMenu } from '~/components/SlidingMenu'
import { YieldFilterDropdowns } from './Dropdowns'
import { DropdownsWrapper, Header, SearchWrapper, Wrapper } from '../v2Base'
import type { IYieldFiltersProps } from './types'
import { InputFilter } from './Amount'

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	noOfStrategies,
	strategyInputsData,
	ltvPlaceholder,
	showSearchOnMobile,
	...props
}: IYieldFiltersProps) {
	const trackingStats =
		poolsNumber && projectsNumber && chainsNumber
			? `Tracking ${poolsNumber + (poolsNumber > 1 ? ' pools' : ' pool')} over ${
					projectsNumber + (projectsNumber > 1 ? ' protocols' : ' protocol')
			  } on ${chainsNumber + (chainsNumber > 1 ? ' chains' : ' chain')}.`
			: noOfStrategies
			? `: ${noOfStrategies} Strategies`
			: null

	const isSmall = useMedia(`(max-width: 30rem)`)

	const { query } = useRouter()

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null

	return (
		<div>
			<Header>
				<h1>{header}</h1>
				{trackingStats && <p>{trackingStats}</p>}
			</Header>
			<Wrapper>
				{strategyInputsData ? (
					<StrategySearch lend={lend} borrow={borrow} searchData={strategyInputsData} ltvPlaceholder={ltvPlaceholder} />
				) : null}

				{tokens && (showSearchOnMobile || !isSmall) ? (
					<IncludeExcludeTokens tokens={tokens} data-alwaysdisplay={showSearchOnMobile ? true : false} />
				) : null}

				<DropdownsWrapper>
					{isSmall ? (
						<SlidingMenu label="Filters" variant="secondary">
							<YieldFilterDropdowns {...props} isMobile />
						</SlidingMenu>
					) : (
						<YieldFilterDropdowns {...props} />
					)}
				</DropdownsWrapper>
			</Wrapper>
		</div>
	)
}

function useFormatTokensSearchList({ lend, searchData }) {
	const data = React.useMemo(() => {
		const stablecoinsSearch = {
			name: `All USD Stablecoins`,
			symbol: 'USD_Stables',
			logo: 'https://icons.llamao.fi/icons/pegged/usd_native?h=48&w=48'
		}

		const yieldsList =
			searchData.map((el) => [
				`${el.name}`,
				{
					name: `${el.name}`,
					symbol: el.symbol.toUpperCase(),
					logo: el.image2 || null,
					fallbackLogo: el.image || null
				}
			]) ?? []

		return Object.fromEntries([[stablecoinsSearch.name, stablecoinsSearch]].concat(yieldsList))
	}, [searchData])

	return { data }
}

const StrategySearch = ({ lend, borrow, searchData, ltvPlaceholder }) => {
	const { data } = useFormatTokensSearchList({ lend, searchData })

	return (
		<SearchWrapper>
			<YieldsSearch value={lend} searchData={data} lend />
			{lend ? (
				<>
					<YieldsSearch value={borrow} searchData={data} />
					<LTV placeholder={ltvPlaceholder} />
					<InputFilter placeholder="Lend Amount" filterKey="lendAmount" />
					<InputFilter placeholder="Borrow Amount" filterKey="borrowAmount" />
				</>
			) : null}
		</SearchWrapper>
	)
}

export { attributeOptions } from './Attributes'
