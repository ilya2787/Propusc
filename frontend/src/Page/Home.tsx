import { Link } from 'react-router'
import mascot from '../assets/pass-mascot-logo-v2.png'
import { ICON } from '../components/icon/Icon'
import { ROUTES } from '../model/routes'
import './Home.scss'
import { useAuth } from '../auth/AuthContext'

const Home = () => {
	const { user } = useAuth()
	return (
	<main className='HomePage'>
		<section className='HomePage__hero'>
			<div className='HomePage__copy'>
				<span className='HomePage__eyebrow'>Бюро пропусков</span>
				<h2>Добро пожаловать, {user?.displayName?.split(' ')[0]}</h2>
				<p>Заполните данные, проверьте макет и отправьте готовый пропуск на печать.</p>
				<Link className='HomePage__primary' to={ROUTES.Card}>
					<span>{ICON.AddCard}</span>
					Создать пропуск
				</Link>
			</div>
			<div className='HomePage__mascot' aria-hidden='true'>
				<div className='HomePage__glow' />
				<img src={mascot} alt='' />
			</div>
		</section>

		{user?.role === 'admin' && <section className='HomePage__admin'>
			<div className='HomePage__adminHeader'>
				<h3>Администрирование</h3>
				<p>Настройка системы и контроль доступа</p>
			</div>
			<nav className='HomePage__actions' aria-label='Администрирование'>
			<Link className='HomeAction' to={ROUTES.Templates}>
				<span className='HomeAction__icon HomeAction__icon--violet'>{ICON.Editor}</span>
				<span><strong>Шаблоны</strong><small>Фон, логотип и вид пропусков</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
			<Link className='HomeAction' to={ROUTES.Users}>
				<span className='HomeAction__icon'>{ICON.Users}</span>
				<span><strong>Пользователи</strong><small>Учётные записи, роли и доступ</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
			<Link className='HomeAction' to={ROUTES.Audit}>
				<span className='HomeAction__icon HomeAction__icon--audit'>{ICON.Audit}</span>
				<span><strong>Журнал</strong><small>Входы и критичные действия</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
			<Link className='HomeAction' to={ROUTES.System}>
				<span className='HomeAction__icon HomeAction__icon--system'>{ICON.Setting}</span>
				<span><strong>Система</strong><small>Первичная проверка и резервная копия</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
			</nav>
		</section>}
	</main>
)}

export default Home
