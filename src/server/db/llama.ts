import pgPromise from 'pg-promise'

const pgp = pgPromise({ capSQL: true })

pgp.pg.types.setTypeParser(20, (value) => parseInt(value, 10))
pgp.pg.types.setTypeParser(1700, (value) => (value === null ? null : Number(value)))

const connectionString = process.env.LLAMA_DB_URL ?? process.env.DEST_DB_URL

if (!connectionString) {
	throw new Error(
		'LLAMA_DB_URL or DEST_DB_URL must be configured to query the unified lens database from the Next.js app.'
	)
}

type DbInstance = pgPromise.IDatabase<unknown>

declare global {
	// eslint-disable-next-line no-var
	var __LLAMA_DB__: DbInstance | undefined
}

const createDb = () => pgp(connectionString)

export const llamaDb: DbInstance =
	globalThis.__LLAMA_DB__ ??
	createDb()

if (process.env.NODE_ENV !== 'production') {
	globalThis.__LLAMA_DB__ = llamaDb
}

export { pgp }
