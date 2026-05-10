import type {
	GetServerSideProps,
	GetServerSidePropsContext,
	GetServerSidePropsResult,
	GetStaticPropsResult,
	NextApiHandler,
	NextApiRequest,
	NextApiResponse
} from 'next'
import { readCacheJitterMeta } from '~/utils/maxAgeForNext'

type TelemetryRuntime = 'node' | 'browser' | 'lambda' | 'build'
type RouteStatus = 'success' | 'slow' | 'timeout' | 'error'
type OutboundStatus = 'success' | 'slow' | 'timeout' | 'http_error' | 'network_error' | 'error'
type OperationType = 'getStaticProps' | 'getServerSideProps' | 'apiRoute'
type RuntimeErrorPhase =
	| 'getStaticProps'
	| 'getServerSideProps'
	| 'apiRoute'
	| 'outboundFetch'
	| 'pageBuild'
	| 'clientRuntime'
	| 'unknown'

type TelemetryAttributes = Record<string, unknown>

type RouteExecutionEvent = {
	type: 'route_execution'
	trace_id: string
	span_id: string
	parent_span_id?: string
	route: string
	operation_type: OperationType
	method?: string
	request_path?: string
	started_at: string
	ended_at?: string
	duration_ms?: number
	status: RouteStatus
	http_status?: number
	error_name?: string
	error_message?: string
	error_stack?: string
	attributes?: TelemetryAttributes
}

type OutboundHttpRequestEvent = {
	type: 'outbound_http_request'
	trace_id: string
	span_id: string
	parent_span_id: string
	method: string
	url: string
	host?: string
	pathname?: string
	started_at: string
	ended_at?: string
	duration_ms?: number
	status: OutboundStatus
	http_status?: number
	timeout_ms?: number
	attempt?: number
	max_attempts?: number
	error_name?: string
	error_message?: string
	error_stack?: string
	attributes?: TelemetryAttributes
}

type RuntimeErrorEvent = {
	type: 'runtime_error'
	trace_id?: string
	span_id?: string
	parent_span_id?: string
	route?: string
	phase: RuntimeErrorPhase
	occurred_at: string
	error_name?: string
	error_message: string
	error_stack?: string
	attributes?: TelemetryAttributes
}

type PageBuildFinishTickEvent = {
	type: 'page_build_finish_tick'
	trace_id?: string
	span_id?: string
	parent_span_id?: string
	route: string
	finished_at: string
	previous_finished_at?: string
	gap_ms?: number
	status: RouteStatus
	attributes?: TelemetryAttributes
}

type DomainEvent = {
	type: 'domain_event'
	trace_id?: string
	span_id?: string
	parent_span_id?: string
	route?: string
	event_name: 'token_rights.alert'
	level: 'info' | 'warn' | 'error'
	occurred_at: string
	subject?: string
	message?: string
	attributes?: TelemetryAttributes
}

export type TelemetryEvent =
	| RouteExecutionEvent
	| OutboundHttpRequestEvent
	| RuntimeErrorEvent
	| PageBuildFinishTickEvent
	| DomainEvent

type RouteTelemetryContext = {
	traceId: string
	spanId: string
	route: string
	operationType: OperationType
	attributes: TelemetryAttributes
	error?: ReturnType<typeof errorFields>
	outboundCount: number
}

type PendingBatch = {
	idempotencyKey: string
	events: TelemetryEvent[]
}

type RouteTelemetryOptions<T> = {
	route: string
	operationType: OperationType
	runtime: TelemetryRuntime
	method?: string
	requestPath?: string
	flushTimeoutMs?: number
	attributes?: TelemetryAttributes
	getResultAttributes?: (result: T, durationMs: number, context: RouteTelemetryContext) => TelemetryAttributes
	getHttpStatus?: (result: T) => number | undefined
	getStatus?: (result: T, durationMs: number) => RouteStatus
}

type OutboundTelemetryOptions = {
	attempt?: number
	maxAttempts?: number
	singleflightRole?: 'leader'
}

type AsyncLocalStorageLike<T> = {
	run<R>(store: T, callback: () => R): R
	getStore(): T | undefined
}

let telemetryContext: AsyncLocalStorageLike<RouteTelemetryContext> | null = null
const queue: TelemetryEvent[] = []

let retryBatch: PendingBatch | null = null
let flushPromise: Promise<void> | null = null
let consecutiveFailures = 0
let circuitOpenUntil = 0
let previousPageBuildFinishedAt: string | undefined

function getEnvNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

function telemetryEndpoint(): string | null {
	const endpoint = process.env.OPS_TELEMETRY_URL
	if (!endpoint || !process.env.OPS_TELEMETRY_TOKEN) return null
	return endpoint
}

function telemetryEnabled(): boolean {
	return typeof window === 'undefined' && telemetryEndpoint() !== null
}

function batchSize(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_BATCH_SIZE', 50))
}

