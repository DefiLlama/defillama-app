export interface TeamMember {
	id: string
	userId: string
	email: string
	isAdmin: boolean
	subscriptionType: string | null
	joinedAt: string
}

export interface TeamInvite {
	id: string
	email: string
	status: 'pending'
	createdAt: string
	expiresAt: string
}

export interface TeamSeatInfo {
	seatCount: number
	occupiedSeats: number
	availableSeats: number
}

export interface TeamSubscription {
	id: string
	type: string
	status?: string
	provider?: string
	billingInterval: 'month' | 'year'
	seats: TeamSeatInfo
	createdAt?: string
	canceledAtPeriodEnd?: boolean
	effectiveAt?: number
	cancelsAt?: string | null
}

export interface Team {
	id: string
	name: string
	isAdmin: boolean
	subscriptionType: string | null
	members: TeamMember[]
	subscriptions: TeamSubscription[]
	pendingInvites: TeamInvite[]
}

export type PurchaseSeatsResponse =
	| {
			action: 'seats_added'
			subscriptionType: string
			previousSeatCount: number
			newSeatCount: number
			seatsAdded: number
	  }
	| {
			action: 'checkout_created'
			subscriptionType: string
			seatCount: number
			subscriptionId: string
			clientSecret: string
			checkoutUrl: string | null
			billingInterval: string
	  }
