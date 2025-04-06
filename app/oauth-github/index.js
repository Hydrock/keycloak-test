require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const port = 3000;

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;

// Простая сессия (в памяти, для теста)
app.use(session({
    secret: 'super-secret',
    resave: false,
    saveUninitialized: true
}));

// Загрузка всех пользователей из файла
function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync('users.json', 'utf-8'));
    } catch (e) {
        return [];
    }
}

// Сохранение всех пользователей
function saveUsers(users) {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2), 'utf-8');
}

// Стартовая страница
app.get('/', (req, res) => {
    const userId = req.session.userId;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);

    if (user) {
        res.send(`
      <h1>Добро пожаловать, ${user.name || user.login}!</h1>
      <p>Вы вошли как: ${user.login}</p>
      <img src="${user.avatar_url}" width="100"/><br>
      <a href="/logout">Выйти</a>
    `);
    } else {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    }
});

// Редирект на GitHub
app.get('/login', (req, res) => {
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=user`;
    res.redirect(redirectUrl);
});

// Callback от GitHub
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code
            },
            { headers: { accept: 'application/json' } }
        );

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const profile = userRes.data;

        const users = loadUsers();
        let user = users.find(u => u.id === profile.id);

        if (!user) {
            user = {
                id: profile.id,
                login: profile.login,
                name: profile.name,
                avatar_url: profile.avatar_url,
                access_token: accessToken
            };
            users.push(user);
            saveUsers(users);
        } else {
            // обновим токен, если он есть
            user.access_token = accessToken;
            saveUsers(users);
        }

        // Установим сессию
        req.session.userId = user.id;
        res.redirect('/');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка при входе через GitHub');
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
