import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from 'react-query'
import { SERVER_API } from '../lib/constants'

const validateEmail = (email: string) => {
	const re = /\S+@\S+\.\S+/
	return re.test(email)
}

const saveEmail = async ({ authToken, email }: { authToken?: string | null; email: string }) => {
	const toastId = toast.loading('Saving Email')
	try {
		if (!authToken) {
			throw new Error('Not Authorized')
		}

		if (!validateEmail(email)) {
			throw new Error('Invalid email')
		}
		const newEmail = await fetch(`${SERVER_API}/save-email`, {
			method: 'POST',
			headers: {
				Authorization: authToken,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email })
		}).then((r) => r.json())
		if (!newEmail) {
			throw new Error('Failed to save email')
		}
		return newEmail?.email ?? null
	} catch (error: any) {
		toast.error(error.message)
		throw new Error(error.message)
	} finally {
		toast.dismiss(toastId)
	}
}

const useSaveEmail = ({ authToken }: { authToken?: string | null }) => {
	const queryClient = useQueryClient()
	return useMutation(saveEmail, {
		onSuccess: () => {
			toast.success('Email saved')
			queryClient.invalidateQueries()
		}
	})
}

export { useSaveEmail }
