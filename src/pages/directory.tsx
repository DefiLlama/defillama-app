import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import { Announcement } from '~/components/Announcement'
import { withPerformanceLogging } from '~/utils/perf'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'

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

export default function Protocols({ protocols }) {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)
	const matches = useMemo(() => {
		return matchSorter(protocols as Array<{ name: string; logo: string; route: string }>, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [protocols, deferredSearchValue])

	const [viewableMatches, setViewableMatches] = useState(20)

	return (
		<Layout title={`Protocols Directory - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				Search any protocol to go straight into their website, avoiding scam results from google. Bookmark this page for
				better access and security
			</Announcement>
			<Ariakit.ComboboxProvider
				setValue={(value) => {
					startTransition(() => {
						setSearchValue(value)
					})
				}}
			>
				<span className="relative mx-auto w-full max-w-3xl">
					<Ariakit.Combobox
						placeholder="Search..."
						autoSelect
						autoFocus
						className="my-8 w-full rounded-t-md border border-[#ececec] bg-white p-3 pl-9 text-base text-black dark:border-[#2d2f36] dark:bg-black dark:text-white"
					/>
					<Icon name="search" height={18} width={18} className="absolute top-[14px] left-3 mt-8" />
				</span>
				<Ariakit.ComboboxPopover
					sameWidth
					open={true}
					className="z-10 h-full max-h-[320px] overflow-y-auto rounded-b-md border border-[hsl(204,20%,88%)] bg-(--bg-main) shadow-sm dark:border-[hsl(204,3%,32%)]"
				>
					{matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Ariakit.ComboboxItem
									key={option.name}
									value={option.name}
									onClick={() => {
										if (typeof document !== 'undefined') {
											window.open(option.route, '_blank')
										}
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
								<button
									className="w-full px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</Layout>
	)
}