function queueMax(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_QUEUE_MAX', 1000))
}

function flushRequestTimeoutMs(timeoutMs: number): number {
	return Math.max(1, Math.min(timeoutMs, getEnvNumber('OPS_TELEMETRY_SEND_TIMEOUT_MS', 1000)))
}

function circuitCooldownMs(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_CIRCUIT_COOLDOWN_MS', 30_000))
}

export function slowRouteThresholdMs(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_SLOW_ROUTE_MS', 10_000))
}

export function slowUpstreamThresholdMs(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_SLOW_UPSTREAM_MS', 3_000))
}

export function largePageBuildFinishGapMs(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_LARGE_PAGE_BUILD_GAP_MS', 30_000))
}

function requestBodyMaxBytes(): number {
	return Math.max(1, getEnvNumber('OPS_TELEMETRY_REQUEST_BODY_MAX_BYTES', 4_096))
}

function isCircuitOpen(): boolean {
	return Date.now() < circuitOpenUntil
}

function newId(): string {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function nowIso(): string {
	return new Date().toISOString()
}

function producer(runtime: TelemetryRuntime) {
	const serviceVersion = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

	return {
		app: 'defillama-app',
		env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
		...(serviceVersion ? { serviceVersion } : null),
		runtime
	}
}

function errorFields(error: unknown): { error_name?: string; error_message: string; error_stack?: string } {
	if (error instanceof Error) {
		return {
			error_name: error.name,
			error_message: error.message,
			...(error.stack ? { error_stack: error.stack } : null)
		}
	}

	return { error_message: String(error) }
}

export function getPayloadBytes(value: unknown): number | undefined {
	try {
		return Buffer.byteLength(JSON.stringify(value))
	} catch {
		return undefined
	}
}

function mergeAttributes(context: RouteTelemetryContext, attributes?: TelemetryAttributes): TelemetryAttributes {
	const merged: TelemetryAttributes = {}

	for (const key in context.attributes) {
		merged[key] = context.attributes[key]
	}

	for (const key in attributes) {
		merged[key] = attributes[key]
	}

	merged.outbound_count = context.outboundCount
	return merged
}

function copyAttributes(attributes?: TelemetryAttributes): TelemetryAttributes {
	const copied: TelemetryAttributes = {}

	for (const key in attributes) {
		copied[key] = attributes[key]
	}

	return copied
}

function hasAttributes(attributes: TelemetryAttributes): boolean {
	for (const key in attributes) {
		void key
		return true
	}
	return false
}

function mergeRuntimeErrorAttributes(
	context: RouteTelemetryContext | undefined,
	attributes?: TelemetryAttributes
): TelemetryAttributes | undefined {
	const merged = context ? copyAttributes(context.attributes) : {}

	for (const key in attributes) {
		merged[key] = attributes[key]
	}

	return hasAttributes(merged) ? merged : undefined
}

async function getTelemetryContextStorage(): Promise<AsyncLocalStorageLike<RouteTelemetryContext>> {
	if (telemetryContext) return telemetryContext

	const { AsyncLocalStorage } = await import(/* webpackIgnore: true */ 'async_hooks')
	telemetryContext = new AsyncLocalStorage<RouteTelemetryContext>()
	return telemetryContext
}

export function currentTelemetryContext(): RouteTelemetryContext | undefined {
	return telemetryContext?.getStore()
}

export function addRouteTelemetryAttributes(attributes: TelemetryAttributes): void {
	const context = currentTelemetryContext()
	if (!context) return

	for (const key in attributes) {
		context.attributes[key] = attributes[key]
	}
}

export function recordTelemetry(event: TelemetryEvent): void {
	try {
		if (!telemetryEnabled()) return

		while (queue.length >= queueMax()) {
			queue.shift()
		}

		queue.push(event)

		if (queue.length >= batchSize() && !isCircuitOpen()) {
			void flushTelemetry({ timeoutMs: getEnvNumber('OPS_TELEMETRY_BACKGROUND_FLUSH_MS', 1000) })
		}
	} catch {
		// Telemetry must never affect page/API work.
	}
}

function nextBatch(): PendingBatch | null {
	if (retryBatch) return retryBatch
	if (queue.length === 0) return null

	const events: TelemetryEvent[] = []
	const max = Math.min(batchSize(), queue.length)
	for (let i = 0; i < max; i++) {
		const event = queue.shift()
		if (event) events.push(event)
	}

	return {
		idempotencyKey: newId(),
		events
	}
}

async function sendBatch(batch: PendingBatch, runtime: TelemetryRuntime, timeoutMs: number): Promise<boolean> {
	const endpoint = telemetryEndpoint()
	const token = process.env.OPS_TELEMETRY_TOKEN
	if (!endpoint || !token) return true

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), flushRequestTimeoutMs(timeoutMs))

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Idempotency-Key': batch.idempotencyKey
			},
			body: JSON.stringify({
				schemaVersion: 1,
				sentAt: nowIso(),
				producer: producer(runtime),
				events: batch.events
			}),
			signal: controller.signal
		})

		return response.ok
	} catch {
		return false
	} finally {
		clearTimeout(timeoutId)
	}
}

