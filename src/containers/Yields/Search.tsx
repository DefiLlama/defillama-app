import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'

export function YieldsSearch({
	lend = false,
	searchData,
	value
}: {
	lend?: boolean
	searchData: Array<{ name: string; symbol: string; logo?: string; fallbackLogo?: string }>
	value: string
}) {
	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)

	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return searchData
		return matchSorter(searchData, deferredSearchValue, {
			keys: [(item) => item.name.replace('₮', 'T'), (item) => item.symbol.replace('₮', 'T')],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [searchData, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = React.useState(20)

	const [open, setOpen] = React.useState(false)

	const comboboxRef = React.useRef<HTMLDivElement>(null)

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
		<div className="relative flex flex-col rounded-md">
			<Ariakit.ComboboxProvider
				defaultValue={value ?? ''}
				setValue={(value) => {
					React.startTransition(() => {
						setSearchValue(value)
					})
				}}
				open={open}
				setOpen={setOpen}
			>
				<Input placeholder={lend ? 'Collateral Token' : 'Token to Borrow'} open={open} setOpen={setOpen} />
				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer thin-scrollbar z-10 flex max-h-(--popover-available-height) flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100dvh-80px)]"
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>

					<input
						placeholder={lend ? 'Collateral Token' : 'Token to Borrow'}
						onChange={(e) => {
							setSearchValue?.(e.target.value)
						}}
						className="mb-4 rounded-md border border-(--form-control-border) bg-white p-4 text-base text-black sm:hidden dark:bg-[#22242a] dark:text-white"
					/>
					{matches.length ? (
						<Ariakit.ComboboxList ref={comboboxRef}>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Row key={option.name} data={option} lend={lend} setOpen={setOpen} />
							))}
							{matches.length > viewableMatches ? (
								<Ariakit.ComboboxItem
									value="__see_more__"
									setValueOnClick={false}
									hideOnClick={false}
									className="w-full cursor-pointer px-3 py-4 text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-active-item:bg-(--link-hover-bg)"
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
	onSearchTermChange?: (value: string) => void
}

function Input({ placeholder, onSearchTermChange, open, setOpen }: IInputProps) {
	return (
		<>
			<button onClick={(prev) => setOpen(!prev)} className="absolute top-1 bottom-1 left-2 my-auto opacity-50">
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

			<Ariakit.Combobox
				placeholder={placeholder}
				autoSelect
				onChange={(e) => {
					onSearchTermChange?.(e.target.value)
				}}
				className="min-h-8 w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2 py-1 pl-7 text-black dark:text-white"
			/>
		</>
	)
}

const Row = ({ data, lend, setOpen }) => {
	const [loading, setLoading] = React.useState(false)
	const router = useRouter()

	const { lend: lendQuery, borrow, ...queryParams } = router.query

	const [targetParam, restParam] = lend ? ['lend', 'borrow'] : ['borrow', 'lend']

	return (
		<Ariakit.ComboboxItem
			value={data.name}
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
						setOpen(false)
					})
			}}
			focusOnHover
			disabled={loading}
			className="flex cursor-pointer items-center gap-4 p-3 text-(--text-primary) outline-hidden hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:opacity-50 data-active-item:bg-(--primary-hover)"
		>
			<span>{data.symbol === 'USD_Stables' ? 'All USD Stablecoins' : `${data.name}`}</span>
			{loading ? <LoadingSpinner size={12} /> : null}
		</Ariakit.ComboboxItem>
	)
}
