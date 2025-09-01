import { startTransition, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { slug } from '~/utils'

export function RaisesSearch({ list }) {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		if (!deferredSearchValue) return list || []
		return matchSorter(list || [], deferredSearchValue, {
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [list, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const [open, setOpen] = useState(false)

	const comboboxRef = useRef<HTMLDivElement>(null)

	const handleSeeMore = () => {
		const previousCount = viewableMatches
		setViewableMatches((prev) => prev + 20)

		// Focus on the first newly loaded item after a brief delay
		setTimeout(() => {
			const items = comboboxRef.current?.querySelectorAll('[role="option"]')
			if (items && items.length > previousCount) {
				const firstNewItem = items[previousCount] as HTMLElement
				firstNewItem?.focus()
			}
		}, 0)
	}

	return (
		<div className="relative hidden flex-col rounded-md data-[alwaysdisplay=true]:flex lg:flex">
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
					className="max-sm:drawer z-10 flex max-h-[var(--popover-available-height)] flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100vh-80px)]"
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>
					{matches.length ? (
						<Ariakit.ComboboxList ref={comboboxRef}>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option} name={option} setOpen={setOpen} />
							))}
							{matches.length > viewableMatches ? (
								<Ariakit.ComboboxItem
									value="__see_more__"
									setValueOnClick={false}
									hideOnClick={false}
									className="w-full px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary) data-active-item:bg-(--bg-secondary)"
									onClick={handleSeeMore}
								>
									See more...
								</Ariakit.ComboboxItem>
							) : null}
						</Ariakit.ComboboxList>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
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

	return (
		<>
			{!hideIcon ? (
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-2 left-2 opacity-50">
					{open ? (
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
			) : null}

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				ref={inputField}
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 pl-7 text-base text-black dark:text-white"
			/>
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
			className="flex cursor-pointer items-center gap-4 p-3 text-(--text-primary) outline-hidden hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:opacity-50 data-active-item:bg-(--primary-hover)"
		>
			<span>{name}</span>
			{loading ? <LoadingSpinner size={12} /> : null}
		</Ariakit.ComboboxItem>
	)
}
