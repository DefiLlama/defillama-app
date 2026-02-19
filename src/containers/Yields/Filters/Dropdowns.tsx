import { useRouter } from 'next/router'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { AvailableRange } from '~/components/Filters/AvailableRange'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Switch } from '~/components/Switch'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'
import { pushShallowQuery } from '~/utils/routerQuery'
import { APYRange } from './APYRange'
import { YieldAttributes } from './Attributes'
import { FiltersByCategory } from './Categories'
import { FilterByChain } from './Chains'
import { ColumnFilters } from './ColumnFilters'
import { YieldProjects } from './Projects'
import { ResetAllYieldFilters } from './ResetAll'
import { FilterByToken } from './Tokens'
import type { IDropdownMenusProps } from './types'

const BAD_DEBT_KEY = YIELDS_SETTINGS.NO_BAD_DEBT.toLowerCase()
const EMPTY_TOKENS: string[] = []
const EMPTY_CHAINS: string[] = []
const EMPTY_PROJECTS: string[] = []
const EMPTY_CATEGORIES: string[] = []

export function YieldFilterDropdowns({
	pathname,
	tokensList,
	selectedTokens,
	chainList,
	selectedChains,
	evmChains,
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
	enabledColumns,
	resetFilters,
	availableRange,
	excludeBadDebt,
	selectedAttributes,
	excludeRewardApy,
	nestedMenu,
	includeLsdApy,
	// oxlint-disable-next-line no-unused-vars
	showMedianApy,
	// oxlint-disable-next-line no-unused-vars
	showStdDev,
	prepareCsv
}: IDropdownMenusProps) {
	const router = useRouter()

	const isBadDebtToggled = selectedAttributes ? selectedAttributes.includes(BAD_DEBT_KEY) : false

	const shouldExlcudeRewardApy = router.query.excludeRewardApy === 'true'

	const shouldIncludeLsdApy = router.query.includeLsdApy === 'true'

	const safeSelectedAttributes = selectedAttributes ?? []
	const effectivePathname = pathname || router.pathname
	const toggleBadDebtFilter = () => {
		const nextAttributes = isBadDebtToggled
			? safeSelectedAttributes.filter((attribute) => attribute !== BAD_DEBT_KEY)
			: [...safeSelectedAttributes, BAD_DEBT_KEY]
		pushShallowQuery(router, { attribute: nextAttributes }, effectivePathname)
	}
	const toggleExcludeRewardApyFilter = () => {
		pushShallowQuery(router, { excludeRewardApy: !shouldExlcudeRewardApy }, effectivePathname)
	}
	const toggleIncludeLsdApyFilter = () => {
		pushShallowQuery(router, { includeLsdApy: !shouldIncludeLsdApy }, effectivePathname)
	}

	return (
		<>
			{tokensList && tokensList.length > 0 && (
				<FilterByToken
					tokensList={tokensList}
					selectedTokens={selectedTokens ?? EMPTY_TOKENS}
					nestedMenu={nestedMenu}
				/>
			)}

			{chainList && chainList.length > 0 && (
				<FilterByChain
					chainList={chainList}
					selectedChains={selectedChains ?? EMPTY_CHAINS}
					evmChains={evmChains}
					nestedMenu={nestedMenu}
				/>
			)}

			{projectList && projectList.length > 0 && (
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects ?? EMPTY_PROJECTS}
					label="Projects"
					nestedMenu={nestedMenu}
					includeQueryKey="project"
					excludeQueryKey="excludeProject"
				/>
			)}

			{lendingProtocols && lendingProtocols.length > 0 && (
				<YieldProjects
					projectList={lendingProtocols}
					selectedProjects={selectedLendingProtocols ?? EMPTY_PROJECTS}
					label="Lending Protocols"
					nestedMenu={nestedMenu}
					includeQueryKey="lendingProtocol"
					excludeQueryKey="excludeLendingProtocol"
				/>
			)}

			{farmProtocols && farmProtocols.length > 0 && (
				<YieldProjects
					projectList={farmProtocols}
					selectedProjects={selectedFarmProtocols ?? EMPTY_PROJECTS}
					label="Farm Protocol"
					nestedMenu={nestedMenu}
					includeQueryKey="farmProtocol"
					excludeQueryKey="excludeFarmProtocol"
				/>
			)}

			{categoryList && categoryList.length > 0 && (
				<FiltersByCategory
					categoryList={categoryList}
					selectedCategories={selectedCategories ?? EMPTY_CATEGORIES}
					nestedMenu={nestedMenu}
				/>
			)}

			{attributes && <YieldAttributes pathname={pathname || router.pathname} nestedMenu={nestedMenu} />}

			{tvlRange && (
				<TVLRange
					nestedMenu={nestedMenu}
					variant="secondary"
					placement="bottom-start"
					onValueChange={(min, max) => {
						const eventData: Record<string, number> = {}
						if (min != null) eventData.min = min
						if (max != null) eventData.max = max
						let hasEventData = false
						for (const _key in eventData) {
							hasEventData = true
							break
						}
						if (hasEventData) {
							trackYieldsEvent(YIELDS_EVENTS.FILTER_TVL_RANGE, eventData)
						}
					}}
				/>
			)}

			{apyRange && <APYRange nestedMenu={nestedMenu} placement="bottom-start" />}

			{availableRange && <AvailableRange nestedMenu={nestedMenu} variant="secondary" placement="bottom-start" />}

			{enabledColumns && enabledColumns.length > 0 ? (
				<ColumnFilters enabledColumns={enabledColumns} nestedMenu={nestedMenu} />
			) : null}

			{excludeBadDebt && selectedAttributes ? (
				nestedMenu ? (
					<label className="flex flex-row-reverse items-center justify-between gap-3 px-3 py-2">
						<input type="checkbox" value="excludeBadDebt" checked={isBadDebtToggled} onChange={toggleBadDebtFilter} />
						<span>Exclude bad debt</span>
					</label>
				) : (
					<Switch
						value="excludeBadDebt"
						label="Exclude bad debt"
						checked={isBadDebtToggled}
						onChange={toggleBadDebtFilter}
					/>
				)
			) : null}

			{excludeRewardApy ? (
				nestedMenu ? (
					<label
						className={
							nestedMenu
								? 'flex flex-row-reverse items-center justify-between gap-3 px-3 py-2'
								: 'flex flex-nowrap items-center gap-1'
						}
					>
						<input
							type="checkbox"
							value="excludeRewardApy"
							checked={shouldExlcudeRewardApy}
							onChange={toggleExcludeRewardApyFilter}
						/>
						<span>Exclude reward APY</span>
					</label>
				) : (
					<Switch
						label="Exclude reward APY"
						value="excludeRewardApy"
						checked={shouldExlcudeRewardApy}
						onChange={toggleExcludeRewardApyFilter}
					/>
				)
			) : null}

			{includeLsdApy ? (
				nestedMenu ? (
					<label className="flex flex-row-reverse items-center justify-between gap-3 px-3 py-2">
						<input
							type="checkbox"
							value="includeLsdApy"
							checked={shouldIncludeLsdApy}
							onChange={toggleIncludeLsdApyFilter}
						/>
						<span>Include LSD APY</span>
					</label>
				) : (
					<Switch
						label="LSD APY"
						value="includeLsdApy"
						checked={shouldIncludeLsdApy}
						onChange={toggleIncludeLsdApyFilter}
					/>
				)
			) : null}

			{resetFilters ? <ResetAllYieldFilters pathname={pathname || router.pathname} nestedMenu={nestedMenu} /> : null}

			{prepareCsv ? (
				<CSVDownloadButton
					replaceClassName
					className={
						nestedMenu
							? 'flex items-center justify-center gap-1 rounded-md bg-(--link-active-bg) px-3 py-2 text-xs whitespace-nowrap text-white max-sm:mx-3 max-sm:my-6 sm:ml-auto'
							: 'flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)'
					}
					prepareCsv={prepareCsv}
				/>
			) : null}
		</>
	)
}
