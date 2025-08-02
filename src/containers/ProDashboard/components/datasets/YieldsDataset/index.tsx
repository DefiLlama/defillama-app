import * as React from 'react'
import { LoadingSpinner } from '../../LoadingSpinner'
import { useYieldsData } from './useYieldsData'
import { TagGroup } from '~/components/TagGroup'
import { useYieldsTable } from './useYieldsTable'
import { YieldsTableHeader } from './YieldsTableHeader'
import { YieldsColumnManagementPanel } from './YieldsColumnManagementPanel'
import { YieldsFiltersPanel } from './YieldsFiltersPanel'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import { TableBody } from '../../ProTable/TableBody'
import { YieldsFilters } from './YieldsFiltersPanel'

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

	if (isLoading) {
		return (
			<div className="w-full p-4 h-full flex flex-col isolate">
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
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading yields data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
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
				<div className="flex-1 min-h-[500px] flex items-center justify-center">
					<div className="text-center pro-text2">Failed to load yields data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col isolate">
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

			<div className="flex items-center justify-between w-full mt-2">
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
