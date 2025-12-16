import { createContext, useContext } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import type { CustomColumnDefinition, TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { useUnifiedTableWizard } from './hooks/useUnifiedTableWizard'

interface WizardContextValue {
	state: {
		chains: string[]
		rowHeaders: UnifiedRowHeaderType[]
		filters: TableFilters
		activePresetId: string
		columnOrder: ColumnOrderState
		columnVisibility: VisibilityState
		sorting: SortingState
		customColumns: CustomColumnDefinition[]
	}
	actions: ReturnType<typeof useUnifiedTableWizard>['actions']
	derived: ReturnType<typeof useUnifiedTableWizard>['derived']
}

const WizardContext = createContext<WizardContextValue | null>(null)

export const UnifiedTableWizardProvider = ({
	children,
	initialConfig
}: {
	children: React.ReactNode
	initialConfig?: UnifiedTableConfig | null
}) => {
	const wizard = useUnifiedTableWizard(initialConfig?.activePresetId, initialConfig ?? undefined)

	return <WizardContext.Provider value={wizard}>{children}</WizardContext.Provider>
}

export const useUnifiedTableWizardContext = () => {
	const ctx = useContext(WizardContext)
	if (!ctx) {
		throw new Error('useUnifiedTableWizardContext must be used inside UnifiedTableWizardProvider')
	}
	return ctx
}