async function flushLoop(timeoutMs: number, runtime: TelemetryRuntime): Promise<void> {
	const deadline = Date.now() + timeoutMs

	while (telemetryEnabled() && (retryBatch || queue.length > 0)) {
		const remaining = deadline - Date.now()
		if (remaining <= 0 || isCircuitOpen()) return

		const batch = nextBatch()
		if (!batch) return
		retryBatch = batch

		const sent = await sendBatch(batch, runtime, remaining)
		if (!sent) {
			consecutiveFailures++
			if (consecutiveFailures >= 3) {
				circuitOpenUntil = Date.now() + circuitCooldownMs()
			}
			return
		}

		retryBatch = null
		consecutiveFailures = 0
	}
}

export async function flushTelemetry(options?: { timeoutMs?: number; runtime?: TelemetryRuntime }): Promise<void> {
	try {
		if (!telemetryEnabled()) return

		const timeoutMs = options?.timeoutMs ?? 1000
		const runtime = options?.runtime ?? 'node'

		if (flushPromise) {
			await Promise.race([flushPromise, sleep(timeoutMs)])
			return
		}

		flushPromise = flushLoop(timeoutMs, runtime).finally(() => {
			flushPromise = null
		})

		await Promise.race([flushPromise, sleep(timeoutMs)])
	} catch {
		// Telemetry must never affect page/API work.
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function routeStatus(durationMs: number, error?: unknown): RouteStatus {
	if (error) return 'error'
	if (durationMs > slowRouteThresholdMs()) return 'slow'
	return 'success'
}

function errorRouteStatus(error: unknown): RouteStatus {
	return error instanceof Error && error.name === 'PageBuildTimeoutError' ? 'timeout' : 'error'
}

export function recordRuntimeError(error: unknown, phase: RuntimeErrorPhase, attributes?: TelemetryAttributes): void {
	const context = currentTelemetryContext()
	const fields = errorFields(error)
	const mergedAttributes = mergeRuntimeErrorAttributes(context, attributes)
	recordTelemetry({
		type: 'runtime_error',
		trace_id: context?.traceId,
		span_id: newId(),
		parent_span_id: context?.spanId,
		route: context?.route,
		phase,
		occurred_at: nowIso(),
		...fields,
		...(mergedAttributes ? { attributes: mergedAttributes } : null)
	})
}

export function recordRouteRuntimeError(
	error: unknown,
	phase: RuntimeErrorPhase = 'unknown',
	attributes?: TelemetryAttributes
): void {
	const context = currentTelemetryContext()
	if (context) {
		context.error = errorFields(error)
	}
	recordRuntimeError(error, phase, attributes)
}

export function recordDomainEvent(
	eventName: DomainEvent['event_name'],
	level: DomainEvent['level'],
	subject: string,
	message: string,
	attributes?: TelemetryAttributes
): void {
	const context = currentTelemetryContext()
	recordTelemetry({
		type: 'domain_event',
		trace_id: context?.traceId,
		span_id: newId(),
		parent_span_id: context?.spanId,
		route: context?.route,
		event_name: eventName,
		level,
		occurred_at: nowIso(),
		subject,
		message,
		...(attributes ? { attributes } : null)
	})
}

export async function withRouteTelemetry<T>(options: RouteTelemetryOptions<T>, run: () => T | Promise<T>): Promise<T> {
	if (!telemetryEnabled()) return run()

	const storage = await getTelemetryContextStorage()
	const context: RouteTelemetryContext = {
		traceId: newId(),
		spanId: newId(),
		route: options.route,
		operationType: options.operationType,
		attributes: copyAttributes(options.attributes),
		outboundCount: 0
	}
	const startedAt = nowIso()
	const started = Date.now()
	let result: T | undefined

	try {
		result = await storage.run(context, run)
		const durationMs = Date.now() - started
		const extraAttributes = options.getResultAttributes?.(result, durationMs, context)
		const status = options.getStatus?.(result, durationMs) ?? routeStatus(durationMs)

		recordTelemetry({
			type: 'route_execution',
			trace_id: context.traceId,
			span_id: context.spanId,
			route: options.route,
			operation_type: options.operationType,
			...(options.method ? { method: options.method } : null),
			...(options.requestPath ? { request_path: options.requestPath } : null),
			started_at: startedAt,
			ended_at: nowIso(),
			duration_ms: durationMs,
			status,
			http_status: options.getHttpStatus?.(result),
			...context.error,
			attributes: mergeAttributes(context, extraAttributes)
		})

		if (options.operationType === 'getStaticProps') {
			recordPageBuildFinishTick(options.route, context, status, durationMs)
		}

		void flushTelemetry({ timeoutMs: options.flushTimeoutMs ?? 200, runtime: options.runtime })
		return result
	} catch (error) {
		const durationMs = Date.now() - started
		const fields = errorFields(error)
		const status = errorRouteStatus(error)
		const mergedErrorAttributes = mergeRuntimeErrorAttributes(context)

		recordTelemetry({
			type: 'route_execution',
			trace_id: context.traceId,
			span_id: context.spanId,
			route: options.route,
			operation_type: options.operationType,
			...(options.method ? { method: options.method } : null),
			...(options.requestPath ? { request_path: options.requestPath } : null),
			started_at: startedAt,
			ended_at: nowIso(),
			duration_ms: durationMs,
			status,
			...fields,
			attributes: mergeAttributes(context)
		})
		recordTelemetry({
			type: 'runtime_error',
			trace_id: context.traceId,
			span_id: newId(),
			parent_span_id: context.spanId,
			route: context.route,
			phase: options.operationType,
			occurred_at: nowIso(),
			...fields,
			...(mergedErrorAttributes ? { attributes: mergedErrorAttributes } : null)
		})

		if (options.operationType === 'getStaticProps') {
			recordPageBuildFinishTick(options.route, context, status, durationMs)
		}

		void flushTelemetry({ timeoutMs: options.flushTimeoutMs ?? 200, runtime: options.runtime })
		throw error
	}
}

function recordPageBuildFinishTick(
	route: string,
	context: RouteTelemetryContext,
	status: RouteStatus,
	durationMs: number
): void {
	const finishedAt = nowIso()
	const previousFinishedAt = previousPageBuildFinishedAt
	previousPageBuildFinishedAt = finishedAt
	const gapMs = previousFinishedAt ? Date.parse(finishedAt) - Date.parse(previousFinishedAt) : undefined

	recordTelemetry({
		type: 'page_build_finish_tick',
		trace_id: context.traceId,
		span_id: newId(),
		parent_span_id: context.spanId,
		route,
		finished_at: finishedAt,
		...(previousFinishedAt ? { previous_finished_at: previousFinishedAt, gap_ms: gapMs } : null),
		status,
		attributes: {
			...context.attributes,
			duration_ms: durationMs,
			...(gapMs !== undefined && gapMs > largePageBuildFinishGapMs() ? { large_gap: true } : null)
		}
	})
}

function getRequestPath(req: NextApiRequest): string | undefined {
	if (!req.url) return undefined
	return sanitizeRequestPathString(req.url)
}

function sanitizeRequestPathString(url: string): string {
	try {
		return sanitizeRequestPathForTelemetry(new URL(url, 'http://localhost'))
	} catch {
		return redactSecrets(url)
	}
}

function hasQuery(req: NextApiRequest): boolean {
	for (const key in req.query) {
		void key
		return true
	}
	return false
}

function apiRouteTelemetryAttributes(req: NextApiRequest): TelemetryAttributes | undefined {
	return hasQuery(req) ? { query: sanitizeQueryForTelemetry(req.query) } : undefined
}

export function withApiRouteTelemetry(route: string, handler: NextApiHandler): NextApiHandler {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		let responseBytes: number | undefined
		let suppressResponseByteCapture = false
		const originalJson = res.json
		const originalSend = res.send
		const originalWrite = res.write
		const originalEnd = res.end
		const write = originalWrite.bind(res)
		const end = originalEnd.bind(res)

		const addResponseBytes = (bytes: number | undefined) => {
			if (bytes === undefined) return
			responseBytes = (responseBytes ?? 0) + bytes
			addRouteTelemetryAttributes({ response_bytes: responseBytes })
		}

		res.json = ((body: unknown) => {
			addResponseBytes(getPayloadBytes(body))
			suppressResponseByteCapture = true
			try {
				return originalJson.call(res, body)
			} finally {
				suppressResponseByteCapture = false
			}
		}) as NextApiResponse['json']

		res.send = ((body: unknown) => {
			if (!suppressResponseByteCapture) addResponseBytes(payloadBytes(body))
			suppressResponseByteCapture = true
			try {
				return originalSend.call(res, body)
			} finally {
				suppressResponseByteCapture = false
			}
		}) as NextApiResponse['send']

		res.write = ((
			chunk: Parameters<NextApiResponse['write']>[0],
			encodingOrCallback?: BufferEncoding | (() => void),
			callback?: () => void
		) => {
			if (!suppressResponseByteCapture) addResponseBytes(payloadBytes(chunk))
			if (typeof encodingOrCallback === 'function') return write(chunk, encodingOrCallback)
			if (encodingOrCallback && callback) return write(chunk, encodingOrCallback, callback)
			if (encodingOrCallback) return write(chunk, encodingOrCallback)
			return write(chunk)
		}) as NextApiResponse['write']

		res.end = ((
			chunk?: Parameters<NextApiResponse['end']>[0],
			encodingOrCallback?: BufferEncoding | (() => void),
			callback?: () => void
		) => {
			if (!suppressResponseByteCapture) addResponseBytes(payloadBytes(chunk))
			if (typeof chunk === 'function') return end(chunk)
			if (typeof encodingOrCallback === 'function') return end(chunk, encodingOrCallback)
			if (encodingOrCallback && callback) return end(chunk, encodingOrCallback, callback)
			if (encodingOrCallback) return end(chunk, encodingOrCallback)
			if (chunk !== undefined) return end(chunk)
			return end()
		}) as NextApiResponse['end']

		try {
			return await withRouteTelemetry(
				{
					route,
					operationType: 'apiRoute',
					runtime: 'node',
					method: req.method,
					requestPath: getRequestPath(req),
					flushTimeoutMs: getEnvNumber('OPS_TELEMETRY_API_FLUSH_MS', 200),
					attributes: apiRouteTelemetryAttributes(req),
					getHttpStatus: () => res.statusCode,
					getStatus: (_, durationMs) => (res.statusCode >= 500 ? 'error' : routeStatus(durationMs)),
					getResultAttributes: () => (responseBytes === undefined ? {} : { response_bytes: responseBytes })
				},
				() => handler(req, res)
			)
		} finally {
			res.json = originalJson
			res.send = originalSend
			res.write = originalWrite
			res.end = originalEnd
		}
	}
}

function payloadBytes(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined
	if (typeof value === 'string') return Buffer.byteLength(value)
	if (Buffer.isBuffer(value)) return value.length
	if (value instanceof ArrayBuffer) return value.byteLength
	if (ArrayBuffer.isView(value)) return value.byteLength
	return getPayloadBytes(value)
}

function requestPayloadBytes(value: BodyInit | null | undefined): number | undefined {
	if (value === undefined || value === null) return undefined
	if (typeof value === 'string') return Buffer.byteLength(value)
	if (Buffer.isBuffer(value)) return value.length
	if (value instanceof ArrayBuffer) return value.byteLength
	if (ArrayBuffer.isView(value)) return value.byteLength
	if (value instanceof URLSearchParams) return Buffer.byteLength(value.toString())
	if (typeof Blob !== 'undefined' && value instanceof Blob) return value.size
	return undefined
}

function getUrlString(url: RequestInfo | URL): string {
	if (typeof url === 'string') return url
	if (url instanceof URL) return url.toString()
	if (typeof (url as Request).url === 'string') return (url as Request).url
	return String(url)
}

function getRequestMethod(url: RequestInfo | URL, options?: RequestInit): string {
	if (options?.method) return options.method
	if (typeof (url as Request).method === 'string') return (url as Request).method
	return 'GET'
}

function isSensitiveKey(key: string): boolean {
	const lower = key.toLowerCase()
	return (
		lower.includes('api_key') ||
		lower.includes('apikey') ||
		lower.includes('key') ||
		lower.includes('token') ||
		lower.includes('secret') ||
		lower.includes('password') ||
		lower.includes('authorization')
	)
}

function redactSecrets(value: string): string {
	let redacted = value

	for (const key in process.env) {
		if (!isSensitiveKey(key)) continue
		const secret = process.env[key]
		if (!secret || secret.length < 4) continue

		redacted = redacted.split(secret).join('[REDACTED]')
		redacted = redacted.split(encodeURIComponent(secret)).join('[REDACTED]')
	}

	return redacted
}

function sanitizeUrlForTelemetry(url: string): string {
	const redacted = redactSecrets(url)

	try {
		const parsed = new URL(redacted)
		for (const [key] of parsed.searchParams) {
			if (isSensitiveKey(key)) parsed.searchParams.set(key, '[REDACTED]')
		}
		return parsed.toString()
	} catch {
		return redacted
	}
}

function sanitizePathSegment(segment: string): string {
	const redacted = redactSecrets(segment)
	if (redacted !== segment) return redacted
	return segment.length >= 24 && /^[A-Za-z0-9._~-]+$/.test(segment) ? '[REDACTED]' : segment
}

function sanitizeQueryValueForTelemetry(key: string, value: string): string {
	if (isSensitiveKey(key)) return '[REDACTED]'
	const redacted = redactSecrets(value)
	if (redacted !== value) return redacted
	return value.length >= 24 && /^[A-Za-z0-9._~-]+$/.test(value) ? '[REDACTED]' : value
}

function sanitizeRequestPathForTelemetry(url: URL): string {
	const pathname = url.pathname
		.split('/')
		.map((segment) => (segment ? sanitizePathSegment(segment) : segment))
		.join('/')
	for (const [key, value] of url.searchParams) {
		url.searchParams.set(key, sanitizeQueryValueForTelemetry(key, value))
	}
	return `${pathname}${url.search}`
}

function sanitizeQueryForTelemetry(query: Record<string, string | string[] | undefined>): TelemetryAttributes {
	const sanitized: TelemetryAttributes = {}

	for (const key in query) {
		const value = query[key]
		if (Array.isArray(value)) {
			const values: string[] = []
			for (const item of value) {
				values.push(sanitizeQueryValueForTelemetry(key, item))
			}
			sanitized[key] = values
		} else if (value !== undefined) {
			sanitized[key] = sanitizeQueryValueForTelemetry(key, value)
		}
	}

	return sanitized
}

function encodeStaticRouteSegment(segment: string): string {
	const sanitized = sanitizePathSegment(segment)
	return sanitized === '[REDACTED]' ? sanitized : encodeURIComponent(sanitized)
}

const UNRESOLVED_STATIC_ROUTE_TOKEN_PATTERN = /\[\[?\.{3}(?!REDACTED\]?\])[^/\]]+\]?\]|\[(?!REDACTED\])[^/\]]+\]/

