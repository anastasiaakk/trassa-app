import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadCabinetTheme, loadProfileSettings, type ProfileSettingsData } from "../profileSettingsStorage";
import { persistProfileToStores } from "../utils/profilePersist";
import {
  ADMIN_CABINET_SEARCH,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";

const AVATAR_URL =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/u4te4tx0_expires_30_days.png";

function readPortalRole(): string | null {
  try {
    return sessionStorage.getItem("trassaPortalRole");
  } catch {
    return null;
  }
}

function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const portalRole = readPortalRole();
  const fromPath =
    stateFrom ??
    (portalRole === "0"
      ? "/cabinet-school"
      : portalRole === "1"
        ? "/cabinet-spo"
        : "/page5");
  /** Поля кабинета подрядчика — только при входе из /page4, не в РАДОР/АДО. */
  const showContractorCabinetSection = fromPath === "/page4";
  /** Должность в профиле не редактируется для школьника и студента — роль задаётся категорией входа. */
  const showRoleLabelField =
    portalRole !== "0" &&
    portalRole !== "1" &&
    stateFrom !== "/cabinet-school" &&
    stateFrom !== "/cabinet-spo";

  const [form, setForm] = useState<ProfileSettingsData>(() => loadProfileSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Тема берётся из того же хранилища, что и переключатель в кабинете (Page5 / Page6). */
  const isDark = loadCabinetTheme() === "dark";

  const styles = useMemo(
    () => ({
      pageBg: isDark ? "#0f172a" : "#e8edf5",
      text: isDark ? "#f8fafc" : "#1c2b45",
      muted: isDark ? "#a9bfe0" : "#5f728f",
      surfaceBg: isDark ? "#1c2b45" : "#f8fafc",
      cardBg: isDark ? "#16202f" : "#edf3fb",
      sectionBg: isDark ? "#1b2c47" : "#f7faff",
      inputBg: isDark ? "#172636" : "#eef3f8",
      buttonBg: "#243b74",
      buttonText: "#f8fafc",
      cardShadow: isDark
        ? "20px 20px 40px rgba(0, 0, 0, 0.35)"
        : "20px 20px 40px rgba(142, 154, 178, 0.16), -20px -20px 40px rgba(255, 255, 255, 0.9)",
      insetShadow: isDark
        ? "inset 8px 8px 18px rgba(0, 0, 0, 0.24)"
        : "inset 8px 8px 18px rgba(142, 154, 178, 0.16), inset -8px -8px 18px rgba(255, 255, 255, 0.8)",
    }),
    [isDark]
  );

  useEffect(() => {
    document.body.style.backgroundColor = styles.pageBg;
  }, [styles.pageBg]);

  const goBack = useCallback(() => {
    navigate(fromPath);
  }, [navigate, fromPath]);

  const showReturnToAdmin = shouldShowReturnToAdminDashboard();
  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const handleSave = useCallback(() => {
    void (async () => {
      setSaveError(null);
      try {
        await persistProfileToStores(form);
        window.dispatchEvent(new Event("trassa-profile-saved"));
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2200);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Не удалось сохранить.");
      }
    })();
  }, [form]);

  const patch = useCallback((partial: Partial<ProfileSettingsData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "Inter, sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            padding: "20px 24px",
            borderRadius: 28,
            background: styles.surfaceBg,
            boxShadow: styles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              onClick={goBack}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: 18,
                padding: "12px 18px",
                fontWeight: 700,
                fontSize: 14,
                color: styles.text,
                background: styles.sectionBg,
                boxShadow: styles.cardShadow,
                fontFamily: "inherit",
              }}
            >
              ← В кабинет
            </button>
            {showReturnToAdmin ? (
              <button
                type="button"
                onClick={goToAdminCabinet}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 18,
                  padding: "12px 18px",
                  fontWeight: 700,
                  fontSize: 14,
                  color: styles.buttonText,
                  background: styles.buttonBg,
                  boxShadow: styles.cardShadow,
                  fontFamily: "inherit",
                }}
              >
                ← Кабинет администратора
              </button>
            ) : null}
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Настройки профиля</h1>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: 22,
            borderRadius: 28,
            background: isDark ? "#14263b" : "#2d4366",
            color: "#f8fafc",
            boxShadow: styles.cardShadow,
          }}
        >
          <img
            src={AVATAR_URL}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: 14, objectFit: "cover" }}
            decoding="async"
            fetchPriority="high"
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {form.firstName.trim() || "Имя не указано"}
            </div>
            {showContractorCabinetSection && form.contractorCompanyName.trim() ? (
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 600 }}>
                {form.contractorCompanyName.trim()}
              </div>
            ) : null}
          </div>
        </div>

        {showContractorCabinetSection ? (
          <section
            style={{
              padding: 26,
              borderRadius: 28,
              background: styles.sectionBg,
              boxShadow: styles.cardShadow,
            }}
          >
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
              КАБИНЕТ ПОДРЯДЧИКА
            </h2>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Наименование организации</span>
              <input
                value={form.contractorCompanyName}
                onChange={(e) => patch({ contractorCompanyName: e.target.value })}
                placeholder="Как на главной странице кабинета подрядчика"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.5, color: styles.muted }}>
              Это наименование отображается на главной в кабинете подрядчика (без подстановки из примера — только ваш текст).
            </p>
          </section>
        ) : null}

        <section
          style={{
            padding: 26,
            borderRadius: 28,
            background: styles.sectionBg,
            boxShadow: styles.cardShadow,
          }}
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            ЛИЧНЫЕ ДАННЫЕ
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Имя</span>
              <input
                value={form.firstName}
                onChange={(e) => patch({ firstName: e.target.value })}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Фамилия</span>
              <input
                value={form.lastName}
                onChange={(e) => patch({ lastName: e.target.value })}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            {showRoleLabelField ? (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Должность / роль в системе</span>
                <input
                  value={form.roleLabel}
                  onChange={(e) => patch({ roleLabel: e.target.value })}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    fontSize: 15,
                    color: styles.text,
                    background: styles.inputBg,
                    boxShadow: styles.insetShadow,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </label>
            ) : null}
          </div>
        </section>

        <section
          style={{
            padding: 26,
            borderRadius: 28,
            background: styles.sectionBg,
            boxShadow: styles.cardShadow,
          }}
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            КОНТАКТЫ
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Электронная почта</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="например@mail.ru"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: styles.muted }}>Телефон</span>
              <input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+7 …"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  fontSize: 15,
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
          </div>
        </section>

        <section
          style={{
            padding: 26,
            borderRadius: 28,
            background: styles.sectionBg,
            boxShadow: styles.cardShadow,
          }}
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", color: styles.muted }}>
            УВЕДОМЛЕНИЯ
          </h2>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={form.notifyEmail}
              onChange={(e) => patch({ notifyEmail: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 15 }}>Письма о заявках и документах на e-mail</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.notifyPush}
              onChange={(e) => patch({ notifyPush: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 15 }}>Мгновенные уведомления о мероприятиях</span>
          </label>
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: "14px 28px",
              fontWeight: 800,
              fontSize: 15,
              color: styles.buttonText,
              background: styles.buttonBg,
              boxShadow: styles.insetShadow,
              fontFamily: "inherit",
            }}
          >
            Сохранить
          </button>
          {saveError ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{saveError}</span>
          ) : null}
          {savedFlash ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>Изменения сохранены</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileSettings);
