import axios from 'axios'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider, AUTH_EXPIRED_EVENT } from './auth/AuthContext.tsx'
import { router } from './rouret.tsx'
import { enableRussianValidationMessages } from './utils/russianValidation.ts'

enableRussianValidationMessages()

axios.defaults.withCredentials = true
axios.interceptors.response.use(response => response, error => {
	if (error?.response?.status === 401) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
	return Promise.reject(error)
})

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(<AuthProvider><RouterProvider router={router} /></AuthProvider>)
