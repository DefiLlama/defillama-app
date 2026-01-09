import { startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { LoadingDots } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import { useDebounce } from '~/hooks/useDebounce'
import { fetchJson, handleSimpleFetchResponse } from '~/utils/async'
import { Icon } from '../Icon'
import { BasicLink } from '../Link'

const SEARCH_PAGE_SIZE = 20

async function getDefaultSearchList() {
	try {
		const data = await fetchJson('https://defillama-datasets.llama.fi/searchlist.json')
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unknown error')
	}
}

interface SearchQueryBody {
	indexUid: string
	limit: number
	offset: number
	q: string
	filter?: string[][]
}

async function fetchSearchList(query: string, offset: number = 0, filterType?: SearchFilter) {
	const queryBody: SearchQueryBody = {
		indexUid: 'pages',
		limit: SEARCH_PAGE_SIZE,
		offset: offset,
		q: query
	}

	if (filterType && filterType !== 'all') {
		queryBody.filter = [[`type = "${filterType}"`]]
	}

	const response: Array<ISearchItem> = await fetch('https://search.defillama.com/multi-search', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ee4d49e767f84c0d1c4eabd841e015f02d403e5abf7ea2a523827a46b02d5ad5`
		},
		body: JSON.stringify({
			queries: [queryBody]
		})
	})
		.then(handleSimpleFetchResponse)
		.then((res) => res.json())
		.then((res) => res?.results?.[0]?.hits ?? [])

	return response
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

type SearchFilter = 'all' | 'Protocol' | 'Chain' | 'Category' | 'Stablecoin' | 'Metric' | 'Tool' | 'Tag'

const FILTER_OPTIONS: { value: SearchFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'Chain', label: 'Chains' },
	{ value: 'Protocol', label: 'Protocols' },
	{ value: 'Stablecoin', label: 'Stablecoins' },
	{ value: 'Metric', label: 'Metrics' },
	{ value: 'Category', label: 'Categories' },
	{ value: 'Tool', label: 'Tools' },
	{ value: 'Tag', label: 'Tags' }
]

const hideLlamaAI = new Set(['/ai'])

function useSearchUIState(debouncedSearchValue: string) {
	const { defaultSearchList, recentSearchList, isLoadingDefaultSearchList, errorDefaultSearchList } =
		useDefaultSearchList()

	const [searchFilter, setSearchFilter] = useState<SearchFilter>('all')

	const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearch(
		debouncedSearchValue,
		searchFilter
	)
	const {
		data: filteredDefaultData,
		isLoading: isLoadingFilteredDefault,
		fetchNextPage: fetchNextFilteredDefault,
		hasNextPage: hasNextFilteredDefault,
		isFetchingNextPage: isFetchingNextFilteredDefault
	} = useFilteredDefaultResults(searchFilter)

	const filteredResults = useMemo(() => {
		if (!data?.pages) return []
		return data.pages.flat()
	}, [data])

	const filteredDefaultResults = useMemo(() => {
		if (debouncedSearchValue) return []

		if (searchFilter === 'all') {
			return defaultSearchList || []
		}

		if (filteredDefaultData?.pages) {
			return filteredDefaultData.pages.flat()
		}

		if (!defaultSearchList?.length) return []
		return defaultSearchList.filter((item) => item.type === searchFilter)
	}, [defaultSearchList, searchFilter, filteredDefaultData, debouncedSearchValue])

	const filteredRecentResults = useMemo(() => {
		if (!recentSearchList?.length) return []
		if (searchFilter === 'all') return recentSearchList
		return recentSearchList.filter((item) => item.type === searchFilter)
	}, [recentSearchList, searchFilter])

	const hasMoreResults = debouncedSearchValue ? hasNextPage : searchFilter !== 'all' && hasNextFilteredDefault

	const fetchMoreResults = debouncedSearchValue ? fetchNextPage : fetchNextFilteredDefault
	const isFetchingMore = debouncedSearchValue ? isFetchingNextPage : isFetchingNextFilteredDefault

	return {
		searchFilter,
		setSearchFilter,
		filteredResults,
		filteredDefaultResults,
		filteredRecentResults,
		isLoading,
		error,
		fetchNextPage: fetchMoreResults,
		hasNextPage: hasMoreResults,
		isFetchingNextPage: isFetchingMore,
		isLoadingDefaultSearchList,
		errorDefaultSearchList,
		isLoadingFilteredDefault
	}
}

function SearchFiltersBar({
	searchFilter,
	setSearchFilter
}: {
	searchFilter: SearchFilter
	setSearchFilter: (filter: SearchFilter) => void
}) {
	return (
		<div className="flex flex-wrap items-center gap-2 border-b border-(--cards-border) px-2 pt-2 pb-2 lg:px-4">
			{FILTER_OPTIONS.map((filter) => (
				<button
					key={filter.value}
					onClick={() => setSearchFilter(filter.value)}
					className={`rounded-md px-2 py-1 text-xs transition-colors ${
						searchFilter === filter.value
							? 'bg-(--primary) text-white'
							: 'bg-(--link-bg) text-(--link-text) hover:bg-(--link-bg-hover)'
					}`}
				>
					{filter.label}
				</button>
			))}
		</div>
	)
}

export const MobileSearch = () => {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const [searchValue, setSearchValue] = useState('')
	const debouncedSearchValue = useDebounce(searchValue, 200)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const loadMoreRef = useRef<HTMLDivElement>(null)

	const {
		searchFilter,
		setSearchFilter,
		filteredResults,
		filteredDefaultResults,
		filteredRecentResults,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoadingDefaultSearchList,
		errorDefaultSearchList,
		isLoadingFilteredDefault
	} = useSearchUIState(debouncedSearchValue)

	useEffect(() => {
		if (!hasNextPage || !scrollContainerRef.current || !loadMoreRef.current) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage()
				}
			},
			{
				root: scrollContainerRef.current,
				rootMargin: '100px'
			}
		)

		observer.observe(loadMoreRef.current)

		return () => {
			observer.disconnect()
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	return (
		<>
			{!hideLlamaAI.has(router.pathname) && (
				<BasicLink
					href={hasActiveSubscription ? '/ai/chat' : '/ai'}
					className="llamaai-glow relative -my-0.5 overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] p-3 text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)] lg:hidden"
					data-umami-event="llamaai-mobile-nav-link"
					data-umami-event-subscribed={hasActiveSubscription ? 'true' : 'false'}
				>
					<svg className="h-4 w-4 shrink-0">
						<use href="/icons/ask-llamaai-3.svg#ai-icon" />
					</svg>
					<span className="sr-only">Ask LlamaAI</span>
				</BasicLink>
			)}
			<Ariakit.DialogProvider>
				<Ariakit.DialogDisclosure className="-my-0.5 rounded-md bg-[#445ed0] p-3 text-white shadow lg:hidden">
					<span className="sr-only">Search</span>
					<Icon name="search" height={16} width={16} />
				</Ariakit.DialogDisclosure>

				<Ariakit.Dialog
					className="dialog max-sm:drawer h-[calc(100dvh-80px)] max-h-(--popover-available-height) bg-(--bg-main) p-2"
					unmountOnHide
					hideOnInteractOutside
					portal
				>
					<Ariakit.ComboboxProvider
						setValue={(value) => {
							startTransition(() => {
								setSearchValue(value)
							})
						}}
					>
						<span className="relative isolate flex w-full items-center justify-between gap-2">
							<Ariakit.Combobox
								placeholder="Search..."
								className="ml-2 flex-1 rounded-md bg-white px-3 py-1 text-base focus:ring-(--primary) dark:bg-black"
							/>
							<Ariakit.DialogDismiss className="p-2">
								<Icon name="x" className="h-5 w-5" />
							</Ariakit.DialogDismiss>
						</span>

						<SearchFiltersBar searchFilter={searchFilter} setSearchFilter={setSearchFilter} />

						<Ariakit.ComboboxList ref={scrollContainerRef} className="flex flex-col gap-1 overflow-auto" alwaysVisible>
							{debouncedSearchValue ? (
								isLoading ? (
									<p className="flex items-center justify-center gap-1 p-4">
										Loading
										<LoadingDots />
									</p>
								) : error ? (
									<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
								) : !filteredResults.length ? (
									<p className="flex items-center justify-center p-4">No results found</p>
								) : (
									<>
										{filteredResults.map((route: ISearchItem) => (
											<SearchItem key={`global-search-${route.name}-${route.route}`} route={route} />
										))}
										{hasNextPage && <div ref={loadMoreRef} className="h-1" />}
										{isFetchingNextPage && (
											<p className="flex items-center justify-center gap-1 p-4">
												Loading more
												<LoadingDots />
											</p>
										)}
									</>
								)
							) : isLoadingDefaultSearchList || isLoadingFilteredDefault ? (
								<p className="flex items-center justify-center gap-1 p-4">
									Loading
									<LoadingDots />
								</p>
							) : errorDefaultSearchList ? (
								<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorDefaultSearchList.message}`}</p>
							) : !filteredDefaultResults.length && !filteredRecentResults.length ? (
								<p className="flex items-center justify-center p-4">No results found</p>
							) : (
								<>
									{filteredRecentResults.map((route: ISearchItem) => (
										<SearchItem key={`global-search-recent-${route.name}-${route.route}`} route={route} recent />
									))}
									{filteredDefaultResults.map((route: ISearchItem) => (
										<SearchItem key={`global-search-dl-${route.name}-${route.route}`} route={route} />
									))}
									{hasNextPage && <div ref={loadMoreRef} />}
									{isFetchingNextPage && (
										<p className="flex items-center justify-center gap-1 p-4">
											Loading more
											<LoadingDots />
										</p>
									)}
								</>
							)}
						</Ariakit.ComboboxList>
					</Ariakit.ComboboxProvider>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}

