import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'

export const SignInWithGithub = ({ className, onSuccess }: { className?: string; onSuccess?: () => void }) => {
	const { signInWithGithub, loaders } = useAuthContext()

	const handleGithubSignIn = async () => {
		try {
			await signInWithGithub(onSuccess)
		} catch (error) {
			console.log('Error signing in with GitHub:', error)
		}
	}

	return (
		<button
			className={
				className ??
				'flex items-center justify-center gap-2 rounded-lg border border-[#39393E] bg-[#222429] px-4 py-3 font-medium text-white transition-all duration-200 hover:bg-[#2a2b30] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
			}
			onClick={handleGithubSignIn}
			disabled={loaders.signInWithGithub}
		>
			<Icon name="github" height={18} width={18} />
			{loaders.signInWithGithub ? 'Connecting...' : 'Sign in with GitHub'}
		</button>
	)
}
