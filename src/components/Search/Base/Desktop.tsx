import * as React from 'react'
import { Combobox, ComboboxItem, ComboboxPopover, ComboboxState, useComboboxState } from 'ariakit/combobox'
import { findActiveItem } from './utils'
import type { IBaseSearchProps } from '../types'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'

export const DesktopSearch = (props: IBaseSearchProps) => {
	const {
		data,
		loading = false,
		step,
		onSearchTermChange,
		filters,
		withValue,
		placeholder = 'Search...',
		value,
		className,
		...extra
	} = props

	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		...(value && { defaultValue: value }),
		list: data.map((x) => x.name)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	// Resets combobox value when popover is collapsed
	if (!withValue && !combobox.mounted && combobox.value) {
		combobox.setValue('')
		if (onSearchTermChange) {
			onSearchTermChange('')
		}
	}

	const [resultsLength, setResultsLength] = React.useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	const sortedList = combobox.value.length > 2 ? sortResults(combobox.matches) : combobox.matches

	const options = sortedList.map((o) => data.find((x) => x.name === o) ?? o)

	return (
		<div className="relative hidden lg:flex flex-col rounded-md shadow data-[alwaysdisplay=true]:flex" {...extra}>
			<Input state={combobox} placeholder={placeholder} withValue={withValue} onSearchTermChange={onSearchTermChange} />

			{filters ? (
				<span className="flex items-center justify-end rounded-b-md bg-[#fafafa] dark:bg-[#090a0b] p-3 min-h-[48px]">
					{filters}
				</span>
			) : null}

			{combobox.mounted ? (
				<ComboboxPopover
					className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10"
					state={combobox}
				>
					{loading || !combobox.mounted ? (
						<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
					) : combobox.matches.length ? (
						<>
							{options.slice(0, resultsLength + 1).map((token) => (
								<Row key={token.name} onItemClick={props.onItemClick} data={token} state={combobox} />
							))}

							{resultsLength < sortedList.length ? (
								<button
									className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
									onClick={showMoreResults}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</ComboboxPopover>
			) : null}
		</div>
	)
}

const sortResults = (results: string[]) => {
	const { pools, tokens } = results.reduce(
		(acc, curr) => {
			if (curr.startsWith('Show all')) {
				acc.pools.push(curr)
			} else acc.tokens.push(curr)
			return acc
		},
		{ tokens: [], pools: [] }
	)

	return [...pools, ...tokens]
}

interface IInputProps {
	state: ComboboxState
	placeholder: string
	autoFocus?: boolean
	withValue?: boolean
	variant?: 'primary' | 'secondary'
	hideIcon?: boolean
	onSearchTermChange?: (value: string) => void
}

function Input({
	state,
	placeholder,
	withValue,

	hideIcon,
	onSearchTermChange
}: IInputProps) {
	const inputField = React.useRef<HTMLInputElement>()

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
				e.preventDefault()
				inputField.current && inputField.current?.focus()
				state.toggle()
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [state])

	const onClick = React.useCallback(() => {
		if (state.mounted && withValue) {
			state.setValue('')
		}

		state.toggle()
	}, [withValue, state])

	return (
		<>
			{!hideIcon ? (
				<button onClick={onClick} className="absolute top-[14px] left-3 opacity-50">
					{state.mounted ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={20} width={20} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={18} width={18} />
						</>
					)}
				</button>
			) : null}

			<Combobox
				state={state}
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="p-3 pl-9 rounded-t-md text-base bg-white text-black dark:bg-black dark:text-white"
			/>

			{!hideIcon ? (
				<span className="absolute top-2 right-3 bg-[#f5f5f5] dark:bg-[#151515] text-[var(--link)] font-medium p-[6px] rounded-md">
					⌘K
				</span>
			) : null}
		</>
	)
}

const Row = ({ data, onItemClick, state }) => {
	const [loading, setLoading] = React.useState(false)
	const router = useRouter()

	return (
		<ComboboxItem
			value={data.name}
			onClick={(e) => {
				if (onItemClick) {
					onItemClick(data)
				} else if (e.ctrlKey || e.metaKey) {
					window.open(data.route)
				} else {
					setLoading(true)
					router.push(data.route).then(() => {
						setLoading(false)
						state.hide()
					})
				}
			}}
			focusOnHover
			hideOnClick={false}
			setValueOnClick={false}
			disabled={loading}
			className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
		>
			{data?.logo || data?.fallbackLogo ? <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} /> : null}
			<span>{data.name}</span>
			{loading ? (
				<svg
					className="animate-spin -ml-1 mr-3 h-4 w-4"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}
		</ComboboxItem>
	)
}
