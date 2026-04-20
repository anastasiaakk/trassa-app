import "./bootstrapPublicCssVars";
import { createRoot } from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { HashRouter } from "react-router-dom";
import { ensureIntroRoute } from "./ensureIntroRoute";
import { scheduleIdlePrefetchCommonRoutes } from "./utils/routePrefetch";
import "./global.css";

ensureIntroRoute();
scheduleIdlePrefetchCommonRoutes();

const container = document.getElementById("root");

const root = createRoot(container as Element);
// HashRouter: маршрут берётся из hash (#/), а не из пути /services в адресной строке.
// Иначе при открытии …/services без hash сразу открывается Страница 2, минуя Страницу 1.
root.render(
  <HashRouter>
    <App />
  </HashRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
