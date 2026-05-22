import { useQuery } from '@tanstack/react-query'
import { listSlackChannels } from '~/containers/LlamaAI/api/slack'
import { useAuthContext } from '~/containers/Subscription/auth'

export function useSlackChannels(teamId: string | null | undefined) {
	const { authorizedFetch, user } = useAuthContext()
	const userId = user?.id ?? null
	return useQuery({
		queryKey: ['llama-ai', 'slack-channels', userId, teamId],
		queryFn: () => listSlackChannels(authorizedFetch, teamId as string),
		enabled: !!userId && !!teamId,
		staleTime: 60_000
	})
}
