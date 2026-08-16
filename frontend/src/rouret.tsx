import { createBrowserRouter } from 'react-router'
import App from './App'
import { ROUTES } from './model/routes'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AuditPage, CardPage, HomePage, LoginPage, NotFoundPage, SystemPage, TemplatesPage, UsersPage } from './routerPages'

export const router = createBrowserRouter([
	{
		path: ROUTES.Login,
		element: <LoginPage />,
	},
	{
		Component: ProtectedRoute,
		children: [
			{
				Component: App,
				children: [
					{ path: ROUTES.HOME, element: <HomePage /> },
					{ path: ROUTES.Card, element: <CardPage /> },
					{ path: ROUTES.Templates, element: <TemplatesPage /> },
					{ path: ROUTES.Users, element: <UsersPage /> },
					{ path: ROUTES.Audit, element: <AuditPage /> },
					{ path: ROUTES.System, element: <SystemPage /> },
					{ path: '*', element: <NotFoundPage /> },
				],
			},
		],
	},
])
