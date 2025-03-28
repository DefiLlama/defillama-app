import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Icon } from '~/components/Icon'

export const SignInWithGithub = ({ className, onSuccess }: { className?: string; onSuccess?: () => void }) => {
	const { signInWithGithub, loaders } = useAuthContext()

	const handleGithubSignIn = async () => {
		try {
			await signInWithGithub(onSuccess)
		} catch (error) {
			console.error('Error signing in with GitHub:', error)
		}
	}

	return (
		<button
			className={
				className ??
				'bg-[#222429] hover:bg-[#2a2b30] text-white font-medium rounded-lg border border-[#39393E] py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
			}
			onClick={handleGithubSignIn}
			disabled={loaders.signInWithGithub}
		>
			<Icon name="github" height={18} width={18} />
			{loaders.signInWithGithub ? 'Connecting...' : 'Sign in with GitHub'}
		</button>
	)
}
