import { Combobox, ComboboxItem, ComboboxPopover, ComboboxState, useComboboxState } from 'ariakit/combobox'
import { findActiveItem } from '../Base/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { useRouter } from 'next/router'

export function RaisesSearch({ list }) {
	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list
	})

	// select first item on open
	const item = findActiveItem(combobox)
	const firstId = combobox.first()

	if (combobox.open && !item && firstId) {
		combobox.setActiveId(firstId)
	}

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	return (
		<div className="relative flex flex-col rounded-md">
			<Input state={combobox} placeholder="Search investors..." withValue />
			{combobox.mounted ? (
				<ComboboxPopover
					className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10"
					state={combobox}
				>
					{!combobox.mounted ? (
						<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
					) : combobox.matches.length ? (
						<>
							{combobox.matches.slice(0, resultsLength + 1).map((investor) => (
								<Row key={investor} name={investor} state={combobox} />
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
			) : null}
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
	const inputField = useRef<HTMLInputElement>()

	useEffect(() => {
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

	const onClick = useCallback(() => {
		if (state.mounted && withValue) {
			state.setValue('')
		}

		state.toggle()
	}, [withValue, state])

	return (
		<>
			{!hideIcon && (
				<button onClick={onClick} className="absolute top-2 left-[6px]">
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
			)}

			<Combobox
				state={state}
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="p-[6px] pl-8 rounded-md text-base bg-[#eaeaea] text-black dark:bg-[#22242a] dark:text-white"
			/>

			<span className="absolute top-1 right-1 bg-[#f5f5f5] dark:bg-[#151515] text-[var(--link)] font-medium p-1 rounded-md">
				⌘K
			</span>
		</>
	)
}

const Row = ({ name, state }) => {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	return (
		<ComboboxItem
			value={name}
			onClick={(e) => {
				setLoading(true)

				router.push(`/raises/${slug(name.toLowerCase())}`).then(() => {
					setLoading(false)
					state.hide()
				})
			}}
			focusOnHover
			hideOnClick={false}
			setValueOnClick={false}
			disabled={loading}
			className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
		>
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
