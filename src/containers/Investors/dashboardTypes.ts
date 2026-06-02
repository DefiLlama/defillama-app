import type { ComponentType, LazyExoticComponent } from 'react'

export interface DashboardTabConfig {
	id: string
	label: string
	component?: LazyExoticComponent<ComponentType> | ComponentType
	proDashboardId?: string
	source?: string
	group?: string
	/**
	 * When set, this tab is rendered as an external link that opens the given URL
	 * in a new tab (instead of switching to in-app content). Used e.g. to point the
	 * Treasury tab at a third-party treasury explorer. The tab's `component` is kept
	 * so the in-app view can be re-enabled later by removing `externalHref`.
	 */
	externalHref?: string
	/** Tooltip shown on an external-link tab (e.g. "Opens Octav in a new tab"). */
	externalTooltip?: string
}

export interface DashboardModule {
	tabs: DashboardTabConfig[]
	header?: LazyExoticComponent<ComponentType>
}
