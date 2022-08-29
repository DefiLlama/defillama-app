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

			<Search data={protocols} open={true} flip={false} onItemClick={onItemClick} autoFocus />
		</Layout>
	)
}

const Search = styled(DesktopSearch)`
	display: flex !important;
	max-width: 60rem;
	width: 100%;
	margin: -16px auto;

	input {
		box-shadow: ${({ theme }) => theme.shadow};
		border-radius: 6px;
	}

	input + button {
		display: none;
	}

	div[role='presentation'] {
		& > * {
			border-radius: 6px !important;
		}

		& > div[data-dialog] {
			top: 6px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 60px auto;
	}
`
