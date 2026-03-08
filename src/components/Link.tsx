import RouterLink from 'next/link'
import { useRouter } from 'next/router'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
	ref?: React.Ref<HTMLAnchorElement>
}

const UMAMI_EVENT_ATTRIBUTE = 'data-umami-event'
const UMAMI_EVENT_DATA_PREFIX = 'data-umami-event-'

function isExternalHref(href: string): boolean {
	return /^https?:\/\//.test(href)
}

export function BasicLink({ ref, onClick, href, ...props }: BasicLinkProps) {
	const isExternal = isExternalHref(href)
	const propsRecord = props as Record<string, unknown>
	const umamiEvent = typeof propsRecord[UMAMI_EVENT_ATTRIBUTE] === 'string' ? propsRecord[UMAMI_EVENT_ATTRIBUTE] : null

	const umamiData =
		isExternal && umamiEvent
			? Object.fromEntries(
					Object.entries(propsRecord)
						.filter(([key, value]) => key.startsWith(UMAMI_EVENT_DATA_PREFIX) && value !== undefined)
						.map(([key, value]) => [key.slice(UMAMI_EVENT_DATA_PREFIX.length), value])
				)
			: null

	const linkProps = { ...propsRecord }
	if (isExternal && umamiEvent) {
		delete linkProps[UMAMI_EVENT_ATTRIBUTE]
		for (const key of Object.keys(linkProps)) {
			if (key.startsWith(UMAMI_EVENT_DATA_PREFIX)) {
				delete linkProps[key]
			}
		}
	}

	const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
		onClick?.(event)
		if (event.defaultPrevented) return
		if (isExternal && umamiEvent) {
			trackUmamiEvent(umamiEvent, umamiData && Object.keys(umamiData).length > 0 ? umamiData : undefined)
		}
	}

	return (
		<RouterLink
			{...(linkProps as Omit<BasicLinkProps, 'href' | 'onClick' | 'ref'>)}
			href={href}
			ref={ref}
			onClick={handleClick}
			prefetch={props.prefetch ?? false}
		>
			{props.children}
		</RouterLink>
	)
}

export function ButtonLink({
	href,
	children,
	onClick,
	onAuxClick,
	...props
}: { href: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const router = useRouter()

	const openInNewTab = () => {
		window.open(href, '_blank', 'noopener,noreferrer')
	}

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		onClick?.(event)
		if (event.defaultPrevented) return
		if (event.metaKey || event.ctrlKey) {
			openInNewTab()
			return
		}

		void router.push(href)
	}

	const handleAuxClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		onAuxClick?.(event)
		if (event.defaultPrevented) return
		if (event.button !== 1) return

		event.preventDefault()
		openInNewTab()
	}

	return (
		<button {...props} type={props.type ?? 'button'} onClick={handleClick} onAuxClick={handleAuxClick}>
			{children}
		</button>
	)
}
