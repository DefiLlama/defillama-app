'use no memo'
import { useCallback, useMemo, useState } from 'react'
import { useProDashboardEditorActions } from '../../ProDashboardAPIContext'
import type { TableFilters } from '../../types'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import type { CustomColumn } from './proTable.types'
import { ProtocolFilterModal } from './ProtocolFilterModal'
import { TableBody } from './TableBody'
import { TableHeader } from './TableHeader'
import { TablePagination } from './TablePagination'
import { useProTable } from './useProTable'

export function ProtocolsByChainTable({
	tableId,
	chains = ['All'],
	colSpan = 2,
	filters,
	columnOrder,
	columnVisibility,
	customColumns,
	activeViewId,
	activePresetId
}: {
	tableId: string
	chains: string[]
	colSpan?: 1 | 2
	filters?: TableFilters
	columnOrder?: string[]
	columnVisibility?: Record<string, boolean>
	customColumns?: CustomColumn[]
	activeViewId?: string
	activePresetId?: string
}) {
	const { handleTableFiltersChange, handleTableColumnsChange } = useProDashboardEditorActions()
	const [showFilterModal, setShowFilterModal] = useState(false)
	const portalTarget = useMemo(() => {
		if (typeof window === 'undefined') return null
		const proDashboardElement = document.querySelector('.pro-dashboard')
		return proDashboardElement instanceof HTMLElement ? proDashboardElement : null
	}, [])

	const handleColumnsChange = useCallback(
		(
			newColumnOrder: string[],
			newColumnVisibility: Record<string, boolean>,
			newCustomColumns?: CustomColumn[],
			newActiveViewId?: string,
			newActivePresetId?: string
		) => {
			handleTableColumnsChange(
				tableId,
				newColumnOrder,
				newColumnVisibility,
				newCustomColumns,
				newActiveViewId,
				newActivePresetId
			)
		},
		[handleTableColumnsChange, tableId]
	)

	const {
		table,
		isLoading,
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
		customColumns: currentCustomColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols,
		parentProtocols,
		customViews: currentCustomViews,
		saveCustomView,
		deleteCustomView,
		loadCustomView
	} = useProTable(chains, filters, () => setShowFilterModal(true), {
		initialColumnOrder: columnOrder,
		initialColumnVisibility: columnVisibility,
		initialCustomColumns: customColumns,
		initialActiveViewId: activeViewId,
		initialActivePresetId: activePresetId,
		onColumnsChange: handleColumnsChange
	})

	const handleFiltersChange = useCallback(
		(newFilters: TableFilters) => {
			handleTableFiltersChange(tableId, newFilters)
		},
		[handleTableFiltersChange, tableId]
	)

	const handleCloseFilterModal = useCallback(() => {
		setShowFilterModal(false)
	}, [])

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
				colSpan={colSpan}
				customViews={currentCustomViews}
				onSaveView={saveCustomView}
				onLoadView={loadCustomView}
				onDeleteView={deleteCustomView}
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

			<TableBody table={table} isLoading={isLoading} moveColumnUp={moveColumnUp} moveColumnDown={moveColumnDown} />

			<TablePagination table={table} />

			{portalTarget ? (
				<ProtocolFilterModal
					isOpen={showFilterModal}
					onClose={handleCloseFilterModal}
					protocols={availableProtocols}
					parentProtocols={parentProtocols}
					categories={categories}
					currentFilters={filters || {}}
					onFiltersChange={handleFiltersChange}
					portalTarget={portalTarget}
				/>
			) : null}
		</div>
	)
}
