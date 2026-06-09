import { createBrowserRouter } from 'react-router'
import App from './App'
import { ROUTES } from './model/routes'
import CardAll from './Page/Card/CardAll'
import Home from './Page/Home'
export const router = createBrowserRouter([
	{
		Component: App,
		children: [
			{
				path: ROUTES.HOME,
				element: <Home />,
			},
			{
				path: ROUTES.Card,
				element: <CardAll />,
			},
		],
	},
])
