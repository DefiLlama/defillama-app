import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { Bell } from 'react-feather'
import styled, { keyframes } from 'styled-components'
import Tooltip from '~/components/Tooltip'
import { ResetAllButton } from '../v2Base'

export function NotifyButton() {
	const router = useRouter()

	// Ensured that link uses up-to-date query params from client-side
	// Related: https://nextjs.org/docs/advanced-features/automatic-static-optimization#caveats
	const queryParams = useMemo(() => {
		if (!router.isReady) return ''
		return router.asPath.split('?')[1] ?? ''
	}, [router.asPath, router.isReady])

	return (
		<Tooltip content="Be notified on your yields using the Hal app.">
			<NotifyIconButton
				data-variant="secondary"
				as="a"
				href={`https://app.hal.xyz/recipes/defi-llama/track-pools-list?${queryParams}`}
				rel="noopener noreferrer"
				target="_blank"
			>
				<Bell size={16} />
				Notify
			</NotifyIconButton>
		</Tooltip>
	)
}

const wiggle = keyframes`
	0% {
		transform: rotate(10deg);
	}

	50% {
		transform: rotate(-10deg);
	}

	100% {
		transform: rotate(0);
	}
`

const NotifyIconButton = styled(ResetAllButton)`
	display: flex;
	gap: 4px;
	:hover > svg {
		animation ${wiggle} 0.4s ease;
	}
`
