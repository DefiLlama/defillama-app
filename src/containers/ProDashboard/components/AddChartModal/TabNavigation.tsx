import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { DashboardItemConfig } from '../../types'
import { MainTabType } from './types'

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
}

export function TabNavigation({ selectedMainTab, editItem, onTabChange }: TabNavigationProps) {
	const { hasFeature } = useFeatureFlagsContext()
	const isLlamaEnabled = hasFeature('is_llama')

	const allTabs = [
		{ id: 'charts' as const, label: 'Charts', subtitle: '', mobileLabel: 'Charts' },
		{ id: 'metric' as const, label: 'Metric', mobileLabel: 'Metric' },
		{ id: 'table' as const, label: 'Table', subtitle: '(Dataset)', mobileLabel: 'Table' },
		{ id: 'unified-table' as const, label: 'ProTable', mobileLabel: 'ProTable' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)', mobileLabel: 'Text' }
	]

	const tabs = isLlamaEnabled ? allTabs : allTabs.filter((tab) => tab.id !== 'unified-table')
	const gridColsClass = tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'

	return (
		<div className={`grid ${gridColsClass} gap-0`}>
			{tabs.map((tab, index) => (
				<button
					key={tab.id}
					className={`-ml-px rounded-none border px-2 py-2.5 text-xs font-medium transition-colors duration-200 first:ml-0 first:rounded-l-md last:rounded-r-md md:px-2 md:py-3 md:text-sm ${
						selectedMainTab === tab.id ? 'pro-border pro-btn-blue' : 'pro-border pro-text2 pro-hover-bg hover:pro-text1'
					}`}
					onClick={() => !editItem && onTabChange(tab.id)}
					disabled={!!editItem}
				>
					<span className="lg:hidden">{tab.mobileLabel}</span>
					<span className="hidden lg:inline">
						{tab.label}
						{tab.subtitle && <span className="text-xs opacity-70"> {tab.subtitle}</span>}
					</span>
				</button>
			))}
		</div>
	)
}
