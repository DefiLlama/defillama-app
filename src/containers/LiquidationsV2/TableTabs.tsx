type Tab<T extends string> = {
	id: T
	label: string
}

interface LiquidationsTableTabsProps<T extends string> {
	tabs: ReadonlyArray<Tab<T>>
	activeTab: T
	setActiveTab: (id: T) => void
}

export function LiquidationsTableTabs<T extends string>({
	tabs,
	activeTab,
	setActiveTab
}: LiquidationsTableTabsProps<T>) {
	return (
		<div className="flex items-center overflow-x-auto" role="tablist">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					tabIndex={activeTab === tab.id ? 0 : -1}
					className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
					data-active={activeTab === tab.id}
					onClick={() => setActiveTab(tab.id)}
				>
					{tab.label}
				</button>
			))}
		</div>
	)
}
