import 'react-router'

export const ROUTES = {
	HOME: '/',
	Card: '/Card',
	Templates: '/Templates',
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
