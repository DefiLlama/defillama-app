import pako from 'pako'

export function compressPageProps(data) {
	const strData = JSON.stringify(data)

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return compressed
}

export function decompressPageProps(data) {
	const b = new Uint8Array(Buffer.from(data, 'base64'))
	return JSON.parse(pako.inflate(b, { to: 'string' }))
}
