import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { BasicLink } from '../Link'
import { Icon } from '../Icon'
import { fetchJson } from '~/utils/async'
import { useQuery } from '@tanstack/react-query'

async function getSearchList() {
	try {
		const searchList: Array<{
			category: string
			pages: Array<{ name: string; logo: string; route: string }>
		}> = await fetchJson('https://defillama-datasets.llama.fi/searchlist.json')

		return searchList
	} catch (error) {
		console.error(error)
		return null
	}
}

export const GlobalSearch = () => {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const { data: searchList, isLoading: isLoadingSearchList } = useQuery({
		queryKey: ['searchlist'],
		queryFn: getSearchList,
		staleTime: 1000 * 60 * 60 * 24,
		gcTime: 1000 * 60 * 60 * 24
	})

	const finalSearchList = useMemo(() => {
		if (!searchList) return []
		if (!deferredSearchValue) return searchList.map((cat) => ({ category: cat.category, pages: cat.pages.slice(0, 3) }))
		return matchSorter(searchList, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['category', 'pages.*.name', 'pages.*.symbol'],
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
				)
			}))
			.filter((category) => category.pages.length > 0)
	}, [deferredSearchValue, searchList])

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
					{isLoadingSearchList ? (
						<p className="flex items-center justify-center p-4">
							<span>Loading...</span>
							<svg
								className="animate-spin h-[14px] w-[14px] shrink-0"
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
						</p>
					) : (
						finalSearchList.map((cat) => {
							return (
								<div className="flex flex-col" key={`global-search-${cat.category}`}>
									{cat.pages.map((route) => (
										<Ariakit.ComboboxItem
											className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
											key={`global-search-${route.name}-${route.route}`}
											render={<BasicLink href={route.route} />}
										>
											{route.logo ? (
												<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
											) : (
												<Icon name="file-text" className="w-6 h-6" />
											)}
											<span>{route.name}</span>
											<span className="text-xs text-(--link-text) ml-auto">{cat.category}</span>
										</Ariakit.ComboboxItem>
									))}
								</div>
							)
						})
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</>
	)
}

// <div className="flex items-center justify-between gap-1 flex-wrap px-[10px] pt-2">
// 	<h1 className="text-sm font-medium mb-2">{cat.category}</h1>
// 	{cat.route ? (
// 		<BasicLink href={cat.route} className="text-(--link) ml-auto">
// 			See all
// 		</BasicLink>
// 	) : null}
// </div>
