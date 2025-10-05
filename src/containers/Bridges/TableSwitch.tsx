import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { BRIDGES_SHOWING_ADDRESSES, BRIDGES_SHOWING_TXS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

export const TxsTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	// First variant

	// return (
	// 	<div className="flex w-full flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) sm:w-fit">
	// 		<button
	// 			className="flex flex-1 shrink-0 items-center justify-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white sm:flex-none"
	// 			data-active={!isBridgesShowingTxs}
	// 			onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
	// 		>
	// 			<Icon name="bar-chart-2" height={14} width={14} />
	// 			<span>Bridges</span>
	// 		</button>
	// 		<button
	// 			className="flex flex-1 shrink-0 items-center justify-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white sm:flex-none"
	// 			data-active={isBridgesShowingTxs}
	// 			onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
	// 		>
	// 			<Icon name="activity" height={14} width={14} />
	// 			<span>Large Txs</span>
	// 		</button>
	// 	</div>
	// )

	// Second variant

	return (
		<Switch
			label="Large Txs"
			value="large txs"
			checked={isBridgesShowingTxs}
			onChange={() => toggleBridgesSettings(BRIDGES_SHOWING_TXS)}
		/>
	)
}

export const AddressesTableSwitch = () => {
	const [bridgesSettings, toggleBridgesSettings] = useLocalStorageSettingsManager('bridges')
	const isBridgesShowingAddresses = bridgesSettings[BRIDGES_SHOWING_ADDRESSES]

	return (
		<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			<button
				data-active={!isBridgesShowingAddresses}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex shrink-0 items-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
			>
				<Icon name="trending-up" height={14} width={14} />
				<span>Tokens</span>
			</button>
			<button
				data-active={isBridgesShowingAddresses}
				onClick={() => toggleBridgesSettings(BRIDGES_SHOWING_ADDRESSES)}
				className="flex shrink-0 items-center gap-1 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
			>
				<Icon name="users" height={14} width={14} />
				<span>Addresses</span>
			</button>
		</div>
	)
}
