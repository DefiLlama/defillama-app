import * as Ariakit from '@ariakit/react'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { useRouter } from 'next/router'
import { matchSorter } from 'match-sorter'

export function RaisesSearch({ list }) {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		return matchSorter(list || [], deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [list, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const [open, setOpen] = useState(false)

	return (
		<div className="relative hidden lg:flex flex-col rounded-md data-[alwaysdisplay=true]:flex">
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value)
					})
				}}
				open={open}
				setOpen={setOpen}
			>
				<Input placeholder="Search Investors..." open={open} setOpen={setOpen} />

				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! w-full!'
					}}
					className="flex flex-col bg-(--bg-main) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					{matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option} name={option} setOpen={setOpen} />
							))}

							{matches.length > viewableMatches ? (
								<button
									className="text-left w-full pt-4 px-4 pb-7 text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-(--text-primary) py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</div>
	)
}

interface IInputProps {
	open: boolean
	setOpen?: React.Dispatch<React.SetStateAction<boolean>>
	placeholder: string
	autoFocus?: boolean
	withValue?: boolean
	hideIcon?: boolean
	onSearchTermChange?: (value: string) => void
}

function Input({ open, setOpen, placeholder, hideIcon, onSearchTermChange }: IInputProps) {
	const inputField = useRef<HTMLInputElement>(null)

	useEffect(() => {
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
				className="w-full text-sm rounded-md border border-(--cards-border) text-black dark:text-white bg-(--app-bg) py-[5px] px-[10px] pl-8"
			/>

			{!hideIcon ? (
				<span className="rounded-md text-xs text-(--link-text) bg-(--link-bg) p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
					⌘K
				</span>
			) : null}
		</>
	)
}

const Row = ({ name, setOpen }) => {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	return (
		<Ariakit.ComboboxItem
			value={name}
			onClick={(e) => {
				setLoading(true)

				router.push(`/raises/${slug(name.toLowerCase())}`).then(() => {
					setLoading(false)
					setOpen(false)
				})
			}}
			focusOnHover
			hideOnClick={false}
			setValueOnClick={false}
			disabled={loading}
			className="p-3 flex items-center gap-4 text-(--text-primary) cursor-pointer hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) aria-disabled:opacity-50 outline-hidden"
		>
			<span>{name}</span>
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
