import RouterLink from 'next/link'

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
