const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('querystring');

const app = express();
const port = 3000;

const keycloakBaseUrl = 'http://localhost:8080';
const realm = 'master';
const clientId = 'node-app';
const clientSecret = 'mZsb4SrcQPVHfY6VSaREuXkKIqNgHFID'; // скопируй из админки

// Страница входа (редиректим на Keycloak)
app.get('/login', (req, res) => {
    console.log('login:', 1111);
    const redirectUri = 'http://localhost:3000/callback';
    const authUrl = `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(authUrl);
});

// Обработка редиректа от Keycloak
app.get('/callback', async (req, res) => {
    console.log('callback:', 1111);
    const code = req.query.code;
    const redirectUri = 'http://localhost:3000/callback';

    try {
        const tokenRes = await axios.post(`${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`, qs.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenRes.data.access_token;
        res.send(`Успешный вход! Ваш access_token:<br><code>${accessToken}</code><br><a href="/secure?token=${accessToken}">Перейти в защищённую зону</a>`);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send('Ошибка получения токена');
    }
});

// Защищённый маршрут
app.get('/secure', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).send('Нет токена');

    try {
        // Получаем JWK с ключами (SON Web Key) https://wiki.openbankingrussia.ru/security/json-web-key-structure
        const { data } = await axios.get(`${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/certs`);
        const jwk = data.keys[0];

        // Переводим JWK в PEM (здесь простая реализация, работает для RSA)
        const pubKey = `-----BEGIN PUBLIC KEY-----\n${jwk.n.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

        // Проверяем токен
        const decoded = jwt.verify(token, pubKey, { algorithms: ['RS256'] });
        res.send(`Добро пожаловать, ${decoded.preferred_username}! 🎉`);
    } catch (err) {
        console.error(err.message);
        res.status(401).send('Неверный или просроченный токен');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
