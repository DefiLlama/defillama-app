import { useMedia } from '~/hooks/useMedia'
import { LinksWithDropdown } from './LinksWithDropdown'
import { OtherLinks } from './OtherLinks'
import { useIsClient } from '~/hooks'

interface ILink {
	label: string
	to: string
}

interface IRowLinksProps {
	links: ILink[]
	activeLink?: string
	alternativeOthersText?: string
}

export const RowLinksWithDropdown = (props: IRowLinksProps) => {
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const isClient = useIsClient()

	if (isSmall && isClient) {
		return (
			<OtherLinks
				name={
					props.links.find((link) => link.label === props.activeLink)
						? props.activeLink
						: props.alternativeOthersText ?? 'Others'
				}
				options={props.links}
				isActive={true}
				className="w-full justify-between"
			/>
		)
	}

	return <LinksWithDropdown {...props} />
}