export function staticRouteTelemetryAttributes(
	params?: Record<string, string | string[] | undefined>
): TelemetryAttributes | undefined {
	if (!params) return undefined

	return { params: sanitizeQueryForTelemetry(params) }
}

export function buildStaticRouteRequestPath(
	route: string,
	params?: Record<string, string | string[] | undefined>
): string | undefined {
	if (!params) return undefined

	let path = route
	let replaced = false

	for (const key in params) {
		const value = params[key]
		if (value === undefined) continue

		const replacement = Array.isArray(value)
			? value.map((segment) => encodeStaticRouteSegment(segment)).join('/')
			: encodeStaticRouteSegment(value)

		for (const token of [`[[...${key}]]`, `[...${key}]`, `[${key}]`]) {
			if (path.includes(token)) {
				path = path.split(token).join(replacement)
				replaced = true
			}
		}
	}

	if (!replaced || UNRESOLVED_STATIC_ROUTE_TOKEN_PATTERN.test(path)) {
		return undefined
	}

	return path.startsWith('/') ? path : `/${path}`
}

function urlParts(url: string): { host?: string; pathname?: string; apiGroup?: string } {
	try {
		const parsed = new URL(url)
		return { host: parsed.host, pathname: parsed.pathname, apiGroup: apiGroup(parsed) }
	} catch {
		return {}
	}
}

