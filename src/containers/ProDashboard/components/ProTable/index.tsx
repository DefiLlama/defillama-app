import * as React from 'react'
import { memo, useMemo, useState } from 'react'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { TableFilters } from '../../types'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { ProtocolFilterModal } from './ProtocolFilterModal'
import { TableBody } from './TableBody'
import { TableHeader } from './TableHeader'
import { TablePagination } from './TablePagination'
import { useProTable } from './useProTable'

export const ProtocolsByChainTable = memo(function ProtocolsByChainTable({
	tableId,
	chains = ['All'],
	colSpan = 2,
	filters,
	columnOrder,
	columnVisibility,
	customColumns,
	activeViewId
}: {
	tableId: string
	chains: string[]
	colSpan?: 1 | 2
	filters?: TableFilters
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	customColumns?: any[]
	activeViewId?: string
}) {
	const { handleTableFiltersChange, handleTableColumnsChange } = useProDashboard()
	const [showFilterModal, setShowFilterModal] = useState(false)
	const memoizedChains = useMemo(() => chains, [chains.join(',')])
	const proDashboardElement = typeof window !== 'undefined' ? document.querySelector('.pro-dashboard') : null

	const {
		table,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder: currentColumnOrder,
		addOption,
		toggleColumnVisibility,
		moveColumnUp,
		moveColumnDown,
		columnPresets,
		applyPreset,
		activePreset,
		downloadCSV,
		isCSVLoading,
		customColumns: currentCustomColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols,
		customViews: currentCustomViews,
		saveCustomView,
		deleteCustomView,
		loadCustomView
	} = useProTable(memoizedChains, filters, () => setShowFilterModal(true), {
		initialColumnOrder: columnOrder,
		initialColumnVisibility: columnVisibility,
		initialCustomColumns: customColumns,
		initialActiveViewId: activeViewId,
		onColumnsChange: (newColumnOrder, newColumnVisibility, newCustomColumns, newActiveViewId) => {
			handleTableColumnsChange(tableId, newColumnOrder, newColumnVisibility, newCustomColumns, newActiveViewId)
		}
	})

	const handleFiltersChange = (newFilters: TableFilters) => {
		handleTableFiltersChange(tableId, newFilters)
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-2 sm:p-4">
			<TableHeader
				chains={chains}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				activePreset={activePreset}
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				downloadCSV={downloadCSV}
				isCSVLoading={isCSVLoading}
				colSpan={colSpan}
				customViews={currentCustomViews}
				onSaveView={saveCustomView}
				onLoadView={loadCustomView}
				onDeleteView={deleteCustomView}
				currentColumns={currentColumns}
				columnOrder={currentColumnOrder}
				customColumns={currentCustomColumns}
			/>

			<ColumnManagementPanel
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				currentColumns={currentColumns}
				columnOrder={currentColumnOrder}
				addOption={addOption}
				toggleColumnVisibility={toggleColumnVisibility}
				moveColumnUp={moveColumnUp}
				moveColumnDown={moveColumnDown}
				customColumns={currentCustomColumns}
				onAddCustomColumn={addCustomColumn}
				onRemoveCustomColumn={removeCustomColumn}
				onUpdateCustomColumn={updateCustomColumn}
				customViews={currentCustomViews}
				onLoadView={loadCustomView}
				onDeleteView={deleteCustomView}
				activeViewId={activePreset}
			/>

			<TableBody table={table} moveColumnUp={moveColumnUp} moveColumnDown={moveColumnDown} />

			<TablePagination table={table} />

			{proDashboardElement && (
				<ProtocolFilterModal
					isOpen={showFilterModal}
					onClose={() => setShowFilterModal(false)}
					protocols={availableProtocols}
					categories={categories}
					currentFilters={filters || {}}
					onFiltersChange={handleFiltersChange}
					portalTarget={proDashboardElement as HTMLElement}
				/>
			)}
		</div>
	)
})
