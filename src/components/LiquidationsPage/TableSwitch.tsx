/* eslint-disable no-unused-vars*/
import * as React from 'react'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TableSwitch = () => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<div className="flex items-center gap-2 rounded-md h-11 w-64 bg-[var(--bg6)] mx-auto p-[6px]">
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={!isLiqsShowingInspector}
				onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
			>
				<Icon name="percent" height={14} width={14} />
				<span>Distribution</span>
			</button>
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={isLiqsShowingInspector}
				onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}
			>
				<Icon name="search" height={14} width={14} />
				<span>Positions</span>
			</button>
		</div>
	)
}
