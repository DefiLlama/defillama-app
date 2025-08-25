import * as React from 'react'
import { TagGroup } from '~/components/TagGroup'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import { LoadingSpinner } from '../../LoadingSpinner'
import { TableBody } from '../../ProTable/TableBody'
import { useYieldsData } from './useYieldsData'
import { useYieldsTable } from './useYieldsTable'
import { YieldsColumnManagementPanel } from './YieldsColumnManagementPanel'
import { YieldsFilters, YieldsFiltersPanel } from './YieldsFiltersPanel'
import { YieldsTableHeader } from './YieldsTableHeader'
import { useRegisterCSVExtractor } from '../../../hooks/useCSVRegistry'

interface YieldsDatasetProps {
	chains?: string[]
	tableId?: string
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	filters?: YieldsFilters
}

export function YieldsDataset({
	chains,
	tableId,
	columnOrder: initialColumnOrder,
	columnVisibility: initialColumnVisibility,
	filters: savedFilters
}: YieldsDatasetProps) {
	const { data, isLoading, error, refetch } = useYieldsData(chains)
	const { handleTableColumnsChange, handleTableFiltersChange } = useProDashboard()

	const uniqueTableId = React.useMemo(() => tableId || `yields-table-${Date.now()}`, [tableId])

	const {
		table,
		pagination,
		setPagination,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder,
		toggleColumnVisibility,
		moveColumnUp,
		moveColumnDown,
		columnPresets,
		applyPreset,
		activePreset,
		downloadCSV,
		poolName,
		setPoolName,
		showFiltersPanel,
		setShowFiltersPanel,
		filters,
		setFilters,
		availableChains,
		availableTokens,
		activeFilterCount,
		applyFilters,
		resetFilters
	} = useYieldsTable({
		data,
		isLoading,
		chains,
		initialColumnOrder,
		initialColumnVisibility,
		initialFilters: savedFilters,
		onColumnsChange: React.useMemo(() => {
			if (!uniqueTableId) return undefined
			return (order: string[], visibility: Record<string, boolean>) => {
				handleTableColumnsChange(uniqueTableId, order, visibility, [])
			}
		}, [handleTableColumnsChange, uniqueTableId]),
		onFiltersChange: React.useMemo(() => {
			if (!uniqueTableId) return undefined
			return (filters: YieldsFilters) => {
				handleTableFiltersChange(uniqueTableId, filters)
			}
		}, [handleTableFiltersChange, uniqueTableId])
	})

	// Register the CSV extractor for this table
	useRegisterCSVExtractor(uniqueTableId || 'yields-table', downloadCSV)

	if (isLoading) {
		return (
			<div className="isolate flex h-full w-full flex-col p-4">
				<YieldsTableHeader
					chains={chains}
					columnPresets={columnPresets}
					applyPreset={applyPreset}
					activePreset={activePreset}
					showColumnPanel={false}
					setShowColumnPanel={() => {}}
					downloadCSV={() => {}}
					poolName=""
					setPoolName={() => {}}
					showFiltersPanel={false}
					setShowFiltersPanel={() => {}}
					activeFilterCount={0}
				/>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading yields data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<YieldsTableHeader
					chains={chains}
					columnPresets={columnPresets}
					applyPreset={applyPreset}
					activePreset={activePreset}
					showColumnPanel={false}
					setShowColumnPanel={() => {}}
					downloadCSV={() => {}}
					poolName=""
					setPoolName={() => {}}
					showFiltersPanel={false}
					setShowFiltersPanel={() => {}}
					activeFilterCount={0}
				/>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load yields data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="isolate flex h-full w-full flex-col p-4">
			<YieldsTableHeader
				chains={chains}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				activePreset={activePreset}
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				downloadCSV={downloadCSV}
				poolName={poolName}
				setPoolName={setPoolName}
				showFiltersPanel={showFiltersPanel}
				setShowFiltersPanel={setShowFiltersPanel}
				activeFilterCount={activeFilterCount}
			/>

			<YieldsColumnManagementPanel
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				currentColumns={currentColumns}
				columnOrder={columnOrder}
				toggleColumnVisibility={toggleColumnVisibility}
				moveColumnUp={moveColumnUp}
				moveColumnDown={moveColumnDown}
			/>

			<YieldsFiltersPanel
				showFiltersPanel={showFiltersPanel}
				setShowFiltersPanel={setShowFiltersPanel}
				filters={filters}
				setFilters={setFilters}
				availableChains={availableChains}
				availableTokens={availableTokens}
				onApplyFilters={applyFilters}
				onResetFilters={resetFilters}
				activeFilterCount={activeFilterCount}
			/>

			<TableBody table={table} />

			<div className="mt-2 flex w-full items-center justify-between">
				<TagGroup
					selectedValue={null}
					setValue={(val) => (val === 'Next' ? table.nextPage() : table.previousPage())}
					values={['Previous', 'Next']}
				/>
				<div className="flex items-center">
					<div className="mr-2 text-xs">Per page</div>
					<TagGroup
						selectedValue={String(pagination.pageSize)}
						values={['10', '30', '50']}
						setValue={(val) => setPagination((prev) => ({ ...prev, pageSize: Number(val), pageIndex: 0 }))}
					/>
				</div>
			</div>
		</div>
	)
}
