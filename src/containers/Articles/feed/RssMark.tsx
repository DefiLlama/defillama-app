import { ResearchIcon } from '~/components/ResearchIcon'

export function RssMark({ size = 20, className }: { size?: number; className?: string }) {
	return <ResearchIcon name="rss-mark" width={size} height={size} className={className} aria-hidden />
}
