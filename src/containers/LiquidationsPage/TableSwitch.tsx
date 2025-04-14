/* eslint-disable no-unused-vars*/
import * as React from 'react'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TableSwitch = () => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<div className="p-3 flex items-center justify-start">
			<div className="text-sm font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
				<button
					className="flex items-center gap-1 flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					data-active={!isLiqsShowingInspector}
					onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
				>
					<Icon name="percent" height={14} width={14} />
					<span>Distribution</span>
				</button>
				<button
					className="flex items-center gap-1 flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
					data-active={isLiqsShowingInspector}
					onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
				>
					<Icon name="search" height={14} width={14} />
					<span>Positions</span>
				</button>
			</div>
		</div>
	)
}
