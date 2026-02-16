import { SEO } from '~/components/SEO'
import { Logo } from '~/containers/SuperLuminal/Logo'
import { isSuperLuminalEnabled } from '~/containers/SuperLuminal/config'

export default function SuperLuminalPage() {
	if (!isSuperLuminalEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="Dashboard" description="Verified metrics dashboard powered by DefiLlama" />
			<div className="superluminal-dashboard col-span-full flex min-h-screen flex-col items-center justify-center bg-(--app-bg)">
				<Logo />
				<span className="mt-4 rounded-full border border-(--cards-border) bg-(--cards-bg) px-5 py-2.5 text-sm font-semibold tracking-wide text-(--text-secondary) shadow-lg">
					Coming Soon
				</span>
			</div>
		</>
	)
}
