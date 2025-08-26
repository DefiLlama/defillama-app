import { memo, startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch'
import { useQuery } from '@tanstack/react-query'
import { InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { fetchJson } from '~/utils/async'
import { Icon } from '../Icon'
import { BasicLink } from '../Link'
import { SearchFallback } from './Fallback'

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
	hideType?: boolean
	subName?: string
}

export const DesktopSearch = memo(function DesktopSearch() {
	const isClient = useIsClient()

	if (!isClient) {
		return <SearchFallback />
	}

	return (
		<InstantSearch
			indexName="pages"
			searchClient={searchClient as any}
			future={{ preserveSharedStateOnUnmount: true }}
			insights={false}
		>
			<Desktop />
		</InstantSearch>
	)
})

export const MobileSearch = memo(function MobileSearch() {
	return (
		<InstantSearch
			indexName="pages"
			searchClient={searchClient as any}
			future={{ preserveSharedStateOnUnmount: true }}
			insights={false}
		>
			<Mobile />
		</InstantSearch>
	)
})

const Mobile = () => {
	const { query, refine } = useSearchBox()

	const { results, status, error } = useInstantSearch({ catchError: true })

	const { searchList, isLoadingSearchList, errorSearchList, defaultSearchList, recentSearchList } = useSearchList()

	return (
		<Ariakit.DialogProvider>
			<Ariakit.DialogDisclosure className="-my-[2px] rounded-md bg-[#445ed0] p-3 text-white shadow lg:hidden">
				<span className="sr-only">Search</span>
				<Icon name="search" height={16} width={16} />
			</Ariakit.DialogDisclosure>

			<Ariakit.Dialog
				className="dialog max-sm:drawer h-[calc(100vh-80px)] max-h-[var(--popover-available-height)] bg-(--bg-main) p-4 max-sm:h-[calc(100vh-80px)]"
				unmountOnHide
				hideOnInteractOutside
				portal
			>
				<Ariakit.DialogDismiss className="-mb-8 ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.DialogDismiss>

				<Ariakit.ComboboxProvider
					setValue={(value) => {
						startTransition(() => {
							refine(value)
						})
					}}
				>
					<span className="relative isolate w-full">
						<Ariakit.Combobox
							placeholder="Search..."
							className="w-full rounded-md bg-white px-3 py-1 pr-10 text-base dark:bg-black"
						/>
					</span>

					<div className="flex flex-col gap-1">
						{query ? (
							status === 'loading' ? (
								<p className="flex items-center justify-center p-4">Loading...</p>
							) : error ? (
								<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
							) : !results?.hits?.length ? (
								<p className="flex items-center justify-center p-4">No results found</p>
							) : (
								results.hits.map((route: ISearchItem) => (
									<SearchItem key={`global-search-${route.name}-${route.route}`} route={route} />
								))
							)
						) : isLoadingSearchList ? (
							<p className="flex items-center justify-center p-4">Loading...</p>
						) : errorSearchList ? (
							<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorSearchList.message}`}</p>
						) : !searchList?.length ? (
							<p className="flex items-center justify-center p-4">No results found</p>
						) : (
							<>
								{recentSearchList.map((route: ISearchItem) => (
									<SearchItem key={`global-search-recent-${route.name}-${route.route}`} route={route} recent />
								))}
								{defaultSearchList.map((route: ISearchItem) => (
									<SearchItem key={`global-search-dl-${route.name}-${route.route}`} route={route} />
								))}
							</>
						)}
					</div>
				</Ariakit.ComboboxProvider>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
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
				inputField.current?.focus()
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
			<span className="relative isolate hidden w-full lg:inline-block lg:max-w-[50vw]">
				<button onClick={(prev) => setOpen(!prev)} className="absolute top-[6px] left-[8px] opacity-50">
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
					placeholder="Search..."
					autoSelect
					ref={inputField}
					className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-[10px] py-[2px] pl-7 text-base text-black dark:text-white"
				/>
				<span className="absolute top-1 right-1 bottom-1 m-auto flex items-center justify-center rounded-md bg-(--link-bg) p-1 text-xs text-(--link-text)">
					⌘K
				</span>
			</span>
			<Ariakit.ComboboxPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				sameWidth
				className="max-sm:drawer z-10 flex max-h-[min(var(--popover-available-height),60vh)] flex-col overflow-auto overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100vh-80px)]"
				portal
			>
				{query ? (
					status === 'loading' ? (
						<p className="flex items-center justify-center p-4">Loading...</p>
					) : error ? (
						<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
					) : !results?.hits?.length ? (
						<p className="flex items-center justify-center p-4">No results found</p>
					) : (
						results.hits.map((route: ISearchItem) => (
							<SearchItem key={`gs-${route.name}-${route.route}-${route.subName}`} route={route} />
						))
					)
				) : isLoadingSearchList ? (
					<p className="flex items-center justify-center p-4">Loading...</p>
				) : errorSearchList ? (
					<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorSearchList.message}`}</p>
				) : !searchList?.length ? (
					<p className="flex items-center justify-center p-4">No results found</p>
				) : (
					<>
						{recentSearchList.map((route: ISearchItem) => (
							<SearchItem key={`gs-r-${route.name}-${route.route}-${route.subName}`} route={route} recent />
						))}
						{defaultSearchList.map((route: ISearchItem) => (
							<SearchItem key={`gs-dl-${route.name}-${route.route}-${route.subName}`} route={route} />
						))}
					</>
				)}
			</Ariakit.ComboboxPopover>
		</Ariakit.ComboboxProvider>
	)
}

const SearchItem = ({ route, recent = false }: { route: ISearchItem; recent?: boolean }) => {
	const router = useRouter()
	return (
		<Ariakit.ComboboxItem
			className="flex flex-wrap items-center gap-2 px-2 py-2 hover:bg-(--link-bg) lg:px-4"
			render={
				<BasicLink
					href={route.route}
					shallow={
						route.subName && route.route.includes('?') && router.asPath.startsWith(route.route.split('?')[0])
							? true
							: false
					}
				/>
			}
			onClick={() => {
				if (!recent) {
					setRecentSearch(route)
				}
			}}
			value={route.route}
		>
			{route.logo ? (
				<img src={route.logo} alt={route.name} className="h-6 w-6 rounded-full" loading="lazy" />
			) : (
				<Icon name="file-text" className="h-6 w-6" />
			)}
			<span>{route.name}</span>
			{route.subName ? (
				<>
					<Icon name="chevron-right" height={16} width={16} className="text-(--text-form)" />
					<span className="text-(--text-form)">{route.subName}</span>
				</>
			) : null}
			{route.deprecated && <span className="text-xs text-(--error)">(Deprecated)</span>}
			{route.hideType ? null : recent ? (
				<Icon name="clock" height={12} width={12} className="ml-auto" />
			) : (
				<span className="ml-auto text-xs text-(--link-text)">{route.type}</span>
			)}
		</Ariakit.ComboboxItem>
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
