import Router from 'next/router'
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'

interface ProjectHomeSignal {
	value: number
	bump: () => void
}

const ProjectHomeSignalContext = createContext<ProjectHomeSignal | null>(null)

export function LlamaAINavigateProvider({ children }: PropsWithChildren) {
	const [value, setValue] = useState(0)
	const bump = useCallback(() => setValue((v) => v + 1), [])
	const signal = useMemo<ProjectHomeSignal>(() => ({ value, bump }), [value, bump])
	return <ProjectHomeSignalContext.Provider value={signal}>{children}</ProjectHomeSignalContext.Provider>
}

export function useProjectHomeSignal() {
	return useContext(ProjectHomeSignalContext)?.value ?? 0
}

export function useLlamaAINavigate() {
	const projectHome = useContext(ProjectHomeSignalContext)

	return useMemo(
		() => ({
			toNewChat: () => Router.push('/ai/chat'),
			toSession: (id: string, opts?: { replace?: boolean; around?: string }) => {
				const hash = opts?.around ? `#msg-${opts.around}` : ''
				const url = `/ai/chat/${id}${hash}`
				return opts?.replace ? Router.replace(url) : Router.push(url)
			},
			toProject: (id: string, tab?: 'chats' | 'sources') => {
				// Always bump the project-home signal so AgenticChat resets to the project landing
				// even when the click is to the same /ai/projects/[id] URL we're already on.
				projectHome?.bump()
				return Router.push(`/ai/projects/${id}${tab === 'sources' ? '?tab=sources' : ''}`)
			},
			refineCurrent: (asUrl: string) => Router.replace(asUrl, undefined, { shallow: true })
		}),
		[projectHome]
	)
}
