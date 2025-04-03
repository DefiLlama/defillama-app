import * as Ariakit from '@ariakit/react'
import { startTransition, useMemo, useState } from 'react'
import { matchSorter } from 'match-sorter'

interface IProps {
	options: { label: string; to: string }[]
	name: string
	isActive: boolean
	className?: string
}

export function OtherLinks({ options, name, isActive, className }: IProps) {
	const [searchValue, setSearchValue] = useState('')

	const matches = useMemo(() => {
		return matchSorter(options, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['label']
		})
	}, [options, searchValue])

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
					className={`h-9 flex items-center gap-4 my-auto rounded-xl py-2 px-3 whitespace-nowrap font-medium text-sm text-black dark:text-white bg-[var(--link-bg)]  hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--link-active-bg)] data-[active=true]:text-white ${
						className ?? ''
					}`}
				>
					<span>{name}</span>
					<Ariakit.MenuButtonArrow className="relative top-[1px]" />
				</Ariakit.MenuButton>

				<Ariakit.Menu
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
					}}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3"
					/>
					{matches.length > 0 ? (
						<Ariakit.ComboboxList>
							{matches.slice(0, viewableMatches + 1).map((value) => (
								<Item label={value.label} to={value.to} key={`other-link-${value.to}`} />
							))}
						</Ariakit.ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
					{matches.length > viewableMatches ? (
						<button
							className="w-full py-4 px-3 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
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
	return (
		<Ariakit.MenuItem
			onClick={(e) => {
				if (e.ctrlKey || e.metaKey) {
					window.open(to)
				} else {
					setLoading(true)
					// router.push(to).then(() => {
					// 	setLoading(false)
					// 	state.hide()
					// })
					window.open(to, '_self')
				}
			}}
			render={<Ariakit.ComboboxItem value={label} />}
			className="group flex items-center gap-4 py-2 px-3 flex-shrink-0 data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
		>
			<span>{label}</span>
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
		</Ariakit.MenuItem>
	)
}
