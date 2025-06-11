import * as React from 'react'
import { useProTable } from './useProTable'
import { TableHeader } from './TableHeader'
import { ColumnManagementPanel } from './ColumnManagementPanel'
import { TableBody } from './TableBody'
import { TablePagination } from './TablePagination'
import { memo } from 'react'

export const ProtocolsByChainTable = memo(function ProtocolsByChainTable({ chain = 'All', colSpan = 2 }: { chain: string; colSpan?: 1 | 2 }) {
	const {
		table,
		showColumnPanel,
		setShowColumnPanel,
		searchTerm,
		setSearchTerm,
		currentColumns,
		columnOrder,
		addOption,
		toggleColumnVisibility,
		columnPresets,
		applyPreset,
		downloadCSV,
		customColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn
	} = useProTable(chain)

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<TableHeader
				chain={chain}
				columnPresets={columnPresets}
				applyPreset={applyPreset}
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				downloadCSV={downloadCSV}
				colSpan={colSpan}
			/>

			<ColumnManagementPanel
				showColumnPanel={showColumnPanel}
				setShowColumnPanel={setShowColumnPanel}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				currentColumns={currentColumns}
				columnOrder={columnOrder}
				addOption={addOption}
				toggleColumnVisibility={toggleColumnVisibility}
				customColumns={customColumns}
				onAddCustomColumn={addCustomColumn}
				onRemoveCustomColumn={removeCustomColumn}
				onUpdateCustomColumn={updateCustomColumn}
			/>

			<TableBody table={table} />

			<TablePagination table={table} />
		</div>
	)
})
