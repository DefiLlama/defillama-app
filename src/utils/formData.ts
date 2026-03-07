export function getFormString(formData: FormData, key: string): string {
	const value = formData.get(key)
	return typeof value === 'string' ? value : ''
}
