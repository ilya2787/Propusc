import { expect, test, type Page } from '@playwright/test'

const template = {
	id: 'e2e-pass', name: 'Тестовый пропуск', description: 'Шаблон для сквозной проверки', kind: 'pass', isBuiltIn: true,
	design: { backgroundImage: 'builtin:flag', backgroundImageName: 'Флаг.jpg', accentColor: '#feec23', titleColor: '#f84a4a', textColor: '#111111', fontFamily: 'Times New Roman', borderRadius: 5, showDirector: false, hiddenElements: ['passDate', 'passOrganization', 'passPost', 'passPhoto'] },
}

const mockApi = async (page: Page) => {
	await page.route('**/Auth/Me', route => route.fulfill({ json: { user: { id: 'e2e-admin', username: 'admin', displayName: 'Администратор', role: 'admin' }, expiresAt: '2099-01-01T00:00:00.000Z' } }))
	await page.route('**/Templates', route => route.fulfill({ json: [template] }))
	await page.route('**/AllListOrganization', route => route.fulfill({ json: [] }))
	await page.route('**/AllListPost', route => route.fulfill({ json: [] }))
	await page.route('**/Director', route => route.fulfill({ json: [{ Name: 'П. П. Петров', Post: 'Руководитель' }] }))
	await page.route('**/Audit/Record', route => route.fulfill({ json: { status: 'success' } }))
	await page.route('**/Admin/System/Status', route => route.fulfill({ json: { database: 'connected', databaseName: 'propusk', templates: 2, users: 1, organizations: 4, uploadedFiles: 3 } }))
	await page.route('**/Admin/System/Backup', route => route.fulfill({ status: 200, headers: { 'Content-Type': 'application/sql', 'Content-Disposition': 'attachment; filename="database-test.sql"' }, body: '-- backup' }))
	await page.route('**/Admin/System/Restore/Inspect', route => route.fulfill({ json: { createdAt: '2026-08-16T10:20:30.000Z', databaseName: 'propusk', tables: ['users', 'user_sessions', 'pass_templates'], sizeBytes: 1024 } }))
	await page.route('**/Admin/System/Restore', route => route.fulfill({ json: { status: 'success', safetyFilename: 'pre-restore-database-test.sql', restoredAt: '2026-08-16T10:20:30.000Z' } }))
}

test.beforeEach(async ({ page }) => mockApi(page))

test('создание пропуска, очередь и открытие печати', async ({ page }) => {
	await page.goto('/Card')
	await expect(page.getByRole('heading', { name: 'Новый пропуск' })).toBeVisible()
	await page.locator('.FormFront--Number input').fill('1042')
	await page.locator('.FormFront--Name--LastName input').fill('Иванов')
	await page.locator('.FormFront--Name--FirstName input').fill('Иван')
	await page.getByRole('button', { name: /Добавить$/ }).click()
	await expect(page.locator('.MainCard__queueBadge strong')).toHaveText('1')
	await expect(page.locator('.MainCard--headerInfo--ListPrintCard--tables')).toContainText('Иванов Иван')
	await page.getByRole('button', { name: 'Предпросмотр и печать' }).click()
	await expect(page.getByRole('dialog', { name: 'Предварительный просмотр' })).toBeVisible()
	await expect(page.getByRole('button', { name: /Печать/ })).toBeEnabled()
})

test('основные страницы не создают горизонтальную прокрутку', async ({ page }) => {
	for (const path of ['/', '/Card', '/Templates', '/System']) {
		await page.goto(path)
		await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
	}
})

test('страница первичной настройки показывает готовность системы', async ({ page }) => {
	await page.goto('/System')
	await expect(page.getByRole('heading', { name: 'Система и перенос данных' })).toBeVisible()
	await expect(page.getByText('База «propusk» доступна')).toBeVisible()
	await expect(page.getByRole('button', { name: 'Скачать копию базы' })).toBeEnabled()
})

test('мобильная навигация прячет административные разделы в меню «Ещё»', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile')
	await page.goto('/')
	await expect(page.getByRole('link', { name: /Пользователи/ })).toBeHidden()
	await page.getByRole('button', { name: 'Ещё' }).click()
	await expect(page.getByRole('dialog', { name: 'Ещё' })).toBeVisible()
	await page.getByRole('dialog', { name: 'Ещё' }).getByRole('link', { name: /Система/ }).click()
	await expect(page).toHaveURL(/\/System$/)
})

test('восстановление базы требует проверенный файл и явное подтверждение', async ({ page }) => {
	await page.goto('/System')
	await page.locator('input[type="file"]').setInputFiles({ name: 'database-test.sql', mimeType: 'application/sql', buffer: Buffer.from('-- backup') })
	await expect(page.getByText('database-test.sql')).toBeVisible()
	await page.getByRole('button', { name: 'Восстановить из этой копии' }).click()
	const dialog = page.getByRole('dialog', { name: 'Восстановить базу данных?' })
	await expect(dialog.getByRole('button', { name: 'Заменить базу' })).toBeDisabled()
	await dialog.getByRole('textbox').fill('ВОССТАНОВИТЬ')
	await dialog.getByRole('button', { name: 'Заменить базу' }).click()
	await expect(page.getByRole('dialog', { name: 'База восстановлена' })).toBeVisible()
})
