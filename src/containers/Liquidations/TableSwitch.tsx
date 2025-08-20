import * as React from 'react'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TableSwitch = () => {
	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<div className="flex items-center justify-start p-3">
			<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
				<button
					className="inline-flex shrink-0 items-center justify-center px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
					data-active={!isLiqsShowingInspector}
					onClick={() => toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
				>
					<Icon name="percent" height={14} width={14} />
					<span>Distribution</span>
				</button>
				<button
					className="inline-flex shrink-0 items-center justify-center px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
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
