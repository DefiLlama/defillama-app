/* 
TODO: This is a quick fix for images from external domains.
It should not be used long-term and images should still be 
retrieved from a known DefiLlama domain.
https://www.akmittal.dev/posts/nextjs-image-use-any-domain/
*/

export default async function getImage(req, res) {
	try {
		const url = decodeURIComponent(req.query.url)
		const result = await fetch(url)
		const body = await result.body
		body.pipe(res)
	} catch (e) {
		res.end()
	}
}
