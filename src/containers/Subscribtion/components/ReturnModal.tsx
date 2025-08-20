import { useRouter } from 'next/router'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { BasicLink } from '~/components/Link'

interface ReturnModalProps {
	isOpen: boolean
	onClose: () => void
	returnUrl: string
}

export function ReturnModal({ isOpen, onClose, returnUrl }: ReturnModalProps) {
	const router = useRouter()

	const handleStayOnPage = () => {
		const { returnUrl, ...restQuery } = router.query
		router.replace(
			{
				pathname: router.pathname,
				query: restQuery
			},
			undefined,
			{ shallow: true }
		)
		onClose()
	}
	return (
		<SubscribeModal isOpen={isOpen} onClose={onClose}>
			<div className="max-w-[400px] p-8">
				<h2 className="mb-4 text-center text-2xl font-bold text-white">Welcome Back!</h2>
				<p className="mb-6 text-center text-gray-400">
					Would you like to return to the page you were on before signing in?
				</p>
				<div className="flex flex-col gap-3">
					<BasicLink
						href={returnUrl}
						className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 text-center font-medium text-white transition-colors hover:bg-[#4A4AF0]"
					>
						Yes, take me back
					</BasicLink>
					<button
						onClick={handleStayOnPage}
						className="w-full rounded-lg bg-[#22242930] px-4 py-3 font-medium text-white transition-colors hover:bg-[#39393E]"
					>
						Stay on this page
					</button>
				</div>
			</div>
		</SubscribeModal>
	)
}
