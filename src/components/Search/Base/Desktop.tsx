import * as React from 'react'
import type { IBaseSearchProps } from '../types'
import { useRouter } from 'next/router'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'

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
			keys: ['name']
		})
	}, [data, searchValue, skipSearching])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const [open, setOpen] = React.useState(false)

	return (
		<div className="relative hidden lg:flex flex-col rounded-md shadow data-[alwaysdisplay=true]:flex" {...extra}>
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
					filtersExists={filters ? true : false}
					variant={variant}
					open={open}
					setOpen={setOpen}
				/>

				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none !w-full'
					}}
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

			{/* dark: #101010 */}
			{filters ? (
				<span className="flex items-center justify-end rounded-b-md bg-[#fafafa] dark:bg-[#090a0b] p-3 min-h-[48px]">
					{filters}
				</span>
			) : null}
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
	filtersExists?: boolean
}

function Input({ open, setOpen, placeholder, hideIcon, onSearchTermChange, filtersExists, variant }: IInputProps) {
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
		<>
			{!hideIcon ? (
				<button
					onClick={(prev) => setOpen(!prev)}
					className={variant === 'secondary' ? 'absolute top-2 left-[6px]' : 'absolute top-[14px] left-3 opacity-50'}
				>
					{open ? (
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

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className={
					variant === 'secondary'
						? 'p-[6px] pl-8 rounded-md text-base bg-[#eaeaea] text-black dark:bg-[#22242a] dark:text-white'
						: `p-3 pl-9 ${
								filtersExists ? 'rounded-t-md' : 'rounded-md'
						  } text-base bg-white text-black dark:bg-black dark:text-white`
				}
			/>

			{!hideIcon ? (
				<span
					className={`absolute ${
						variant === 'secondary' ? 'top-1 right-1 p-1' : 'top-2 right-3 p-[6px]'
					} bg-[#f5f5f5] dark:bg-[#151515] text-[var(--link)] font-medium rounded-md`}
				>
					⌘K
				</span>
			) : null}
		</>
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
					// 	state.hide()
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
