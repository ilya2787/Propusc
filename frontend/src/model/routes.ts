import 'react-router'

export const ROUTES = {
	HOME: '/',
	Login: '/Login',
	Card: '/Card',
	Templates: '/Templates',
	Users: '/Users',
	Audit: '/Audit',
	System: '/System',
} as const

export type PathParams = {
	[ROUTES.Card]: {
		NameCard: string
	}
}

declare module 'react-router' {
	interface Register {
		params: PathParams
	}
}
