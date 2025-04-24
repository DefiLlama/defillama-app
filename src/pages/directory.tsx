import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import { Announcement } from '~/components/Announcement'
import { withPerformanceLogging } from '~/utils/perf'
import { startTransition, useMemo, useState } from 'react'
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

	const matches = useMemo(() => {
		return matchSorter(protocols as Array<{ name: string; logo: string; route: string }>, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [protocols, searchValue])

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
				<span className="w-full max-w-3xl mx-auto relative">
					<Ariakit.Combobox
						placeholder="Search..."
						autoSelect
						autoFocus
						className="p-3 pl-9 my-8 w-full rounded-t-md text-base bg-white text-black dark:bg-black dark:text-white border border-[#ececec] dark:border-[#2d2f36]"
					/>
					<Icon name="search" height={18} width={18} className="absolute top-[14px] mt-8 left-3" />
				</span>
				<Ariakit.ComboboxPopover
					sameWidth
					open={true}
					className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg1)] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] rounded-b-md shadow z-10"
				>
					{matches.length ? (
						<>
							{matches.slice(0, viewableMatches + 1).map((option) => (
								<Ariakit.ComboboxItem
									key={option.name}
									value={option.name}
									onClick={(e) => {
										typeof document !== undefined && window.open(option.route, '_blank')
									}}
									focusOnHover
									hideOnClick={false}
									setValueOnClick={false}
									className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer hover:bg-[var(--bg2)] aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
								>
									{option.logo ? <TokenLogo logo={option.logo} /> : null}
									<span>{option.name}</span>
								</Ariakit.ComboboxItem>
							))}

							{matches.length > viewableMatches ? (
								<button
									className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
									onClick={() => setViewableMatches((prev) => prev + 20)}
								>
									See more...
								</button>
							) : null}
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.ComboboxPopover>
			</Ariakit.ComboboxProvider>
		</Layout>
	)
}
