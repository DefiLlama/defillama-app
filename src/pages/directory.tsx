import Layout from '~/layout'
import { expiresForNext, maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import styled from 'styled-components'
import { useComboboxState } from 'ariakit'
import { Input } from '~/components/Search/Base/Input'
import { DesktopResults } from '~/components/Search/Base/Results/Desktop'
import Announcement from '~/components/Announcement'

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
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

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

	return (
		<Layout title={`Protocols Directory - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				Search any protocol to go straight into their website, avoiding scam results from google. Bookmark this page for
				better access and security
			</Announcement>

			<InputField state={combobox} placeholder="Search..." autoFocus />
			<Popover state={combobox} data={protocols} loading={false} onItemClick={onItemClick} />
		</Layout>
	)
}

const InputField = styled(Input)`
	max-width: 60rem;
	width: 100%;
	margin: -16px auto;
	box-shadow: ${({ theme }) => theme.shadow};
	border-radius: 12px 12px 0 0;

	& + button {
		display: none;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 60px auto;
	}
`

const Popover = styled(DesktopResults)`
	top: 1px;
`