function apiGroup(url: URL): string {
	const groupedPath = url.pathname
		.split('/')
		.map((part) => {
			if (/^\d+$/.test(part)) return ':number'
			if (/^[0-9a-f]{8,}$/i.test(part)) return ':id'
			return part
		})
		.join('/')
	return `${url.host}${groupedPath}`
}

function outboundStatus(response: Response, durationMs: number): OutboundStatus {
	if (response.status >= 400) return 'http_error'
	if (durationMs > slowUpstreamThresholdMs()) return 'slow'
	return 'success'
}

function responseByteAttribute(response: Response): TelemetryAttributes | undefined {
	const responseBytes = response.headers.get('content-length')
	if (!responseBytes) return undefined

	const parsed = Number(responseBytes)
	if (!Number.isFinite(parsed)) return undefined

	return { response_bytes: parsed }
}

function requestByteAttribute(options?: RequestInit): TelemetryAttributes | undefined {
	const bytes = requestPayloadBytes(options?.body)
	return bytes === undefined ? undefined : { request_bytes: bytes }
}

function sampleText(text: string, maxBytes: number): string {
	return Buffer.from(text).subarray(0, maxBytes).toString('utf8')
}

function isOwnServerUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		return parsed.hostname === 'llama.fi' || parsed.hostname.endsWith('.llama.fi')
	} catch {
		return false
	}
}

