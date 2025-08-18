import * as Ariakit from '@ariakit/react'
import { startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BasicLink } from '../Link'
import { Icon } from '../Icon'
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch'
import { InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch'
import { fetchJson } from '~/utils/async'
import { useQuery } from '@tanstack/react-query'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'

const { searchClient } = instantMeiliSearch(
	'https://search.defillama.com',
	'ee4d49e767f84c0d1c4eabd841e015f02d403e5abf7ea2a523827a46b02d5ad5'
)

async function getSearchList() {
	try {
		const data = await fetchJson('https://defillama-datasets.llama.fi/searchlist.json')
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unknown error')
	}
}

interface ISearchItem {
	name: string
	logo: string
	symbol?: string
	route: string
	type: string
	deprecated?: boolean
}

export const GlobalSearch = () => {
	return (
		<InstantSearch indexName="pages" searchClient={searchClient as any} future={{ preserveSharedStateOnUnmount: true }}>
			<Desktop />
		</InstantSearch>
	)
}

export const MobileSearch = () => {
	return (
		<InstantSearch indexName="pages" searchClient={searchClient as any} future={{ preserveSharedStateOnUnmount: true }}>
			<Mobile />
		</InstantSearch>
	)
}

const Mobile = () => {
	const { query, refine } = useSearchBox()

	const { results, status, error } = useInstantSearch({ catchError: true })

	const [open, setOpen] = useState(false)
	const inputField = useRef<HTMLInputElement>(null)

	const { searchList, isLoadingSearchList, errorSearchList, defaultSearchList, recentSearchList } = useSearchList()

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				startTransition(() => {
					refine(value)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="lg:hidden">
				{open ? (
					<>
						<Ariakit.Combobox
							placeholder="Search..."
							autoSelect
							ref={inputField}
							autoFocus
							className="absolute top-2 left-2 right-2 p-3 rounded-t-md text-base bg-(--cards-bg) text-(--text-primary)"
						/>
						<button onClick={() => setOpen(false)} className="absolute z-10 top-5 right-5">
							<span className="sr-only">Close Search</span>
							<Icon name="x" height={24} width={24} />
						</button>
					</>
				) : (
					<button onClick={() => setOpen(true)} className="shadow p-3 rounded-md bg-[#445ed0] text-white -my-[2px]">
						<span className="sr-only">Search</span>
						<Icon name="search" height={16} width={16} />
					</button>
				)}
			</span>
			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				sameWidth
				className="flex flex-col bg-(--cards-bg) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-(--cards-border) h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{query ? (
					status === 'loading' ? (
						<p className="flex items-center justify-center p-4">Loading...</p>
					) : error ? (
						<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
					) : !results?.hits?.length ? (
						<p className="flex items-center justify-center p-4">No results found</p>
					) : (
						results.hits.map((route: ISearchItem) => {
							return (
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
									{route.deprecated && <span className="text-xs text-(--error)">(Deprecated)</span>}
									<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
								</Ariakit.ComboboxItem>
							)
						})
					)
				) : isLoadingSearchList ? (
					<p className="flex items-center justify-center p-4">Loading...</p>
				) : errorSearchList ? (
					<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorSearchList.message}`}</p>
				) : !searchList?.length ? (
					<p className="flex items-center justify-center p-4">No results found</p>
				) : (
					<>
						{recentSearchList.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-recent-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									<Icon name="clock" height={12} width={12} className="ml-auto" />
								</Ariakit.ComboboxItem>
							)
						})}
						{defaultSearchList.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-dl-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
									onClick={() => {
										setRecentSearch(route)
									}}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
								</Ariakit.ComboboxItem>
							)
						})}
					</>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}

const Desktop = () => {
	const { query, refine } = useSearchBox()

	const { results, status, error } = useInstantSearch({ catchError: true })

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

	const { searchList, isLoadingSearchList, errorSearchList, defaultSearchList, recentSearchList } = useSearchList()

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				startTransition(() => {
					refine(value)
				})
			}}
			open={open}
			setOpen={setOpen}
		>
			<span className="hidden lg:inline-block relative isolate w-full lg:max-w-[50vw]">
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
				className="flex flex-col bg-(--cards-bg) rounded-b-md z-10 overflow-auto overscroll-contain border border-t-0 border-(--cards-border) h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{query ? (
					status === 'loading' ? (
						<p className="flex items-center justify-center p-4">Loading...</p>
					) : error ? (
						<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
					) : !results?.hits?.length ? (
						<p className="flex items-center justify-center p-4">No results found</p>
					) : (
						results.hits.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
									onClick={() => {
										setRecentSearch(route)
									}}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									{route.deprecated && <span className="text-xs text-(--error)">(Deprecated)</span>}
									<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
								</Ariakit.ComboboxItem>
							)
						})
					)
				) : isLoadingSearchList ? (
					<p className="flex items-center justify-center p-4">Loading...</p>
				) : errorSearchList ? (
					<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorSearchList.message}`}</p>
				) : !searchList?.length ? (
					<p className="flex items-center justify-center p-4">No results found</p>
				) : (
					<>
						{recentSearchList.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-recent-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									<Icon name="clock" height={12} width={12} className="ml-auto" />
								</Ariakit.ComboboxItem>
							)
						})}
						{defaultSearchList.map((route: ISearchItem) => {
							return (
								<Ariakit.ComboboxItem
									className="px-4 py-2 hover:bg-(--link-bg) flex items-center gap-2"
									key={`global-search-dl-${route.name}-${route.route}`}
									render={<BasicLink href={route.route} />}
									onClick={() => {
										setRecentSearch(route)
									}}
								>
									{route.logo ? (
										<img src={route.logo} alt={route.name} className="w-6 h-6 rounded-full" loading="lazy" />
									) : (
										<Icon name="file-text" className="w-6 h-6" />
									)}
									<span>{route.name}</span>
									<span className="text-xs text-(--link-text) ml-auto">{route.type}</span>
								</Ariakit.ComboboxItem>
							)
						})}
					</>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}

const setRecentSearch = (route: ISearchItem) => {
	const recentSearch = window.localStorage.getItem('recentSearch')
	const recentSearchArray = JSON.parse(recentSearch ?? '[]')
	window.localStorage.setItem(
		'recentSearch',
		JSON.stringify([route, ...recentSearchArray.filter((r: ISearchItem) => r.route !== route.route).slice(0, 2)])
	)
}

const useSearchList = () => {
	const {
		data: searchList,
		isLoading: isLoadingSearchList,
		error: errorSearchList
	} = useQuery({
		queryKey: ['searchlist'],
		queryFn: getSearchList,
		staleTime: 1000 * 60 * 60,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		gcTime: 1000 * 60 * 60
	})

	const recentSearch = useSyncExternalStore(
		subscribeToLocalStorage,
		() => window.localStorage.getItem('recentSearch') ?? '[]',
		() => '[]'
	)

	const { defaultSearchList, recentSearchList } = useMemo(() => {
		const recentSearchArray = JSON.parse(recentSearch)

		return {
			defaultSearchList:
				searchList?.filter(
					(route: ISearchItem) => !recentSearchArray.some((r: ISearchItem) => r.route === route.route)
				) ?? [],
			recentSearchList: recentSearchArray ?? []
		}
	}, [searchList, recentSearch])

	return {
		searchList,
		isLoadingSearchList,
		errorSearchList,
		defaultSearchList,
		recentSearchList
	}
}
