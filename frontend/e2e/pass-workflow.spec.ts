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
	for (const path of ['/', '/Card', '/Templates']) {
		await page.goto(path)
		await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
	}
})
