import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ToggleWrapper } from '~/components'
import { FiltersByChain, FiltersByToken } from '../../../shared'
import { YieldAttributes } from '../../Attributes'
import { FiltersByCategory } from '../../Categories'
import { YieldProjects } from '../../Projects'
import { APYRange } from '../../APYRange'
import { TVLRange } from '../../../protocols'
import { ResetAllYieldFilters } from '../../ResetAll'
import { SlidingMenu } from '~/components/SlidingMenu'
import type { IDropdownMenusProps } from '../types'

export function MobileYieldMenus({
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
}: IDropdownMenusProps) {
	const router = useRouter()

	return (
		<SlidingMenu label="Filters" variant="secondary">
			<FiltersByToken
				tokensList={tokensList}
				selectedTokens={selectedTokens || []}
				pathname={pathname || router.pathname}
				variant="secondary"
				subMenu
			/>
		</SlidingMenu>
	)

	return (
		<Wrapper>
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
								{
									pathname: pathname || router.pathname,
									query: { ...router.query, show7dBaseApy: !(router.query.show7dBaseApy === 'true') }
								},
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
								{
									pathname: pathname || router.pathname,
									query: { ...router.query, show7dIL: !(router.query.show7dIL === 'true') }
								},
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
		</Wrapper>
	)
}

const Wrapper = styled.div`
	display: flex;
	gap: 12px;
	flex-wrap: wrap;

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		display: none;
	}
`
