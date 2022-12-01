import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { ToggleWrapper } from '~/components'
import { TVLRange } from '../../protocols'
import { FiltersByChain, FiltersByToken } from '../../shared'
import { APYRange } from '../APYRange'
import { YieldAttributes } from '../Attributes'
import { FiltersByCategory } from '../Categories'
import { YieldProjects } from '../Projects'
import { ResetAllYieldFilters } from '../ResetAll'
import { IncludeExcludeTokens } from './IncludeExcludeTokens'

interface IYieldFiltersProps {
	header: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
	tokens?: Array<{ name: string; symbol: string; logo: string }>
	children?: ReactNode
	pathname?: string
	tokensList?: Array<string>
	selectedTokens?: Array<string>
	chainList?: Array<string>
	selectedChains?: Array<string>
	projectList?: Array<{ name: string; slug: string }>
	selectedProjects?: Array<string>
	categoryList?: Array<string>
	selectedCategories?: Array<string>
	attributes?: boolean
	tvlRange?: boolean
	apyRange?: boolean
	show7dBaseApy?: boolean
	show7dIL?: boolean
	resetFilters?: boolean
}

export function YieldFiltersV2({
	header,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	tokens,
	pathname,
	tokensList,
	selectedTokens,
	chainList,
	selectedChains,
	projectList,
	selectedProjects,
	categoryList,
	selectedCategories,
	attributes,
	tvlRange,
	apyRange,
	show7dBaseApy,
	show7dIL,
	resetFilters
}: IYieldFiltersProps) {
	const router = useRouter()

	const trackingStats =
		poolsNumber && projectsNumber && chainsNumber
			? `Tracking ${poolsNumber + (poolsNumber > 1 ? ' pools' : ' pool')} over ${
					projectsNumber + (projectsNumber > 1 ? ' protocols' : ' protocol')
			  } on ${chainsNumber + (chainsNumber > 1 ? ' chains' : ' chain')}.`
			: null

	return (
		<div>
			<Header>
				<h1>{header}</h1>
				{trackingStats && <p>{trackingStats}</p>}
				<button>Save This Search</button>
			</Header>
			<Wrapper>
				{tokens && <IncludeExcludeTokens tokens={tokens} />}
				<Dropdowns>
					{tokensList && tokensList.length > 0 && (
						<FiltersByToken
							tokensList={tokensList}
							selectedTokens={selectedTokens || []}
							pathname={pathname || router.pathname}
							variant="secondary"
						/>
					)}

					{chainList && chainList.length > 0 && (
						<FiltersByChain
							chainList={chainList}
							selectedChains={selectedChains || []}
							pathname={pathname || router.pathname}
							variant="secondary"
						/>
					)}

					{projectList && projectList.length > 0 && (
						<YieldProjects
							projectList={projectList}
							selectedProjects={selectedProjects || []}
							pathname={pathname || router.pathname}
							variant="secondary"
						/>
					)}

					{categoryList && categoryList.length > 0 && (
						<FiltersByCategory
							categoryList={categoryList}
							selectedCategories={selectedCategories || []}
							pathname={pathname || router.pathname}
							variant="secondary"
						/>
					)}

					{attributes && <YieldAttributes pathname={pathname || router.pathname} variant="secondary" />}

					{tvlRange && <TVLRange variant="secondary" />}

					{apyRange && <APYRange variant="secondary" />}

					{show7dBaseApy && (
						<ToggleWrapper>
							<input
								type="checkbox"
								value="show7dBaseApy"
								checked={router.query.show7dBaseApy === 'true'}
								onChange={() => {
									router.push(
										{ pathname, query: { ...router.query, show7dBaseApy: !(router.query.show7dBaseApy === 'true') } },
										undefined,
										{
											shallow: true
										}
									)
								}}
							/>
							<span>Show 7d Base APY</span>
						</ToggleWrapper>
					)}

					{show7dIL && (
						<ToggleWrapper>
							<input
								type="checkbox"
								value="show7dIL"
								checked={router.query.show7dIL === 'true'}
								onChange={() => {
									router.push(
										{ pathname, query: { ...router.query, show7dIL: !(router.query.show7dIL === 'true') } },
										undefined,
										{
											shallow: true
										}
									)
								}}
							/>
							<span>Show 7d IL</span>
						</ToggleWrapper>
					)}

					{resetFilters && <ResetAllYieldFilters pathname={pathname || router.pathname} variant="secondary" />}
				</Dropdowns>
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

const Dropdowns = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
`
