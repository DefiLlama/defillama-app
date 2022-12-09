import { useRouter } from 'next/router'
import styled from 'styled-components'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'
import { DesktopYieldMenus } from './Menus/Desktop'
import { MobileYieldMenus } from './Menus/Mobile'
import { useMedia } from '~/hooks'
import type { IYieldFiltersProps } from './types'
import { LTV } from '../LTV'

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	noOfStrategies,
	strategyInputsData,
	...props
}: IYieldFiltersProps) {
	const trackingStats =
		poolsNumber && projectsNumber && chainsNumber
			? `Tracking ${poolsNumber + (poolsNumber > 1 ? ' pools' : ' pool')} over ${
					projectsNumber + (projectsNumber > 1 ? ' protocols' : ' protocol')
			  } on ${chainsNumber + (chainsNumber > 1 ? ' chains' : ' chain')}.`
			: noOfStrategies
			? `${noOfStrategies} Strategies`
			: null

	const isSmall = useMedia(`(max-width: 30rem)`)

	const { query, pathname } = useRouter()

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
						<YieldsSearch pathname={pathname} value={lend} searchData={strategyInputsData} lend />
						{lend && (
							<>
								<YieldsSearch pathname={pathname} value={borrow} searchData={strategyInputsData} />

								<LTV placeholder="% of max LTV" />
							</>
						)}
					</SearchWrapper>
				)}

				{isSmall ? (
					<MobileYieldMenus {...props} />
				) : (
					<>
						{tokens && <IncludeExcludeTokens tokens={tokens} />}
						<DesktopYieldMenus {...props} />
					</>
				)}
			</Wrapper>
		</div>
	)
}

const Header = styled.div`
	position: relative;
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	padding: 16px;
	border-radius: 12px 12px 0 0;
	border: 1px solid ${({ theme }) => theme.divider};
	border-bottom: 0;

	& > * {
		font-size: 0.875rem;
		font-weight: 400;
	}

	p {
		color: #646466;
	}

	button {
		margin-left: auto;
		color: ${({ theme }) => theme.link};
	}
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 20px 16px 24px;
	background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(246, 246, 246, 0.6)')};
	border-radius: 0 0 12px 12px;
	border: 1px solid ${({ theme }) => theme.divider};
	border-top: 0;
`

const SearchWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;

	& > * {
		gap: 8px;
		flex: 1;
	}

	& > * {
		& > *[data-searchicon='true'] {
			top: 14px;
			right: 16px;
		}
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
	}
`
