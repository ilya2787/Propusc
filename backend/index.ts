import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2'
dotenv.config()

const app = express()
app.use(
	cors({
		origin: ['http://localhost:5173'],
		methods: ['POST', 'GET'],
		credentials: true,
	}),
)
app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))

const PORT = parseInt(process.env.PORT || '5173', 10)

const DB = mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '3306', 10),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
})
DB.connect(err => {
	if (err) console.error('Ошибка подключения к базе данных:', err)
	else console.log('Подключение к базе данных прошло успешно')
})

app.get('/AllListOrganization', (reg, res) => {
	const sql = 'SELECT * FROM Organization'
	DB.query(sql, (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.get('/AllListPost', (reg, res) => {
	const sql = 'SELECT * FROM Post'
	DB.query(sql, (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.post('/AddOrganization', (reg, res) => {
	const sql = 'INSERT INTO Organization (value, label) VALUE (?)'
	const value = [reg.body.value, reg.body.label]
	DB.query(sql, [value], (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.post('/AddPost', (reg, res) => {
	const sql = 'INSERT INTO Post (value, label) VALUE (?)'
	const value = [reg.body.value, reg.body.label]
	DB.query(sql, [value], (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.get('/Director', (reg, res) => {
	const sql = 'SELECT * FROM director'
	DB.query(sql, (err, data) => {
		if(err) return res.json(err)
			return res.json(data)
	})
})

app.post('/DirectorUpdate', (reg, res) => {
	const sql = 'UPDATE director SET Name = ?, Post = ? WHERE id = ?'
	const value = [reg.body.Name, reg.body.Post, reg.body.id]
	DB.query(sql, value, (err, data) => {
		if (err) return res.json(err)
			return res.json({Status: 'success'})
	})	
})

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
