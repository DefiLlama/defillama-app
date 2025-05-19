import * as React from 'react'
import type { IBaseSearchProps } from '../types'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Tooltip } from '~/components/Tooltip'

export const DesktopSearch = (props: IBaseSearchProps) => {
	const {
		data,
		loading = false,
		onSearchTermChange,
		filters,
		placeholder = 'Search...',
		value,
		className,
		variant,
		skipSearching,
		...extra
	} = props

	const [searchValue, setSearchValue] = React.useState('')

	const matches = React.useMemo(() => {
		if (skipSearching) return data || []
		return matchSorter(data || [], searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [data, searchValue, skipSearching])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const [open, setOpen] = React.useState(false)

	return (
		<div
			className={`relative hidden lg:flex items-center justify-between gap-4 data-[alwaysdisplay=true]:flex ${
				variant === 'secondary' ? '' : 'pb-3'
			}`}
			{...extra}
		>
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					React.startTransition(() => {
						setSearchValue(value)
					})
				}}
				open={open}
				setOpen={setOpen}
			>
				<Input
					placeholder={placeholder}
					onSearchTermChange={onSearchTermChange}
					open={open}
					setOpen={setOpen}
					variant={variant}
				/>

				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					className="flex flex-col bg-[var(--bg1)] rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					{loading ? (
						<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
					) : matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option.name} onItemClick={props.onItemClick} data={option} />
							))}

							{matches.length > viewableMatches ? (
								<button
									className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
			<>{filters}</>
		</div>
	)
}

interface IInputProps {
	open: boolean
	setOpen?: React.Dispatch<React.SetStateAction<boolean>>
	placeholder: string
	autoFocus?: boolean
	variant?: 'primary' | 'secondary'
	hideIcon?: boolean
	onSearchTermChange?: (value: string) => void
}

function Input({ open, setOpen, placeholder, hideIcon, onSearchTermChange, variant }: IInputProps) {
	const inputField = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
				e.preventDefault()
				inputField.current && inputField.current?.focus()
				setOpen(true)
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [setOpen])

	return (
		<span className={`relative isolate w-full ${variant === 'secondary' ? '' : 'max-w-[50vw]'}`}>
			{!hideIcon ? (
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-[8px] left-[9px] opacity-50">
					{open ? (
						<>
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={16} width={16} />
						</>
					) : (
						<>
							<span className="sr-only">Open Search</span>
							<Icon name="search" height={14} width={14} />
						</>
					)}
				</button>
			) : null}

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="w-full text-sm rounded-md border border-[#e6e6e6] dark:border-[#222324] text-black dark:text-white bg-[var(--app-bg)] py-[5px] px-[10px] pl-8"
			/>

			{!hideIcon ? (
				<span className="rounded-md text-xs text-[var(--link-text)] bg-[var(--link-bg)] p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
					⌘K
				</span>
			) : null}
		</span>
	)
}

const Row = ({ data, onItemClick }) => {
	const [loading, setLoading] = React.useState(false)
	const router = useRouter()

	return (
		<Ariakit.ComboboxItem
			value={data.name}
			onClick={(e) => {
				if (onItemClick) {
					onItemClick(data)
				} else if (e.ctrlKey || e.metaKey) {
					window.open(data.route)
				} else {
					setLoading(true)
					// router.push(data.route).then(() => {
					// 	setLoading(false)
					// })
					window.open(data.route, '_self')
				}
			}}
			focusOnHover
			hideOnClick={false}
			setValueOnClick={false}
			disabled={loading}
			className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] aria-disabled:opacity-50 outline-none"
		>
			{data?.logo || data?.fallbackLogo ? <TokenLogo logo={data?.logo} fallbackLogo={data?.fallbackLogo} /> : null}
			<span>{data.name}</span>
			{data?.deprecated ? (
				<span className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1">
					<Tooltip
						content="Deprecated"
						className="bg-red-600 dark:bg-red-400 text-white text-[10px] h-3 w-3 flex items-center justify-center rounded-full"
					>
						!
					</Tooltip>
					<span>Deprecated</span>
				</span>
			) : null}
			{loading ? (
				<svg
					className="animate-spin -ml-1 mr-3 h-4 w-4"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}
		</Ariakit.ComboboxItem>
	)
}
