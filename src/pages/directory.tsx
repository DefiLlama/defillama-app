import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import { Combobox, ComboboxItem, ComboboxPopover, useComboboxState } from 'ariakit/combobox'
import { Announcement } from '~/components/Announcement'
import { withPerformanceLogging } from '~/utils/perf'
import { useState } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { Icon } from '~/components/Icon'

export const getStaticProps = withPerformanceLogging('directory', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url'])
	return {
		props: {
			protocols: protocols.map((protocol) => ({
				name: protocol.name,
				logo: tokenIconUrl(protocol.name),
				route: protocol.url
			}))
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ protocols }) {
	const combobox = useComboboxState({
		gutter: 6,
		sameWidth: true,
		list: protocols.map((x) => x.name),
		flip: false,
		open: true
	})

	const onItemClick = (item) => {
		typeof window !== undefined && window.open(item.route, '_blank')
	}

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	const options = combobox.matches.map((o) => protocols.find((x) => x.name === o) ?? o)

	return (
		<Layout title={`Protocols Directory - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				Search any protocol to go straight into their website, avoiding scam results from google. Bookmark this page for
				better access and security
			</Announcement>

			<span className="w-full max-w-3xl mx-auto relative">
				<Combobox
					state={combobox}
					placeholder="Search..."
					autoSelect
					autoFocus
					className="p-3 pl-9 my-8 w-full rounded-t-md text-base bg-white text-black dark:bg-black dark:text-white border border-[#ececec] dark:border-[#2d2f36]"
				/>
				<Icon name="search" height={18} width={18} className="absolute top-[14px] mt-8 left-3" />
			</span>
			<ComboboxPopover
				className="h-full max-h-[320px] overflow-y-auto bg-[var(--bg6)] rounded-b-md shadow z-10 border border-[#ececec] dark:border-[#2d2f36]"
				state={combobox}
			>
				{!combobox.mounted ? (
					<p className="text-[var(--text1)] py-6 px-3 text-center">Loading...</p>
				) : combobox.matches.length ? (
					<>
						{options.slice(0, resultsLength + 1).map((token) => (
							<ComboboxItem
								key={token.name}
								value={token.name}
								onClick={(e) => {
									onItemClick(token)
								}}
								focusOnHover
								hideOnClick={false}
								setValueOnClick={false}
								className="p-3 flex items-center gap-4 text-[var(--text1)] cursor-pointer hover:bg-[var(--bg2)] aria-selected:bg-[var(--bg2)] aria-disabled:opacity-50 aria-disabled:bg-[var(--bg2)]"
							>
								{token.logo || token.fallbackLogo ? (
									<TokenLogo logo={token.logo} fallbackLogo={token.fallbackLogo} />
								) : null}
								<span>{token.name}</span>
							</ComboboxItem>
						))}

						{resultsLength < combobox.matches.length ? (
							<button
								className="text-left w-full pt-4 px-4 pb-7 text-[var(--link)] hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)]"
								onClick={showMoreResults}
							>
								See more...
							</button>
						) : null}
					</>
				) : (
					<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
				)}
			</ComboboxPopover>
		</Layout>
	)
}
