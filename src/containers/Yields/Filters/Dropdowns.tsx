import { useRouter } from 'next/router'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { AvailableRange } from '~/components/Filters/AvailableRange'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Switch } from '~/components/Switch'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'
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
	show7dBaseApy,
	show7dIL,
	resetFilters,
	availableRange,
	excludeBadDebt,
	selectedAttributes,
	excludeRewardApy,
	nestedMenu,
	show1dVolume,
	show7dVolume,
	showInceptionApy,
	includeLsdApy,
	showBorrowBaseApy,
	showBorrowRewardApy,
	showNetBorrowApy,
	showLTV,
	showTotalSupplied,
	showTotalBorrowed,
	showAvailable,
	prepareCsv
}: IDropdownMenusProps) {
	const router = useRouter()

	const isBadDebtToggled = selectedAttributes ? selectedAttributes.includes(BAD_DEBT_KEY) : false

	const shouldExlcudeRewardApy = router.query.excludeRewardApy === 'true'

	const shouldIncludeLsdApy = router.query.includeLsdApy === 'true'

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
						if (Object.keys(eventData).length > 0) {
							trackYieldsEvent(YIELDS_EVENTS.FILTER_TVL_RANGE, eventData)
						}
					}}
				/>
			)}

			{apyRange && <APYRange nestedMenu={nestedMenu} placement="bottom-start" />}

			{availableRange && <AvailableRange nestedMenu={nestedMenu} variant="secondary" placement="bottom-start" />}

			{(show7dBaseApy ||
				show7dIL ||
				show1dVolume ||
				show7dVolume ||
				showInceptionApy ||
				showBorrowBaseApy ||
				showBorrowRewardApy ||
				showNetBorrowApy ||
				showTotalSupplied ||
				showTotalBorrowed ||
				showAvailable ||
				showLTV) && (
				<ColumnFilters
					show7dBaseApy={show7dBaseApy}
					show7dIL={show7dIL}
					show1dVolume={show1dVolume}
					show7dVolume={show7dVolume}
					showInceptionApy={showInceptionApy}
					showBorrowBaseApy={showBorrowBaseApy}
					showBorrowRewardApy={showBorrowRewardApy}
					showNetBorrowApy={showNetBorrowApy}
					showTotalSupplied={showTotalSupplied}
					showTotalBorrowed={showTotalBorrowed}
					showAvailable={showAvailable}
					showLTV={showLTV}
					nestedMenu={nestedMenu}
				/>
			)}

			{excludeBadDebt && selectedAttributes ? (
				nestedMenu ? (
					<label className="flex flex-row-reverse items-center justify-between gap-3 px-3 py-2">
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
				) : (
					<Switch
						value="excludeBadDebt"
						label="Exclude bad debt"
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
				) : (
					<Switch
						label="Exclude reward APY"
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
				)
			) : null}

			{includeLsdApy ? (
				nestedMenu ? (
					<label className="flex flex-row-reverse items-center justify-between gap-3 px-3 py-2">
						<input
							type="checkbox"
							value="includeLsdApy"
							checked={shouldIncludeLsdApy}
							onChange={() => {
								router.push(
									{
										pathname: pathname || router.pathname,
										query: {
											...router.query,
											includeLsdApy: !shouldIncludeLsdApy
										}
									},
									undefined,
									{ shallow: true }
								)
							}}
						/>
						<span>Include LSD APY</span>
					</label>
				) : (
					<Switch
						label="LSD APY"
						value="includeLsdApy"
						checked={shouldIncludeLsdApy}
						onChange={() => {
							router.push(
								{
									pathname: pathname || router.pathname,
									query: {
										...router.query,
										includeLsdApy: !shouldIncludeLsdApy
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
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
