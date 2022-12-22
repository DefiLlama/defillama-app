import { useRouter } from 'next/router'
import { FiltersByChain, FiltersByToken } from '../common'
import { AvailableRange, TVLRange } from '../protocols'
import { YieldAttributes } from './Attributes'
import { FiltersByCategory } from './Categories'
import { YieldProjects } from './Projects'
import { APYRange } from './APYRange'
import { ResetAllYieldFilters } from './ResetAll'
import type { IDropdownMenusProps } from './types'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { ColumnFilters } from '../common/ColumnFilters'

const BAD_DEBT_KEY = YIELDS_SETTINGS.NO_BAD_DEBT.toLowerCase()

export function YieldFilterDropdowns({
	pathname,
	tokensList,
	selectedTokens,
	chainList,
	selectedChains,
	projectList,
	selectedProjects,
	lendingProtocols,
	selectedLendingProtocols,
	farmProtocols,
	selectedFarmProtocols,
	categoryList,
	selectedCategories,
	attributes,
	tvlRange,
	apyRange,
	show7dBaseApy,
	show7dIL,
	resetFilters,
	availableRange,
	excludeBadDebt,
	selectedAttributes,
	excludeRewardApy,
	isMobile,
	show1dVolume,
	show7dVolume
}: IDropdownMenusProps) {
	const router = useRouter()

	const isBadDebtToggled = selectedAttributes ? selectedAttributes.includes(BAD_DEBT_KEY) : false

	const shouldExlcudeRewardApy = router.query.excludeRewardApy === 'true' ? true : false

	return (
		<>
			{tokensList && tokensList.length > 0 && (
				<FiltersByToken
					tokensList={tokensList}
					selectedTokens={selectedTokens || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{chainList && chainList.length > 0 && (
				<FiltersByChain
					chainList={chainList}
					selectedChains={selectedChains || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{projectList && projectList.length > 0 && (
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{lendingProtocols && lendingProtocols.length > 0 && (
				<YieldProjects
					projectList={lendingProtocols}
					selectedProjects={selectedLendingProtocols || []}
					pathname={pathname || router.pathname}
					label="Lending Protocol"
					query="lendingProtocol"
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{farmProtocols && farmProtocols.length > 0 && (
				<YieldProjects
					projectList={farmProtocols}
					selectedProjects={selectedFarmProtocols || []}
					pathname={pathname || router.pathname}
					label="Farm Protocol"
					query="farmProtocol"
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{categoryList && categoryList.length > 0 && (
				<FiltersByCategory
					categoryList={categoryList}
					selectedCategories={selectedCategories || []}
					pathname={pathname || router.pathname}
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{attributes && <YieldAttributes pathname={pathname || router.pathname} variant="secondary" subMenu={isMobile} />}

			{tvlRange && <TVLRange variant="secondary" subMenu={isMobile} />}

			{apyRange && <APYRange variant="secondary" subMenu={isMobile} />}

			{availableRange && <AvailableRange variant="secondary" subMenu={isMobile} />}

			{(show7dBaseApy || show7dIL || show1dVolume || show7dVolume) && (
				<ColumnFilters
					show7dBaseApy={show7dBaseApy}
					show7dIL={show7dIL}
					show1dVolume={show1dVolume}
					show7dVolume={show7dVolume}
					variant="secondary"
					subMenu={isMobile}
				/>
			)}

			{excludeBadDebt && selectedAttributes && (
				<label className={isMobile ? 'sliding-menu-button align-reverse' : 'checkbox-filter'}>
					<input
						type="checkbox"
						value="excludeBadDebt"
						checked={isBadDebtToggled}
						onChange={() => {
							router.push(
								{
									pathname: pathname || router.pathname,
									query: {
										...router.query,
										attribute: isBadDebtToggled
											? selectedAttributes.filter((a) => a !== BAD_DEBT_KEY)
											: [...selectedAttributes, BAD_DEBT_KEY]
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
					/>
					<span>Exclude bad debt</span>
				</label>
			)}

			{excludeRewardApy && (
				<label className={isMobile ? 'sliding-menu-button align-reverse' : 'checkbox-filter'}>
					<input
						type="checkbox"
						value="excludeRewardApy"
						checked={shouldExlcudeRewardApy}
						onChange={() => {
							router.push(
								{
									pathname: pathname || router.pathname,
									query: {
										...router.query,
										excludeRewardApy: !shouldExlcudeRewardApy
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
					/>
					<span>Exclude reward APY</span>
				</label>
			)}

			{resetFilters && (
				<ResetAllYieldFilters pathname={pathname || router.pathname} variant="secondary" subMenu={isMobile} />
			)}
		</>
	)
}
