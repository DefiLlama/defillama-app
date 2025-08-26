import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { Icon } from '../Icon'

interface IProps {
	options: { label: string; to: string }[]
	name: string
	isActive: boolean
	className?: string
}

export function OtherLinks({ options, name, isActive, className }: IProps) {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		if (!deferredSearchValue) return options
		return matchSorter(options, deferredSearchValue, {
			keys: ['label'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				startTransition(() => {
					setSearchValue(value)
				})
			}}
		>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton
					data-active={isActive}
					className={`my-auto flex h-6 items-center gap-4 rounded-md bg-[#E2E2E2] px-[10px] py-1 text-xs font-medium whitespace-nowrap text-black dark:bg-[#303032] dark:text-white ${
						className ?? ''
					}`}
				>
					<span>{name}</span>
					<Ariakit.MenuButtonArrow className="relative top-px" />
				</Ariakit.MenuButton>

				<Ariakit.Menu
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer z-10 flex h-[calc(100vh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>

					<span className="relative mb-2 p-3">
						<Ariakit.Combobox
							placeholder="Search..."
							autoFocus
							className="w-full rounded-md bg-white px-3 py-1 text-base dark:bg-black"
						/>
					</span>
					{matches.length > 0 ? (
						<Ariakit.ComboboxList>
							{matches.slice(0, viewableMatches + 1).map((value) => (
								<Item label={value.label} to={value.to} key={`other-link-${value.to}`} />
							))}
						</Ariakit.ComboboxList>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
					{matches.length > viewableMatches ? (
						<button
							className="w-full px-3 py-4 text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
							onClick={() => setViewableMatches((prev) => prev + 20)}
						>
							See more...
						</button>
					) : null}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</Ariakit.ComboboxProvider>
	)
}

const Item = ({ label, to }: { label: string; to: string }) => {
	const [loading, setLoading] = useState(false)
	const router = useRouter()
	return (
		<Ariakit.MenuItem
			onClick={(e) => {
				if (e.ctrlKey || e.metaKey) {
					window.open(to)
				} else {
					setLoading(true)
					router.push(to).then(() => {
						setLoading(false)
					})
					// window.open(to, '_self')
				}
			}}
			render={<Ariakit.ComboboxItem value={label} />}
			className="group flex shrink-0 cursor-pointer items-center gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md data-active-item:bg-(--primary-hover)"
		>
			<span>{label}</span>
			{loading ? (
				<svg
					className="mr-3 -ml-1 h-4 w-4 animate-spin"
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
		</Ariakit.MenuItem>
	)
}
