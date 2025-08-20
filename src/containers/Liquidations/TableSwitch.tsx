 
import * as React from 'react'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TableSwitch = () => {
	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<div className="p-3 flex items-center justify-start">
			<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form) max-sm:w-full">
				<button
					className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
					data-active={!isLiqsShowingInspector}
					onClick={() => toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
				>
					<Icon name="percent" height={14} width={14} />
					<span>Distribution</span>
				</button>
				<button
					className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
					data-active={isLiqsShowingInspector}
					onClick={() => toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
				>
					<Icon name="search" height={14} width={14} />
					<span>Positions</span>
				</button>
			</div>
		</div>
	)
}
