/* eslint-disable no-unused-vars*/
import * as React from 'react'
import { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES, useBridgesManager } from '~/contexts/LocalStorage'
import { Icon } from '~/components/Icon'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	return (
		<div className="flex items-center gap-2 rounded-md h-11 w-64 bg-[var(--bg6)] mx-auto p-[6px]">
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={!isBridgesShowingTxs}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="bar-chart-2" height={14} width={14} />
				<span>Bridges</span>
			</button>
			<button
				className="flex flex-1 justify-center items-center gap-1 rounded-md p-[6px] data-[active=true]:bg-[#445ed0]"
				data-active={isBridgesShowingTxs}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
			>
				<Icon name="activity" height={14} width={14} />
				<span>Large Txs</span>
			</button>
		</div>
	)
}

export const AddressesTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useBridgesManager()
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	return (
		<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] ml-auto">
			<button
				data-active={!isBridgesShowingAddresses}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex items-center gap-2 rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
			>
				<Icon name="trending-up" height={14} width={14} />
				<span>Tokens</span>
			</button>
			<button
				data-active={isBridgesShowingAddresses}
				onClick={toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex items-center gap-2 rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
			>
				<Icon name="users" height={14} width={14} />
				<span>Addresses</span>
			</button>
		</div>
	)
}
