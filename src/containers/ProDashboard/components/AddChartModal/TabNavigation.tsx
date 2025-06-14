import { MainTabType } from './types'
import { DashboardItemConfig } from '../../types'

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
}

export function TabNavigation({ selectedMainTab, editItem, onTabChange }: TabNavigationProps) {
	const tabs = [
		{ id: 'chart' as const, label: 'Chart', subtitle: '(Single)' },
		{ id: 'composer' as const, label: 'Chart Composer', subtitle: '(Multi)' },
		{ id: 'table' as const, label: 'Table', subtitle: '(Dataset)' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)' },
	]

	return (
		<div className="grid grid-cols-4 gap-0 mb-6">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					className={`px-4 py-3 text-sm font-medium border transition-colors duration-200 ${
						selectedMainTab === tab.id
							? 'border-[var(--primary1)] bg-[var(--primary1)] text-white'
							: 'pro-border pro-hover-bg pro-text2'
					}`}
					onClick={() => !editItem && onTabChange(tab.id)}
					disabled={!!editItem}
				>
					{tab.label} <span className="pro-text3">{tab.subtitle}</span>
				</button>
			))}
		</div>
	)
}