import { createBrowserRouter } from 'react-router'
import App from './App'
import { ROUTES } from './model/routes'
import CardAll from './Page/Card/CardAll'
import Home from './Page/Home'
import TemplateEditor from './Page/Templates/TemplateEditor'
import NotFound from './Page/NotFound/NotFound'
import Login from './Page/Login/Login'
import Users from './Page/Users/Users'
import Audit from './Page/Audit/Audit'
import { ProtectedRoute, RequireRole } from './auth/ProtectedRoute'
export const router = createBrowserRouter([
	{
		path: ROUTES.Login,
		element: <Login />,
	},
	{
		Component: ProtectedRoute,
		children: [
			{
				Component: App,
				children: [
					{ path: ROUTES.HOME, element: <Home /> },
					{ path: ROUTES.Card, element: <CardAll /> },
					{ path: ROUTES.Templates, element: <RequireRole role='admin'><TemplateEditor /></RequireRole> },
					{ path: ROUTES.Users, element: <RequireRole role='admin'><Users /></RequireRole> },
					{ path: ROUTES.Audit, element: <RequireRole role='admin'><Audit /></RequireRole> },
					{ path: '*', element: <NotFound /> },
				],
			},
		],
	},
])
