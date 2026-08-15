import { useState, type ComponentPropsWithoutRef } from 'react'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'
import './PasswordField.scss'

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>

const PasswordField = (props: PasswordFieldProps) => {
	const [visible, setVisible] = useState(false)
	const label = visible ? 'Скрыть пароль' : 'Показать пароль'

	return <span className='PasswordField'>
		<input {...props} type={visible ? 'text' : 'password'} />
		<button type='button' onClick={() => setVisible(current => !current)} aria-label={label} title={label} aria-pressed={visible}>
			{visible ? <IoEyeOffOutline aria-hidden='true' /> : <IoEyeOutline aria-hidden='true' />}
		</button>
	</span>
}

export default PasswordField
