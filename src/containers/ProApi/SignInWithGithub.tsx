import { useRouter } from 'next/router'
import { GH_CLIENT_ID } from './lib/constants'
import useGithubAuth from './queries/useGithubAuth'
import { Icon } from '~/components/Icon'

const SignInWithGithub = () => {
	const { data: auth } = useGithubAuth()
	const router = useRouter()

	if (auth?.login && !auth?.isContributor) {
		return (
			<div>
				<button
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
					className="shadow p-2 rounded-lg text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]"
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</button>
				<p className="text-sm text-center mt-3 text-[var(--text2)]">
					You are not a contributor. You need to contribute to the DefiLlama project to get free access to the premium
					API.
				</p>
			</div>
		)
	}
	if (auth?.login && auth?.isContributor) {
		return (
			<div>
				<button
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
					className="shadow p-2 rounded-lg text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]"
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</button>
				<p className="text-sm text-center mt-3 text-[var(--text2)]">You have free access to the premium API.</p>
			</div>
		)
	}
	return (
		<div>
			<a href={`https://github.com/login/oauth/authorize?client_id=${GH_CLIENT_ID}`}>
				<button className="shadow p-2 rounded-lg text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]">
					Sign in with GitHub <Icon name="github" height={24} width={24} />
				</button>
			</a>
			<p className="text-sm text-center mt-3 text-[var(--text2)]">
				DefiLlama contributors will have free 3 month access to premium API.
			</p>
		</div>
	)
}

export default SignInWithGithub
