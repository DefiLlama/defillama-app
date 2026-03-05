import RouterLink from 'next/link'
import { useRouter } from 'next/router'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
	ref?: React.Ref<HTMLAnchorElement>
}

export function BasicLink({ ref, ...props }: BasicLinkProps) {
	return (
		<RouterLink {...props} ref={ref} prefetch={props.prefetch ?? false}>
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