function canRecordRequestBody(method: string, url: string): boolean {
	if (!isOwnServerUrl(url)) return false
	return method === 'POST' || method === 'PUT' || method === 'PATCH'
}

function bodyText(value: BodyInit | null | undefined): string | undefined {
	if (value === undefined || value === null) return undefined
	if (typeof value === 'string') return value
	if (value instanceof URLSearchParams) return value.toString()
	if (Buffer.isBuffer(value)) return value.toString('utf8')
	if (value instanceof ArrayBuffer) return Buffer.from(value).toString('utf8')
	if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8')
	return undefined
}

function redactJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const redacted: unknown[] = []
		for (const item of value) {
			redacted.push(redactJsonValue(item))
		}
		return redacted
	}

	if (value && typeof value === 'object') {
		const redacted: TelemetryAttributes = {}
		for (const key in value as TelemetryAttributes) {
			redacted[key] = isSensitiveKey(key) ? '[REDACTED]' : redactJsonValue((value as TelemetryAttributes)[key])
		}
		return redacted
	}

	if (typeof value === 'string') return redactSecrets(value)
	return value
}

function sanitizedRequestBodyAttribute(
	method: string,
	url: string,
	options?: RequestInit
): TelemetryAttributes | undefined {
	if (!canRecordRequestBody(method, url)) return undefined

	const text = bodyText(options?.body)
	if (text === undefined) return undefined

	const maxBytes = requestBodyMaxBytes()

	try {
		const redactedBody = redactJsonValue(JSON.parse(text))
		const redactedText = JSON.stringify(redactedBody)
		const truncated = Buffer.byteLength(redactedText) > maxBytes
		const attributes: TelemetryAttributes = {
			request_body: truncated ? sampleText(redactedText, maxBytes) : redactedBody
		}
		if (truncated) attributes.request_body_truncated = true
		return attributes
	} catch {
		const sanitizedText = redactSecrets(text)
		const truncated = Buffer.byteLength(sanitizedText) > maxBytes
		const attributes: TelemetryAttributes = {
			request_body: truncated ? sampleText(sanitizedText, maxBytes) : sanitizedText
		}
		if (truncated) attributes.request_body_truncated = true
		return attributes
	}
}

