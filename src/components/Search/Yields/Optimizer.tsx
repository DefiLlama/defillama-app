import * as React from 'react'
import { useRouter } from 'next/router'
import { Combobox, ComboboxItem, ComboboxPopover, ComboboxState, useComboboxState } from 'ariakit/combobox'
import { findActiveItem } from '../Base/utils'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'

export function YieldsSearch({ lend = false, searchData, value }) {
	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		...(value && { defaultValue: value }),
		list: Object.keys(searchData)
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	const [resultsLength, setResultsLength] = React.useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	return (
		<div className="relative flex flex-col rounded-md">
			<Input state={combobox} placeholder={lend ? 'Collateral Token' : 'Token to Borrow'} withValue />
			<ComboboxPopover
				className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10"
				state={combobox}
			>
				{!combobox.mounted ? (
					<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
				) : combobox.matches.length ? (
					<>
						{combobox.matches.slice(0, resultsLength + 1).map((pool) => (
							<Row key={pool} name={pool} data={searchData[pool]} state={combobox} lend={lend} />
						))}

						{resultsLength < combobox.matches.length ? (
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
		</div>
	)
}

interface IInputProps {
	state: ComboboxState
	placeholder: string
	autoFocus?: boolean
	withValue?: boolean
	hideIcon?: boolean
	onSearchTermChange?: (value: string) => void
}

function Input({ state, placeholder, withValue, hideIcon, onSearchTermChange }: IInputProps) {
	const inputField = React.useRef<HTMLInputElement>()

	const onClick = React.useCallback(() => {
		if (state.mounted && withValue) {
			state.setValue('')
		}

		state.toggle()
	}, [withValue, state])

	return (
		<>
			{!hideIcon && (
				<button onClick={onClick} className="absolute top-[10px] left-[6px] opacity-50">
					{state.mounted ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={18} width={18} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={16} width={16} />
						</>
					)}
				</button>
			)}

			<Combobox
				state={state}
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="p-2 pl-8 rounded-md text-sm bg-white text-black dark:bg-[#22242a] dark:text-white"
			/>
		</>
	)
}

const Row = ({ name, data, state, lend }) => {
	const [loading, setLoading] = React.useState(false)
	const router = useRouter()

	const { lend: lendQuery, borrow, ...queryParams } = router.query

	const [targetParam, restParam] = lend ? ['lend', 'borrow'] : ['borrow', 'lend']

	return (
		<ComboboxItem
			value={name}
			onClick={() => {
				setLoading(true)
				router
					.push(
						{
							pathname: router.pathname,
							query: {
								[targetParam]: data.symbol,
								[restParam]: router.query[restParam] || '',
								...queryParams
							}
						},
						undefined,
						{ shallow: true }
					)
					.then(() => {
						setLoading(false)
						state.hide()
					})
			}}
			focusOnHover
			disabled={loading}
			className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
		>
			{data?.logo || data?.fallbackLogo ? <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} /> : null}
			<span>{name}</span>
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
