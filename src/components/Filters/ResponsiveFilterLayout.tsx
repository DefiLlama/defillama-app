import * as React from 'react'
import { NestedMenu } from '~/components/NestedMenu'
import { useIsClient } from '~/hooks/useIsClient'
import { useMedia } from '~/hooks/useMedia'

interface ResponsiveFilterLayoutProps {
	children: (nestedMenu: boolean) => React.ReactNode
	/** Additional className for the desktop wrapper div */
	desktopClassName?: string
}

export function ResponsiveFilterLayout({ children, desktopClassName }: ResponsiveFilterLayoutProps) {
	const isSmall = useMedia('(max-width: 639px)')
	const isClient = useIsClient()

	return (
		<>
			<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							{children(true)}
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className={desktopClassName ?? 'hidden min-h-8 flex-wrap gap-2 sm:flex'}>
				{!isSmall && isClient ? <React.Suspense fallback={<></>}>{children(false)}</React.Suspense> : null}
			</div>
		</>
	)
}
