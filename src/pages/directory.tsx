import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { Announcement } from '~/components/Announcement'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import { tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('directory', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url'])
	return {
		props: {
			protocols: protocols
				.map((protocol) => ({
					name: protocol.name,
					logo: tokenIconUrl(protocol.name),
					route: protocol.url
				}))
				.filter((p) => (p.name && p.route ? true : false))
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ protocols }: { protocols: Array<{ name: string; logo: string; route: string }> }) {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		if (!deferredSearchValue) return protocols
		return matchSorter(protocols, deferredSearchValue, {
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [protocols, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	const comboboxRef = useRef<HTMLDivElement>(null)

	const RECENTS_KEY = 'recent_protocols'
	const [recentProtocols, setRecentProtocols] = useState<
		Array<{ name: string; logo?: string; route: string; count: number; lastVisited: number }>
	>([])

	useEffect(() => {
		if (typeof window === 'undefined') return
		try {
			const raw = window.localStorage.getItem(RECENTS_KEY)
			if (raw) {
				const parsed: Array<{ name: string; logo?: string; route: string; count?: number; lastVisited?: number }> =
					JSON.parse(raw)

				const normalized = parsed.map((protocol) => ({
					name: protocol.name,
					logo: protocol.logo,
					route: protocol.route,
					count: protocol.count ?? 1,
					lastVisited: protocol.lastVisited ?? Date.now()
				}))
				setRecentProtocols(normalized)
			}
		} catch (e) {
			console.error('failed to read recent protocols', e)
		}
	}, [])

	const saveRecent = (protocol: { name: string; logo?: string; route: string }) => {
		try {
			const existingRaw = typeof window !== 'undefined' ? window.localStorage.getItem(RECENTS_KEY) : null
			let arr: Array<{ name: string; logo?: string; route: string; count: number; lastVisited: number }> = existingRaw
				? JSON.parse(existingRaw)
				: []

			const now = Date.now()
			const idx = arr.findIndex((x) => x.route === protocol.route)
			if (idx >= 0) {
				arr[idx].count = (arr[idx].count || 0) + 1
				arr[idx].lastVisited = now
			} else {
				arr.push({ ...protocol, count: 1, lastVisited: now })
			}

			arr = arr
				.sort((a, b) => {
					if (b.count !== a.count) return b.count - a.count
					return b.lastVisited - a.lastVisited
				})
				.slice(0, 6)

			window.localStorage.setItem(RECENTS_KEY, JSON.stringify(arr))
			setRecentProtocols(arr)
		} catch (e) {
			console.error('failed to save recent protocol', e)
		}
	}

	const handleSeeMore = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
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
		<Layout
			title={`Protocols Directory - DefiLlama`}
			description={`Protocols website directory on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`protocols directory, defi protocols`}
			canonicalUrl={`/directory`}
		>
			<Announcement notCancellable>
				Search any protocol to go straight into their website, avoiding scam results from Google. Bookmark this page for
				better access and security
			</Announcement>
			<Ariakit.ComboboxProvider
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value)
					})
				}}
			>
				{recentProtocols && recentProtocols.length > 0 ? (
					<div className="mx-auto mt-6 w-full max-w-3xl">
						<div className="mb-2 text-xs font-medium text-(--text-disabled)">Recently visited</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{recentProtocols.map((protocol) => (
								<button
									key={protocol.route}
									onClick={() => {
										if (typeof document !== 'undefined') {
											window.open(protocol.route, '_blank')
										}
										saveRecent(protocol)
									}}
									className="flex items-center gap-2 rounded-sm border bg-(--cards-bg) p-2 text-xs hover:bg-(--bg-secondary) dark:border-(--bg-secondary)"
								>
									{protocol.logo ? (
										<TokenLogo logo={protocol.logo} />
									) : (
										<div className="h-6 w-6 rounded bg-(--bg-secondary)" />
									)}
									<span className="truncate">{protocol.name}</span>
								</button>
							))}
						</div>
					</div>
				) : null}

				<span className="relative mx-auto w-full max-w-3xl">
					<Ariakit.Combobox
						placeholder="Search..."
						autoSelect
						autoFocus
						className="my-8 w-full rounded-t-md border border-[#ececec] bg-white p-3 pl-9 text-base text-black dark:border-[#2d2f36] dark:bg-black dark:text-white"
					/>
					<Icon name="search" height={18} width={18} className="absolute top-3.5 left-3 mt-8" />
				</span>
				<Ariakit.ComboboxPopover
					sameWidth
					open={true}
					className="thin-scrollbar top-1 z-10 h-full max-h-[320px] overflow-y-auto rounded-b-md border border-[hsl(204,20%,88%)] bg-(--bg-main) shadow-sm dark:border-[hsl(204,3%,32%)]"
				>
					{matches.length ? (
						<Ariakit.ComboboxList ref={comboboxRef}>
							{matches.slice(0, viewableMatches).map((option) => (
								<Ariakit.ComboboxItem
									key={option.name}
									value={option.name}
									onClick={() => {
										if (typeof document !== 'undefined') {
											window.open(option.route, '_blank')
										}
										saveRecent(option)
									}}
									focusOnHover
									hideOnClick={false}
									setValueOnClick={false}
									className="flex cursor-pointer items-center gap-4 p-3 text-(--text-primary) hover:bg-(--bg-secondary) aria-disabled:bg-(--bg-secondary) aria-disabled:opacity-50 aria-selected:bg-(--bg-secondary)"
								>
									{option.logo ? <TokenLogo logo={option.logo} /> : null}
									<span>{option.name}</span>
								</Ariakit.ComboboxItem>
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
		</Layout>
	)
}
