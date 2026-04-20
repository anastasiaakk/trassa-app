import { Suspense, lazy, memo, useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { authMe } from "./api/authApi";
import SeasonBackgroundLayer from "./components/SeasonBackgroundLayer";
import { saveProfileSettings } from "./profileSettingsStorage";
import Page1Flow from "./pages/Page1Flow";
import { isAuthApiEnabled } from "./utils/authMode";
import { loadMaintenanceState } from "./utils/maintenanceMode";

const Page2 = lazy(() => import("./pages/Page2"));
const Page3 = lazy(() => import("./pages/Page3"));
const Page4 = lazy(() => import("./pages/Page4"));
const Page5 = lazy(() => import("./pages/Page5"));
const Page6 = lazy(() => import("./pages/Page6"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const CabinetSchool = lazy(() => import("./pages/CabinetSchool"));
const CabinetSpo = lazy(() => import("./pages/CabinetSpo"));
const DownloadDesktopPage = lazy(() => import("./pages/DownloadDesktopPage"));

/** Создаём элементы маршрутов один раз при загрузке модуля — без лишних пересозданий при рендере App */
const APP_ROUTES = [
  { path: "/", element: <Page1Flow /> },
  { path: "/services", element: <Page2 /> },
  { path: "/page3", element: <Page3 /> },
  { path: "/cabinet-school", element: <CabinetSchool /> },
  { path: "/cabinet-spo", element: <CabinetSpo /> },
  { path: "/page4", element: <Page4 /> },
  { path: "/page4/proforientation", element: <Page4 /> },
  { path: "/page4/documents", element: <Page4 /> },
  { path: "/page4/teams", element: <Page4 /> },
  { path: "/page5", element: <Page5 /> },
  { path: "/page5/proforientation", element: <Page5 /> },
  { path: "/page5/documents", element: <Page5 /> },
  { path: "/page5/documents/incoming", element: <Page5 /> },
  { path: "/page5/teams", element: <Page5 /> },
  { path: "/page6", element: <Page6 /> },
  { path: "/page6/proforientation", element: <Page6 /> },
  { path: "/page6/documents", element: <Page6 /> },
  { path: "/page6/documents/incoming", element: <Page6 /> },
  { path: "/page6/teams", element: <Page6 /> },
  { path: "/profile", element: <ProfileSettings /> },
  { path: "/download", element: <DownloadDesktopPage /> },
  { path: "/page1", element: <Navigate to="/" replace /> },
] as const;

function MaintenanceOverlay() {
  const location = useLocation();
  const [state, setState] = useState(loadMaintenanceState);

  useEffect(() => {
    const onChange = () => setState(loadMaintenanceState());
    window.addEventListener("trassa-maintenance-changed", onChange);
    return () => window.removeEventListener("trassa-maintenance-changed", onChange);
  }, []);

  if (!state.active) {
    return null;
  }
  if (location.pathname === "/services") {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "linear-gradient(160deg, #1a2744 0%, #0d1526 100%)",
        color: "#e8eef8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: "Montserrat, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>
          Технические работы
        </h1>
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: "1rem", opacity: 0.95 }}>
          {state.message}
        </p>
        <p
          style={{
            marginTop: 24,
            fontSize: "0.88rem",
            opacity: 0.75,
            lineHeight: 1.45,
          }}
        >
          Администратор может открыть раздел «Карта подрядчиков» в меню портала
          (маршрут /services), войти в панель и отключить режим техработ.
        </p>
      </div>
    </div>
  );
}

function App() {
  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (action !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [action, pathname]);

  /** Подтягиваем профиль с сервера, если есть сессия (JWT cookie). */
  useEffect(() => {
    if (!isAuthApiEnabled()) return;
    void authMe().then((r) => {
      if (r.ok) saveProfileSettings(r.profile);
    });
  }, []);

  const pageMeta = useMemo(() => {
    switch (pathname) {
      case "/":
        return {
          title: "Страница 1 — ТрассА",
          metaDescription: "Комплексный портал для управления персоналом, развития лучших практик в дорожной деятельности",
        };
      case "/services":
        return {
          title: "Страница 2 — Карта подрядчиков — ТрассА",
          metaDescription: "Интерактивная карта подрядчиков по городам России",
        };
      case "/page3":
        return {
          title: "Страница 3 — Выбор роли — ТрассА",
          metaDescription: "Выбор роли пользователя для входа в систему",
        };
      case "/cabinet-school":
        return {
          title: "Личный кабинет — Школа — ТрассА",
          metaDescription: "Кабинет обучающегося",
        };
      case "/cabinet-spo":
        return {
          title: "Личный кабинет — СПО и ВО — ТрассА",
          metaDescription: "Кабинет студента СПО и вуза",
        };
      case "/page4":
        return {
          title: "Страница 4 — Подрядчик — ТрассА",
          metaDescription: "Рабочий контур подрядчика для управления письмами и задачами",
        };
      case "/page4/proforientation":
        return {
          title: "Профориентация и кадры — Подрядчик — ТрассА",
          metaDescription: "Результаты профориентационного теста и подбор кадров",
        };
      case "/page5":
        return {
          title: "Страница 5 — РАДОР — ТрассА",
          metaDescription: "Рабочий контур ассоциации РАДОР для управления заявками, документами и мероприятиями",
        };
      case "/page5/proforientation":
        return {
          title: "Профориентация — РАДОР — ТрассА",
          metaDescription: "Результаты профориентационного теста обучающихся",
        };
      case "/page6":
        return {
          title: "Страница 6 — АДО — ТрассА",
          metaDescription: "Рабочий контур АДО для управления заявками, документами и мероприятиями",
        };
      case "/page6/proforientation":
        return {
          title: "Профориентация — АДО — ТрассА",
          metaDescription: "Результаты профориентационного теста обучающихся",
        };
      case "/profile":
        return {
          title: "Настройки профиля — ТрассА",
          metaDescription: "Личные данные, контакты и уведомления",
        };
      case "/download":
        return {
          title: "Скачать приложение — ТрассА",
          metaDescription: "Установка десктопной версии портала для Windows",
        };
      default:
        return {
          title: "ТрассА",
          metaDescription: "",
        };
    }
  }, [pathname]);

  useEffect(() => {
    document.title = pageMeta.title;

    const descriptionElement = document.querySelector('meta[name="description"]');
    if (descriptionElement) {
      descriptionElement.setAttribute("content", pageMeta.metaDescription);
    }
  }, [pageMeta]);

  return (
    <>
      <div className="app-shell">
        <div className="app-shell__bg" aria-hidden>
          <div className="app-shell__bgFill" />
          {pathname === "/services" ? <SeasonBackgroundLayer /> : null}
        </div>
        <div className="app-shell__main">
          <Suspense fallback={null}>
            <Routes>
              {APP_ROUTES.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Suspense>
        </div>
      </div>
      <MaintenanceOverlay />
    </>
  );
}

export default memo(App);