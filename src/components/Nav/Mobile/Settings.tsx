import { Select, SelectItem, SelectItemCheck, SelectPopover, useSelectState } from 'ariakit/select'
import styled from 'styled-components'
import { Settings as SettingsIcon } from 'react-feather'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { DARK_MODE, useDarkModeManager, useDefiManager, useNftsManager } from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from '~/components/Filters'
import { nftOptions } from '~/components/Filters/nfts/options'
import { useRouter } from 'next/router'

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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		animated: true,
		renderCallback
	})

	return (
		<>
			<Trigger state={select}>
				<span className="visually-hidden">Open Settings Menu</span>
				<SettingsIcon height={16} width={16} />
			</Trigger>

			<Popover state={select} modal={!isLarge}>
				<PopoverHeader>Settings</PopoverHeader>
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
	const router = useRouter()

	if (router.pathname.startsWith('/yields')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/stablecoin')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/liquidations')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/dex')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/raises')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/hacks')) {
		return { options: [], useSettings: useDefiManager }
	}

	if (router.pathname.startsWith('/nfts')) {
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
	box-shadow: ${({ theme }) => theme.shadow};
`

const Popover = styled(SelectPopover)`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 8px;
	width: 100%;
	max-width: none;
	max-height: calc(100vh - 200px);
	font-size: 0.875rem;
	font-weight: 500;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg1};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	border-radius: 8px 8px 0 0;
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	overflow: auto;
	overscroll-behavior: contain;
	z-index: 10;

	opacity: 0;
	transform: translateY(100%);
	transition: 0.2s ease;

	&[data-enter] {
		transform: translateY(0%);
		opacity: 1;
	}

	&[data-leave] {
		transition: 0.1s ease;
	}

	:focus-visible,
	[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	@media screen and (min-width: 640px) {
		padding: 4px 0;
		max-height: 400px;
		max-width: min(calc(100vw - 16px), 320px);
		font-weight: 400;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
		border-radius: 8px;
		transform: translateY(-5%);
	}
`

const PopoverHeader = styled.div`
	color: ${({ theme }) => theme.text2};
	margin: 8px 12px 4px;
	padding-bottom: 4px;
	border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};

	@media screen and (min-width: 640px) {
		display: none;
	}
`

const Item = styled(SelectItem)`
	padding: 8px 12px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	min-width: 160px;

	@media screen and (min-width: 640px) {
		padding: 8px 12px;
	}
`