function requestAttributes(
	apiGroupValue: string | undefined,
	method: string,
	url: string,
	options?: RequestInit & { telemetry?: OutboundTelemetryOptions }
): TelemetryAttributes | undefined {
	const attributes: TelemetryAttributes = {}
	let hasOutboundAttributes = false
	const requestBytes = requestByteAttribute(options)
	const requestBody = sanitizedRequestBodyAttribute(method, url, options)

	if (requestBytes?.request_bytes !== undefined) {
		attributes.request_bytes = requestBytes.request_bytes
		hasOutboundAttributes = true
	}
	if (apiGroupValue) {
		attributes.api_group = apiGroupValue
		hasOutboundAttributes = true
	}
	if (options?.telemetry?.singleflightRole) {
		attributes.singleflight_role = options.telemetry.singleflightRole
		hasOutboundAttributes = true
	}
	for (const key in requestBody) {
		attributes[key] = requestBody[key]
		hasOutboundAttributes = true
	}

	return hasOutboundAttributes ? attributes : undefined
}

function outboundAttributes(
	response: Response,
	apiGroupValue: string | undefined,
	method: string,
	url: string,
	options?: RequestInit
): TelemetryAttributes | undefined {
	const attributes = requestAttributes(apiGroupValue, method, url, options) ?? {}
	let hasOutboundAttributes = hasAttributes(attributes)
	const responseBytes = responseByteAttribute(response)

	if (responseBytes?.response_bytes !== undefined) {
		attributes.response_bytes = responseBytes.response_bytes
		hasOutboundAttributes = true
	}

	return hasOutboundAttributes ? attributes : undefined
}

function isTimeoutError(error: unknown, durationMs: number, timeoutMs: number): boolean {
	return error instanceof Error && (error.name === 'AbortError' || durationMs >= timeoutMs)
}

function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError
}

export async function withOutboundTelemetry(
	url: RequestInfo | URL,
	options: (RequestInit & { timeout?: number; telemetry?: OutboundTelemetryOptions }) | undefined,
	run: () => Promise<Response>
): Promise<Response> {
	const context = currentTelemetryContext()
	if (!context) return run()

	context.outboundCount++

	const urlString = getUrlString(url)
	const sanitizedUrl = sanitizeUrlForTelemetry(urlString)
	const method = getRequestMethod(url, options)
	const startedAt = nowIso()
	const started = Date.now()
	const spanId = newId()
	const timeoutMs = options?.timeout ?? 60_000

	try {
		const response = await run()
		const durationMs = Date.now() - started
		const { apiGroup: apiGroupValue, ...parts } = urlParts(sanitizedUrl)

		recordTelemetry({
			type: 'outbound_http_request',
			trace_id: context.traceId,
			span_id: spanId,
			parent_span_id: context.spanId,
			method,
			url: sanitizedUrl,
			...parts,
			started_at: startedAt,
			ended_at: nowIso(),
			duration_ms: durationMs,
			status: outboundStatus(response, durationMs),
			http_status: response.status,
			timeout_ms: timeoutMs,
			...(options?.telemetry?.attempt ? { attempt: options.telemetry.attempt } : null),
			...(options?.telemetry?.maxAttempts ? { max_attempts: options.telemetry.maxAttempts } : null),
			attributes: outboundAttributes(response, apiGroupValue, method, urlString, options)
		})

		return response
	} catch (error) {
		const durationMs = Date.now() - started
		const fields = errorFields(error)
		const status = isTimeoutError(error, durationMs, timeoutMs)
			? 'timeout'
			: isNetworkError(error)
				? 'network_error'
				: 'error'
		const { apiGroup: apiGroupValue, ...parts } = urlParts(sanitizedUrl)
		const attributes = requestAttributes(apiGroupValue, method, urlString, options)

		recordTelemetry({
			type: 'outbound_http_request',
			trace_id: context.traceId,
			span_id: spanId,
			parent_span_id: context.spanId,
			method,
			url: sanitizedUrl,
			...parts,
			started_at: startedAt,
			ended_at: nowIso(),
			duration_ms: durationMs,
			status,
			timeout_ms: timeoutMs,
			...(options?.telemetry?.attempt ? { attempt: options.telemetry.attempt } : null),
			...(options?.telemetry?.maxAttempts ? { max_attempts: options.telemetry.maxAttempts } : null),
			...fields,
			...(attributes ? { attributes } : null)
		})
		if (status !== 'timeout') {
			recordTelemetry({
				type: 'runtime_error',
				trace_id: context.traceId,
				span_id: newId(),
				parent_span_id: spanId,
				route: context.route,
				phase: 'outboundFetch',
				occurred_at: nowIso(),
				...fields,
				attributes: mergeRuntimeErrorAttributes(context, { url: sanitizedUrl })
			})
		}
		throw error
	}
}

