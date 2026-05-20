type AxiomClient = {
	ingest(dataset: string, events: AxiomOutboundEvent[]): Promise<unknown> | unknown
	flush(): Promise<unknown> | unknown
}

type AxiomOutboundEvent = {
	source: 'app'
	domain: string
	section?: string
	subRoute: string
	method: string
	durationMs: number
	responseBytes?: number
	httpStatus: number
	status: string
	_time: string
}

export type AxiomOutboundUrlParts = {
	domain: string
	section?: string
	subRoute: string
}

export type AxiomOutboundLogInput = {
	sanitizedUrl: string
	method: string
	durationMs: number
	responseBytes?: number
	httpStatus: number
	status: string
}

let client: AxiomClient | null = null
let clientPromise: Promise<AxiomClient | null> | null = null

function axiomDataset(): string {
	return process.env.AXIOM_DATASET || 'defillama-app-usage'
}

async function getClient(): Promise<AxiomClient | null> {
	if (typeof window !== 'undefined') return null

	const token = process.env.AXIOM_TOKEN
	if (!token) return null
	if (client) return client
	if (clientPromise) return clientPromise

	clientPromise = import('@axiomhq/js')
		.then(({ Axiom }) => {
			client = new Axiom({ token, onError: () => {} })
			return client
		})
		.catch(() => {
			clientPromise = null
			return null
		})

	return clientPromise
}

function subRouteFromCallParams(callParams: string[]): string {
	const [first, second] = callParams
	if (first === 'v2' && second) return second
	return first ?? ''
}

export function parseAxiomOutboundUrl(sanitizedUrl: string): AxiomOutboundUrlParts | null {
	try {
		const parsed = new URL(sanitizedUrl)
		const pathParts = parsed.pathname.split('/').filter(Boolean)

		if (parsed.hostname === 'pro-api.llama.fi') {
			const [, section, ...callParams] = pathParts
			return {
				domain: parsed.host,
				...(section ? { section } : null),
				subRoute: subRouteFromCallParams(callParams)
			}
		}

		return {
			domain: parsed.host,
			subRoute: subRouteFromCallParams(pathParts)
		}
	} catch {
		return null
	}
}

export function logOutboundToAxiom(input: AxiomOutboundLogInput): void {
	if (typeof window !== 'undefined') return

	const urlParts = parseAxiomOutboundUrl(input.sanitizedUrl)
	if (!urlParts) return

	const event: AxiomOutboundEvent = {
		source: 'app',
		domain: urlParts.domain,
		...(urlParts.section ? { section: urlParts.section } : null),
		subRoute: urlParts.subRoute,
		method: input.method,
		durationMs: input.durationMs,
		...(input.responseBytes !== undefined ? { responseBytes: input.responseBytes } : null),
		httpStatus: input.httpStatus,
		status: input.status,
		_time: new Date().toISOString()
	}

	void getClient()
		.then(async (axiom) => {
			if (!axiom) return
			await axiom.ingest(axiomDataset(), [event])
		})
		.catch(() => {})
}

export async function flushAxiom(): Promise<void> {
	try {
		if (typeof window !== 'undefined') return
		const axiom = await getClient()
		if (!axiom) return
		await axiom.flush()
	} catch {
		// Axiom logging must never affect page/API work or process shutdown.
	}
}
