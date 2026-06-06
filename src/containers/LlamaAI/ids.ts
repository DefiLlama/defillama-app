type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type SessionId = Brand<string, 'SessionId'>
export type MessageId = Brand<string, 'MessageId'>
export type ShareToken = Brand<string, 'ShareToken'>

export const toSessionId = (value: string): SessionId => value as SessionId
export const toMessageId = (value: string): MessageId => value as MessageId
export const toShareToken = (value: string): ShareToken => value as ShareToken
