import type { ExpandedState, PaginationState, SortingState } from '@tanstack/react-table'
import type { IParentProtocol, IFormattedProtocol } from '~/containers/Protocols/protocol-table.types'
import type { TableFilters } from '../../types'

export interface IProtocolRow extends IFormattedProtocol {
	subRows?: IProtocolRow[]
}

export interface ProTableDimensionProtocol {
	name?: string
	displayName?: string
	category?: string
	chains?: string[]
	total24h?: number | null
	total7d?: number | null
	total30d?: number | null
	total1y?: number | null
	totalAllTime?: number | null
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	change_7dover7d?: number | null
	change_30dover30d?: number | null
	revenue24h?: number | null
	revenue7d?: number | null
	revenue30d?: number | null
	revenue1y?: number | null
	average1y?: number | null
	averageRevenue1y?: number | null
	monthlyAverage1y?: number | null
	holdersRevenue24h?: number | null
	holdersRevenue30d?: number | null
	dailyProtocolRevenue?: number | null
	dailySupplySideRevenue?: number | null
	dailyUserFees?: number | null
	feesChange_1d?: number | null
	feesChange_7d?: number | null
	feesChange_1m?: number | null
	feesChange_7dover7d?: number | null
	feesChange_30dover30d?: number | null
	revenueChange_1d?: number | null
	revenueChange_7d?: number | null
	revenueChange_1m?: number | null
	revenueChange_7dover7d?: number | null
	revenueChange_30dover30d?: number | null
	holdersRevenueChange_7dover7d?: number | null
	holdersRevenueChange_30dover30d?: number | null
	pf?: number | null
	ps?: number | null
	chainBreakdown?: Record<string, unknown>
}

export interface CustomColumn {
	id: string
	name: string
	expression: string
	isValid: boolean
	errorMessage?: string
}

export interface ColumnPresetDefinition {
	id: string
	label: string
	columns: string[]
	sort?: SortingState
	group?: 'core' | 'dataset'
	description?: string
	icon?: string
}

export interface UseProTableOptions {
	initialColumnOrder?: string[]
	initialColumnVisibility?: Record<string, boolean>
	initialCustomColumns?: CustomColumn[]
	initialActiveViewId?: string
	initialActivePresetId?: string
	onColumnsChange?: (
		columnOrder: string[],
		columnVisibility: Record<string, boolean>,
		customColumns: CustomColumn[],
		activeViewId?: string,
		activePresetId?: string
	) => void
}

export interface ProtocolWithSubRows extends IProtocolRow {
	isParentProtocol?: boolean
}

export interface ProTableState {
	sorting: SortingState
	pagination: PaginationState
	expanded: ExpandedState
	showColumnPanel: boolean
	searchTerm: string
	columnOrder: string[]
	columnVisibility: Record<string, boolean>
	customColumns: CustomColumn[]
	selectedPreset: string | null
	activeCustomView: string | null
	activeDatasetMetric: string | null
}

export interface ProTableStateInit {
	options?: UseProTableOptions
	defaultSorting: SortingState
	defaultPreset?: ColumnPresetDefinition
	initialKnownColumnIds: string[]
}

export type ProTableAction =
	| { type: 'setSorting'; sorting: SortingState }
	| { type: 'setPagination'; pagination: PaginationState }
	| { type: 'setExpanded'; expanded: ExpandedState }
	| { type: 'setShowColumnPanel'; show: boolean }
	| { type: 'setSearchTerm'; value: string }
	| { type: 'setColumnOrder'; columnOrder: string[] }
	| { type: 'setColumnVisibility'; columnVisibility: Record<string, boolean> }
	| { type: 'setCustomColumns'; customColumns: CustomColumn[] }
	| { type: 'setSelectedPreset'; selectedPreset: string | null }
	| { type: 'setActiveCustomView'; activeCustomView: string | null }
	| { type: 'setActiveDatasetMetric'; activeDatasetMetric: string | null }
	| {
			type: 'applyPreset'
			presetId: string
			presetColumns: string[]
			presetSorting: SortingState
			columnVisibility: Record<string, boolean>
			activeDatasetMetric: string | null
	  }
	| {
			type: 'loadCustomView'
			viewId: string
			columnOrder: string[]
			columnVisibility: Record<string, boolean>
			customColumns: CustomColumn[]
	  }
	| {
			type: 'removeCustomColumn'
			columnId: string
	  }
	| {
			type: 'addCustomColumn'
			column: CustomColumn
	  }
	| {
			type: 'updateCustomColumn'
			columnId: string
			updates: Partial<CustomColumn>
	  }
	| {
			type: 'setColumnVisibilityAndOrder'
			columnVisibility: Record<string, boolean>
			columnOrder: string[]
	  }

export interface UseProTableDataResult {
	finalProtocolsList: IProtocolRow[]
	isLoading: boolean
	isEmptyProtocols: boolean
	categories: string[]
	availableProtocols: IProtocolRow[]
	parentProtocols: IParentProtocol[]
}

export interface UseProTableDataParams {
	chains: string[]
	filters?: TableFilters
}
