import { MainTabType } from './types'
import { DashboardItemConfig } from '../../types'

interface TabNavigationProps {
	selectedMainTab: MainTabType
	editItem?: DashboardItemConfig | null
	onTabChange: (tab: MainTabType) => void
}

export function TabNavigation({ selectedMainTab, editItem, onTabChange }: TabNavigationProps) {
	const tabs = [
		{ id: 'chart' as const, label: 'Chart', subtitle: '(Single)', mobileLabel: 'Chart' },
		{ id: 'composer' as const, label: 'Chart Composer', subtitle: '(Multi)', mobileLabel: 'Composer' },
		{ id: 'builder' as const, label: 'Chart Builder', mobileLabel: 'Builder' },
		{ id: 'table' as const, label: 'Table', subtitle: '(Dataset)', mobileLabel: 'Table' },
		{ id: 'text' as const, label: 'Text', subtitle: '(Markdown)', mobileLabel: 'Text' }
	]

	return (
		<div className="grid grid-cols-5 gap-0 mb-4 md:mb-6">
			{tabs.map((tab, index) => (
				<button
					key={tab.id}
					className={`px-2 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border transition-colors duration-200 ${
						selectedMainTab === tab.id
							? 'border-(--primary) bg-(--primary) text-white'
							: 'pro-border pro-hover-bg pro-text2'
					}`}
					onClick={() => !editItem && onTabChange(tab.id)}
					disabled={!!editItem}
				>
					<span className="lg:hidden">{tab.mobileLabel}</span>
					<span className="hidden lg:inline">{tab.label}</span>
				</button>
			))}
		</div>
	)
}