function staticPropsStatus<T>(result: GetStaticPropsResult<T>, durationMs: number): RouteStatus {
	if ('notFound' in result && result.notFound) return 'error'
	if (durationMs > slowRouteThresholdMs()) return 'slow'
	return 'success'
}

export function getStaticPropsTelemetryAttributes<T>(result: GetStaticPropsResult<T>): TelemetryAttributes {
	const attributes: TelemetryAttributes = {}

	if ('props' in result) {
		const bytes = getPayloadBytes(result.props)
		if (bytes !== undefined) attributes.props_bytes = bytes
	}

	if ('revalidate' in result && typeof result.revalidate === 'number') {
		attributes.revalidate_seconds = result.revalidate
	}
	const jitterMeta = readCacheJitterMeta(result)
	if (jitterMeta) {
		attributes.cache_jitter_seconds = jitterMeta.cache_jitter_seconds
	}

	return attributes
}

export function shouldInstrumentStaticRoute(route: string): boolean {
	void route
	return true
}

export async function withStaticRouteTelemetry<T>(
	route: string,
	run: () => Promise<GetStaticPropsResult<T>>,
	attributes?: TelemetryAttributes,
	requestPath?: string
): Promise<GetStaticPropsResult<T>> {
	return withRouteTelemetry(
		{
			route,
			operationType: 'getStaticProps',
			runtime: 'build',
			flushTimeoutMs: getEnvNumber('OPS_TELEMETRY_BUILD_FLUSH_MS', 2000),
			...(requestPath ? { requestPath } : null),
			attributes,
			getResultAttributes: getStaticPropsTelemetryAttributes,
			getStatus: staticPropsStatus
		},
		run
	)
}

function serverSidePropsStatus<T>(result: GetServerSidePropsResult<T>, durationMs: number): RouteStatus {
	if ('notFound' in result && result.notFound) return 'error'
	if (durationMs > slowRouteThresholdMs()) return 'slow'
	return 'success'
}

export function getServerSidePropsTelemetryAttributes<T>(result: GetServerSidePropsResult<T>): TelemetryAttributes {
	const attributes: TelemetryAttributes = {}

	if ('props' in result) {
		const bytes = getPayloadBytes(result.props)
		if (bytes !== undefined) attributes.props_bytes = bytes
	}

	return attributes
}

export function withServerSidePropsTelemetry<T extends { [key: string]: any }>(
	route: string,
	handler: GetServerSideProps<T>
): GetServerSideProps<T> {
	return async (context: GetServerSidePropsContext) => {
		const attributes: TelemetryAttributes = {}
		if (context.params) attributes.params = sanitizeQueryForTelemetry(context.params)
		if (context.query) attributes.query = sanitizeQueryForTelemetry(context.query)

		return withRouteTelemetry(
			{
				route,
				operationType: 'getServerSideProps',
				runtime: 'node',
				method: context.req.method,
				requestPath: sanitizeRequestPathString(context.resolvedUrl),
				flushTimeoutMs: getEnvNumber('OPS_TELEMETRY_SSR_FLUSH_MS', 200),
				attributes,
				getHttpStatus: () => context.res.statusCode,
				getResultAttributes: getServerSidePropsTelemetryAttributes,
				getStatus: serverSidePropsStatus
			},
			() => handler(context)
		)
	}
}

if (typeof process !== 'undefined') {
	process.once('beforeExit', () => {
		void flushTelemetry({ timeoutMs: getEnvNumber('OPS_TELEMETRY_BEFORE_EXIT_FLUSH_MS', 2000), runtime: 'build' })
	})
}

export const telemetryTest = {
	reset() {
		queue.length = 0
		retryBatch = null
		flushPromise = null
		consecutiveFailures = 0
		circuitOpenUntil = 0
		previousPageBuildFinishedAt = undefined
	},
	queueLength() {
		return queue.length
	},
	retryBatchEvents() {
		return retryBatch?.events.length ?? 0
	},
	circuitOpenUntil() {
		return circuitOpenUntil
	}
}
