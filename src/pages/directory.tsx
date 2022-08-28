import Layout from '~/layout'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { DesktopSearch } from '~/components/Search/Base'
import { tokenIconUrl } from '~/utils'

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
			<DesktopSearch data={protocols} defaultOpen={true} onItemClick={onItemClick} autoFocus />
		</Layout>
	)
}
