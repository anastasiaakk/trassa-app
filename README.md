# Веб-приложение кадрового суверенитета дорожной отрасли

Это React-приложение для управления кадрами в дорожной отрасли России.

## Функционал

1. **Анимация входа**: При запуске приложения показывается анимация с названием.
2. **Интерактивная карта**: Пользователь выбирает регион (город) из списка.
3. **Информация о подрядчике**: Появляется модальное окно с названием и описанием подрядчика.
4. **Выбор роли**: После нажатия "Далее" показываются 4 роли: Школа, СПО и ВО, Подрядные организации, Государственные институты.
5. **Вход**: Пользователь вводит логин и пароль для выбранной роли.

## Цветовая гамма

- Основной: #243B74
- Вторичный: #1A2A52
- Акцент: #56061D
- Приглушенный: #7A2338
- Фон: #F5F2EC

## Запуск

```bash
npm install
npm run dev
```

## Технологии

- React
- Vite
- Framer Motion (для анимаций)
- CSS

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
