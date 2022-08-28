import Layout from '~/layout'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { DesktopSearch } from '~/components/Search/Base'
import { tokenIconUrl } from '~/utils'
import { Banner } from '~/components/PageBanner'
import styled from 'styled-components'

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url'])
	return {
		props: {
			protocols: protocols.map((protocol) => ({
				name: protocol.name,
				logo: tokenIconUrl(protocol.name),
				route: protocol.url
			}))
		},
		revalidate: revalidate()
	}
}

export default function Protocols({ protocols }) {
	const onItemClick = (item) => {
		typeof window !== undefined && window.open(item.route, '_blank')
	}

	return (
		<Layout title={`Protocols Directory - DefiLlama`} defaultSEO>
			<Banner>
				Search any protocol to go straight into their website, avoiding scam results from google. Bookmark this page for
				better access and security
			</Banner>

			<Search data={protocols} defaultOpen={true} onItemClick={onItemClick} autoFocus />
		</Layout>
	)
}

const Search = styled(DesktopSearch)`
	margin: 20px 0;
	display: flex;

	input[data-focus-visible] {
		border-radius: 12px 12px 0 0;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 60px 0;
	}
`
