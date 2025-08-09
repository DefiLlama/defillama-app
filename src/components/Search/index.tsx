import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import metadataCache from '~/utils/metadata'
import { BasicLink } from '../Link'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import { Icon } from '../Icon'
const { searchList } = metadataCache

export const GlobalSearch = () => {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const finalSearchList = useMemo(() => {
		if (!deferredSearchValue)
			return searchList.map((cat) => ({ category: cat.category, pages: cat.pages.slice(0, 3), route: cat.route }))
		return matchSorter(searchList, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['category', 'pages.*.slug', 'pages.*.name'],
			threshold: matchSorter.rankings.CONTAINS
		})
			.map((cat) => ({
				category: cat.category,
				pages: cat.pages.filter(
					(page) =>
						matchSorter([page], deferredSearchValue, {
							keys: ['slug', 'name'],
							threshold: matchSorter.rankings.CONTAINS
						}).length > 0
				),
				route: cat.route
			}))
			.filter((category) => category.pages.length > 0)
	}, [deferredSearchValue])

	const [open, setOpen] = useState(false)
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
				<span className="relative isolate w-full max-w-[50vw]">
					<button onClick={(prev) => setOpen(!prev)} className="absolute top-[8px] left-[8px] opacity-50">
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
					<Ariakit.Combobox
						placeholder="Search..."
						autoSelect
						ref={inputField}
						className="w-full text-sm rounded-md border border-(--cards-border) text-black dark:text-white bg-(--app-bg) py-[5px] px-[10px] pl-7"
					/>
					<span className="rounded-md text-xs text-(--link-text) bg-(--link-bg) p-1 absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center">
						⌘K
					</span>
				</span>
				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					className="flex flex-col bg-(--cards-bg) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-(--cards-border) max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					{finalSearchList.map((cat) => {
						const getLogo = ['Chains', 'Protocols'].includes(cat.category)
							? (name: string) => (cat.category === 'Chains' ? chainIconUrl(name) : tokenIconUrl(name))
							: null
						return (
							<div className="flex flex-col" key={`global-search-${cat.category}`}>
								<div className="flex items-center justify-between gap-1 flex-wrap px-[10px] pt-2">
									<h1 className="text-sm font-medium mb-2">{cat.category}</h1>
									{cat.route ? (
										<BasicLink href={cat.route} className="text-(--link) ml-auto">
											See all
										</BasicLink>
									) : null}
								</div>
								{cat.pages.map((route) => (
									<Ariakit.ComboboxItem
										className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
										key={`global-search-${route.name}-${route.route}`}
										render={<BasicLink href={route.route} />}
									>
										{getLogo ? (
											<img src={getLogo(route.name)} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
										) : (
											<Icon name="file-text" className="w-6 h-6" />
										)}
										<span>{route.name}</span>
									</Ariakit.ComboboxItem>
								))}
							</div>
						)
					})}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</>
	)
}
