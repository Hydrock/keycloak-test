require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const app = express();

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL
} = process.env;

const port = 3000;

app.use(session({
    secret: 'super-secret',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    if (req.session.user) {
        res.send(`
      <h1>Привет, ${req.session.user.name}</h1>
      <p>Email: ${req.session.user.email}</p>
      <img src="${req.session.user.picture}" width="100"/>
      <br/><a href="/logout">Выйти</a>
    `);
    } else {
        res.send('<a href="/login">Войти через Google</a>');
    }
});

app.get('/login', (req, res) => {
    const redirectUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_CALLBACK_URL,
            response_type: 'code',
            scope: 'openid email profile',
            prompt: 'consent'
        });

    res.redirect(redirectUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const tokenRes = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('tokenRes.data:', tokenRes.data);

        const { id_token } = tokenRes.data;

        // Распарсим JWT
        const user = jwt.decode(id_token);

        req.session.user = user;
        res.redirect('/');
    } catch (e) {
        console.error(e);
        res.status(500).send('Ошибка авторизации через Google');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
