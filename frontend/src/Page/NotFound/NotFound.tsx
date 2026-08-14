import { useContext } from 'react'
import { Link } from 'react-router'
import { AppContext } from '../../App'
import sadPass from '../../assets/sad-pass-404.png'
import { ICON } from '../../components/icon/Icon'
import { ROUTES } from '../../model/routes'
import './NotFound.scss'

const NotFound = () => {
	const { theme } = useContext(AppContext)

	return <main className='NotFound' id={theme}>
		<div className='NotFound__glow' aria-hidden='true' />
		<section className='NotFound__content'>
			<div className='NotFound__illustration'>
				<span className='NotFound__code'>404</span>
				<img src={sadPass} alt='Расстроенный пропуск не смог найти страницу' />
			</div>
			<div className='NotFound__message'>
				<p className='NotFound__eyebrow'>Пропуск не сработал</p>
				<h1>Кажется, эта страница ушла без пропуска</h1>
				<p>Мы проверили список посетителей, заглянули на проходную и даже спросили охранника — такого адреса здесь нет. Возможно, в ссылке опечатка или страница переехала.</p>
				<Link to={ROUTES.HOME} className='NotFound__homeLink'>
					<span>{ICON.Home}</span>
					Вернуться на главную
				</Link>
			</div>
		</section>
	</main>
}

export default NotFound
