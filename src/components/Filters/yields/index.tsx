import * as React from 'react'
import { useRouter } from 'next/router'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { useMedia } from '~/hooks'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'
import { LTV } from './LTV'
import { SlidingMenu } from '~/components/SlidingMenu'
import { YieldFilterDropdowns } from './Dropdowns'
import { DropdownsWrapper, Header, SearchWrapper, Wrapper } from '../v2Base'
import type { IYieldFiltersProps } from './types'

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	noOfStrategies,
	strategyInputsData,
	ltvPlaceholder,
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
				{/* <button>Save This Search</button> */}
			</Header>
			<Wrapper>
				{strategyInputsData && (
					<SearchWrapper>
						<YieldsSearch value={lend} searchData={strategyInputsData} lend />
						{lend && (
							<>
								<YieldsSearch value={borrow} searchData={strategyInputsData} />

								<LTV placeholder={ltvPlaceholder} />
							</>
						)}
					</SearchWrapper>
				)}

				{tokens && !isSmall && <IncludeExcludeTokens tokens={tokens} />}

				<DropdownsWrapper>
					{isSmall ? (
						<SlidingMenu label="Filters" variant="secondary">
							<YieldFilterDropdowns {...props} isMobile />
						</SlidingMenu>
					) : (
						<YieldFilterDropdowns {...props} />
					)}{' '}
				</DropdownsWrapper>
			</Wrapper>
		</div>
	)
}

export { attributeOptions } from './Attributes'
