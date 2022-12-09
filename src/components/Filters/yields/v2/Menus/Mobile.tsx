import { useRouter } from 'next/router'
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
			{tokensList && tokensList.length > 0 && (
				<FiltersByToken
					tokensList={tokensList}
					selectedTokens={selectedTokens || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu
				/>
			)}

			{chainList && chainList.length > 0 && (
				<FiltersByChain
					chainList={chainList}
					selectedChains={selectedChains || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu
				/>
			)}

			{projectList && projectList.length > 0 && (
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu
				/>
			)}

			{categoryList && categoryList.length > 0 && (
				<FiltersByCategory
					categoryList={categoryList}
					selectedCategories={selectedCategories || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu
				/>
			)}

			{attributes && <YieldAttributes pathname={pathname || router.pathname} variant="secondary" subMenu />}

			{tvlRange && <TVLRange variant="secondary" subMenu />}

			{apyRange && <APYRange variant="secondary" subMenu />}

			{show7dBaseApy && (
				<label className="sliding-menu-button">
					<span>Show 7d Base APY</span>
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
				</label>
			)}

			{show7dIL && (
				<label className="sliding-menu-button">
					<span>Show 7d IL</span>
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
				</label>
			)}

			{resetFilters && <ResetAllYieldFilters pathname={pathname || router.pathname} variant="secondary" subMenu />}
		</SlidingMenu>
	)
}
