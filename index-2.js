const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const FileStore = require('session-file-store')(session);

// Что происходит:
// • express — фреймворк для создания сервера.
// • express-session — позволяет хранить информацию о сессии пользователя (например, что он вошёл в систему).
// • keycloak-connect — библиотека для подключения Keycloak к Express.
// • session-file-store — модуль, который сохраняет сессии в файлы (можно заменить на Redis или другие хранилища в продакшене).

// Создаём экземпляр Express-приложения.
const app = express();

// Настройка сессий:
// • secret — ключ, которым шифруется сессионный ID (нужен для безопасности).
// • resave: false — не сохранять сессию, если ничего не изменилось.
// • saveUninitialized: true — сохранять новую сессию, даже если она пустая.
// • store — место, куда сохраняются сессии (в данном случае файлы).
const memoryStore = new FileStore();
app.use(session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

// Создаём экземпляр Keycloak и передаём хранилище сессий.
const keycloak = new Keycloak({ store: memoryStore });

// Подключаем middleware:
// • logout — маршрут, по которому пользователь выйдет из системы.
// • admin — путь, где доступно админ-интерфейс Keycloak (не обязателен, можно игнорировать).
app.use(keycloak.middleware({
    logout: '/logout',
    admin: '/'
}));

// Открытый маршрут — доступен всем, даже неавторизованным пользователям.
app.get('/', (req, res) => {
    res.send('Добро пожаловать! <a href="/secure">Перейти в защищённую зону</a>');
});

// Защищённый маршрут:
// • keycloak.protect() — middleware, которое проверяет: авторизован ли пользователь.
// • Если нет — перенаправит на страницу логина Keycloak.
// • Если да — отдаёт содержимое страницы.
app.get('/secure', keycloak.protect(), (req, res) => {
    res.send('Вы авторизованы! 🎉 <a href="/logout">Выйти</a>');
});

// Запуск сервера на порту 3000.
app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});


