import { Navigate } from "react-router-dom";

/** Сохраняем старый URL: открываем «О нас» на вкладке загрузки приложения. */
function DownloadDesktopPage() {
  return <Navigate to="/services?about=download" replace />;
}

export default DownloadDesktopPage;