export const DesktopSearch = () => {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const [open, setOpen] = useState(false)
	const inputField = useRef<HTMLInputElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)

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

	const [searchValue, setSearchValue] = useState('')
	const debouncedSearchValue = useDebounce(searchValue, 200)

	const {
		searchFilter,
		setSearchFilter,
		filteredResults,
		filteredDefaultResults,
		filteredRecentResults,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoadingDefaultSearchList,
		errorDefaultSearchList,
		isLoadingFilteredDefault
	} = useSearchUIState(debouncedSearchValue)

	const loadMoreRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!hasNextPage || !scrollContainerRef.current || !loadMoreRef.current) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage()
				}
			},
			{
				root: scrollContainerRef.current,
				rootMargin: '100px'
			}
		)

		observer.observe(loadMoreRef.current)

		return () => {
			observer.disconnect()
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

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
				<span className="relative isolate hidden w-full lg:inline-block lg:max-w-[50vw]">
					<button onClick={(prev) => setOpen(!prev)} className="absolute top-0 bottom-0 left-2 my-auto opacity-50">
						{open ? (
							<>
								<span className="sr-only">Close Search</span>
								<Icon name="x" height={16} width={16} />
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
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-2.5 py-0.75 pl-7 text-black focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden focus-visible:outline-hidden lg:py-1.25 dark:text-white"
					/>
					<span className="absolute top-0.75 right-0.75 bottom-0.75 m-auto flex items-center justify-center rounded-md bg-(--link-bg) p-1 text-xs text-(--link-text)">
						⌘K
					</span>
				</span>
				<Ariakit.ComboboxPopover
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					sameWidth
					className="max-sm:drawer thin-scrollbar z-10 flex max-h-[min(var(--popover-available-height),60vh)] flex-col overflow-hidden overscroll-contain rounded-b-md border border-t-0 border-(--cards-border) bg-(--cards-bg) max-sm:h-[calc(100dvh-80px)]"
					portal
				>
					<SearchFiltersBar searchFilter={searchFilter} setSearchFilter={setSearchFilter} />
					<Ariakit.ComboboxList
						ref={scrollContainerRef}
						className="thin-scrollbar flex flex-col overflow-auto"
						alwaysVisible
					>
						{debouncedSearchValue ? (
							isLoading ? (
								<p className="flex items-center justify-center gap-1 p-4">
									Loading
									<LoadingDots />
								</p>
							) : error ? (
								<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${error.message}`}</p>
							) : !filteredResults.length ? (
								<p className="flex items-center justify-center p-4">No results found</p>
							) : (
								<>
									{filteredResults.map((route: ISearchItem) => (
										<SearchItem key={`gs-${route.name}-${route.route}-${route.subName}`} route={route} />
									))}
									{hasNextPage && <div ref={loadMoreRef} />}
									{isFetchingNextPage && (
										<p className="flex items-center justify-center gap-1 p-4">
											Loading more
											<LoadingDots />
										</p>
									)}
								</>
							)
						) : isLoadingDefaultSearchList || isLoadingFilteredDefault ? (
							<p className="flex items-center justify-center gap-1 p-4">
								Loading
								<LoadingDots />
							</p>
						) : errorDefaultSearchList ? (
							<p className="flex items-center justify-center p-4 text-(--error)">{`Error: ${errorDefaultSearchList.message}`}</p>
						) : !filteredDefaultResults.length && !filteredRecentResults.length ? (
							<p className="flex items-center justify-center p-4">No results found</p>
						) : (
							<>
								{filteredRecentResults.map((route: ISearchItem) => (
									<SearchItem key={`gs-r-${route.name}-${route.route}-${route.subName}`} route={route} recent />
								))}
								{filteredDefaultResults.map((route: ISearchItem) => (
									<SearchItem key={`gs-dl-${route.name}-${route.route}-${route.subName}`} route={route} />
								))}
								{hasNextPage && <div ref={loadMoreRef} />}
								{isFetchingNextPage && (
									<p className="flex items-center justify-center gap-1 p-4">
										Loading more
										<LoadingDots />
									</p>
								)}
							</>
						)}
					</Ariakit.ComboboxList>
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
			{!hideLlamaAI.has(router.pathname) && (
				<BasicLink
					href={hasActiveSubscription ? '/ai/chat' : '/ai'}
					className="llamaai-glow relative mr-auto hidden items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-xs font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)] lg:flex"
					data-umami-event="llamaai-nav-link"
					data-umami-event-subscribed={hasActiveSubscription ? 'true' : 'false'}
				>
					<svg className="h-4 w-4 shrink-0">
						<use href="/icons/ask-llamaai-3.svg#ai-icon" />
					</svg>
					<span className="whitespace-nowrap">Ask LlamaAI</span>
				</BasicLink>
			)}
		</>
	)
}

const SearchItem = ({ route, recent = false }: { route: ISearchItem; recent?: boolean }) => {
	const router = useRouter()
	return (
		<Ariakit.ComboboxItem
			className="flex flex-wrap items-center gap-2 px-2 py-2 hover:bg-(--link-bg) focus-visible:bg-(--link-bg) data-active-item:bg-(--link-bg) lg:px-4"
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

const useDefaultSearchList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['defaultsearchlist'],
		queryFn: getDefaultSearchList,
		staleTime: 1000 * 60 * 60,
		refetchOnMount: false,
		refetchOnWindowFocus: false
	})

	const recentSearch = useSyncExternalStore(
		subscribeToLocalStorage,
		() => window.localStorage.getItem('recentSearch') ?? '[]',
		() => '[]'
	)

	const { defaultSearchList, recentSearchList } = useMemo(() => {
		if (!data || data.length === 0) return { defaultSearchList: [], recentSearchList: [] }

		const recentSearchArray = JSON.parse(recentSearch)

		return {
			defaultSearchList:
				data?.filter((route: ISearchItem) => !recentSearchArray.some((r: ISearchItem) => r.route === route.route)) ??
				[],
			recentSearchList: recentSearchArray ?? []
		}
	}, [data, recentSearch])

	return {
		defaultSearchList,
		recentSearchList,
		isLoadingDefaultSearchList: isLoading,
		errorDefaultSearchList: error
	}
}

function useSearch(searchValue: string, filterType: SearchFilter = 'all') {
	return useInfiniteQuery({
		queryKey: ['search-list', searchValue, filterType],
		queryFn: ({ pageParam = 0 }) => fetchSearchList(searchValue, pageParam, filterType),
		enabled: searchValue.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < SEARCH_PAGE_SIZE) {
				return undefined
			}
			return allPages.length * SEARCH_PAGE_SIZE
		}
	})
}

function useFilteredDefaultResults(filterType: SearchFilter) {
	return useInfiniteQuery({
		queryKey: ['filtered-default-results', filterType],
		queryFn: ({ pageParam = 0 }) => fetchSearchList('', pageParam, filterType),
		enabled: filterType !== 'all',
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < SEARCH_PAGE_SIZE) {
				return undefined
			}
			return allPages.length * SEARCH_PAGE_SIZE
		}
	})
}
