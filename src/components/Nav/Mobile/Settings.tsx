import { useCallback } from 'react'
import { Select, SelectItem, SelectItemCheck, SelectPopover, useSelectState } from 'ariakit/select'
import { PopoverStateRenderCallbackProps } from 'ariakit/popover'
import styled from 'styled-components'
import { Settings as SettingsIcon } from 'react-feather'
import { applyMobileStyles } from '~/components/Popover/utils'
import { useMedia, useNFTApp } from '~/hooks'
import { DARK_MODE, useDarkModeManager, useDefiManager, useNftsManager } from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from '~/components/Filters'
import { nftOptions } from '~/components/Filters/nfts/options'

export function Settings() {
	const [darkMode] = useDarkModeManager()

	const { options, useSettings } = useAppSettings()

	const [enabledOptions, updater] = useSettings()

	const selectedOptions = options
		.map((o) => o.key)
		.filter((key) => enabledOptions[key])
		.concat(darkMode ? [DARK_MODE] : [])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)()
		}
	}

	const isLarge = useMedia('(min-width: 640px)', true)

	const renderCallback = useCallback(
		(props: PopoverStateRenderCallbackProps) => {
			const { popover, defaultRenderCallback } = props
			if (isLarge) return defaultRenderCallback()
			return applyMobileStyles(popover)
		},
		[isLarge]
	)

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		renderCallback
	})

	return (
		<>
			<Trigger state={select}>
				<span className="visually-hidden">Open Settings Menu</span>
				<SettingsIcon height={16} width={16} />
			</Trigger>

			<Popover state={select}>
				{options.map((option) => (
					<Item value={option.key} key={option.key}>
						{option.name}
						<SelectItemCheck />
					</Item>
				))}
				<Item value={DARK_MODE}>
					Dark Mode
					<SelectItemCheck />
				</Item>
			</Popover>
		</>
	)
}

const useAppSettings = () => {
	const isNftApp = useNFTApp()

	if (isNftApp) {
		return { options: nftOptions, useSettings: useNftsManager }
	}

	return { options: protocolsAndChainsOptions, useSettings: useDefiManager }
}

// TODO remove repeated styles
const Trigger = styled(Select)`
	background: #445ed0;
	color: #ffffff;
	padding: 6px 10px;
	border-radius: 8px;
	filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%));
`

const Popover = styled(SelectPopover)`
	display: flex;
	flex-direction: column;
	gap: 16px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg1};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	border-radius: 8px 8px 0 0;
	max-height: calc(100vh - 200px);
	width: 100%;
	max-width: none;
	padding: 10% 0;
	z-index: 1;

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	@media screen and (min-width: 640px) {
		min-height: 0;
		padding: 0;
		max-width: min(calc(100vw - 16px), 320px);
		border-radius: 8px;
	}
`

const Item = styled(SelectItem)`
	padding: 8px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	min-width: 160px;
`
