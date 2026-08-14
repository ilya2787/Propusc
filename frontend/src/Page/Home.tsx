import { Link } from 'react-router'
import mascot from '../assets/pass-mascot-logo-v2.png'
import { ICON } from '../components/icon/Icon'
import { ROUTES } from '../model/routes'
import './Home.scss'

const Home = () => (
	<main className='HomePage'>
		<section className='HomePage__hero'>
			<div className='HomePage__copy'>
				<span className='HomePage__eyebrow'>Бюро пропусков</span>
				<h2>Оформляйте пропуска<br />быстро и без ошибок</h2>
				<p>Создавайте, настраивайте и печатайте пропуска в одном удобном приложении.</p>
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

		<section className='HomePage__actions' aria-label='Быстрые действия'>
			<Link className='HomeAction' to={ROUTES.Card}>
				<span className='HomeAction__icon'>{ICON.CardPass}</span>
				<span><strong>Пропуска</strong><small>Заполнить данные и подготовить к печати</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
			<Link className='HomeAction' to={ROUTES.Templates}>
				<span className='HomeAction__icon HomeAction__icon--violet'>{ICON.Editor}</span>
				<span><strong>Шаблон</strong><small>Изменить фон, логотип и вид карточки</small></span>
				<b aria-hidden='true'>→</b>
			</Link>
		</section>
	</main>
)

export default Home
