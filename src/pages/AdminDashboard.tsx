import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import {
  adminOverrideUserProfile,
  deleteRegisteredUser,
  isLegacyLoginAllowed,
  listRegisteredUsers,
  resetPasswordForEmail,
  type LocalUserRecord,
} from "../utils/localAuth";
import {
  getAdminCabinetInfo,
  getAdminSessionEmail,
  logoutAdmin,
  updateAdminPassword,
} from "../utils/adminAuth";
import {
  loadMaintenanceState,
  saveMaintenanceState,
} from "../utils/maintenanceMode";
import {
  loadSeasonBackground,
  saveSeasonBackground,
  type SeasonMode,
} from "../utils/seasonBackground";
import {
  clearSharedCalendarEvents,
  resetMessengerLocalData,
} from "../utils/adminDemoData";
import { PASSWORD_RULES_SHORT, validatePasswordPolicy } from "../utils/passwordPolicy";
import {
  addContractorOrganization,
  loadContractorOrganizations,
  removeContractorOrganization,
} from "../utils/contractorOrganizations";
import AdminTamagotchiCat from "../components/AdminTamagotchiCat";
import { markNavigationFromAdminDashboard } from "../utils/adminReturnNavigation";
import styles from "./AdminPanel.module.css";

type Props = {
  onLogout: () => void;
  useParentPageBackground?: boolean;
};

function profileToForm(p: ProfileSettingsData): ProfileSettingsData {
  return { ...p };
}

function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function orgListSummary(count: number): string {
  if (count === 0) return "список пуст";
  return `${count} ${ruPlural(count, "организация", "организации", "организаций")}`;
}

function usersListSummary(count: number): string {
  if (count === 0) return "нет записей";
  return `${count} ${ruPlural(count, "пользователь", "пользователя", "пользователей")}`;
}

export default function AdminDashboard({
  onLogout,
  useParentPageBackground = false,
}: Props) {
  const adminEmail = useMemo(() => getAdminSessionEmail(), []);
  const cabinet = useMemo(() => getAdminCabinetInfo(adminEmail), [adminEmail]);
  const [users, setUsers] = useState<LocalUserRecord[]>(() =>
    listRegisteredUsers()
  );
  const [maintenance, setMaintenance] = useState(loadMaintenanceState);
  const [seasonBg, setSeasonBg] = useState<SeasonMode>(loadSeasonBackground);
  const [editing, setEditing] = useState<LocalUserRecord | null>(null);
  const [editForm, setEditForm] = useState<ProfileSettingsData | null>(null);
  const [pwUserEmail, setPwUserEmail] = useState<string | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [adminOldPw, setAdminOldPw] = useState("");
  const [adminNewPw, setAdminNewPw] = useState("");
  const [adminPwMsg, setAdminPwMsg] = useState<string | null>(null);
  const [contractorOrgs, setContractorOrgs] = useState<string[]>(() => loadContractorOrganizations());
  const [newOrgName, setNewOrgName] = useState("");
  const [orgListMsg, setOrgListMsg] = useState<string | null>(null);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (editing !== null || pwUserEmail !== null) {
      setUsersOpen(true);
    }
  }, [editing, pwUserEmail]);

  const refreshContractorOrgs = useCallback(() => {
    setContractorOrgs(loadContractorOrganizations());
  }, []);

  const refreshUsers = useCallback(() => {
    setUsers(listRegisteredUsers());
  }, []);

  const deleteUser = useCallback(
    (u: LocalUserRecord) => {
      const label = u.profile.email || u.emailNorm;
      if (
        !window.confirm(
          `Удалить пользователя ${label}?\nВход по этому адресу станет невозможен. Связанные данные (в т.ч. профориентация) будут удалены. Действие необратимо.`
        )
      ) {
        return;
      }
      const r = deleteRegisteredUser(u.emailNorm);
      if (!r.ok) {
        setDataMessage(r.error ?? "Не удалось удалить пользователя.");
        return;
      }
      setDataMessage(`Пользователь ${label} удалён.`);
      if (editing?.emailNorm === u.emailNorm) {
        setEditing(null);
        setEditForm(null);
      }
      if (pwUserEmail === u.emailNorm) {
        setPwUserEmail(null);
        setPwMessage(null);
        setNewUserPassword("");
      }
      refreshUsers();
    },
    [editing?.emailNorm, pwUserEmail, refreshUsers]
  );

  const openEdit = useCallback((u: LocalUserRecord) => {
    setEditing(u);
    setEditForm(profileToForm(u.profile));
  }, []);

  const saveEdit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!editing || !editForm) return;
      const ok = adminOverrideUserProfile(editing.emailNorm, editForm);
      if (ok) {
        refreshUsers();
        setEditing(null);
        setEditForm(null);
      }
    },
    [editForm, editing, refreshUsers]
  );

  const setUserPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!pwUserEmail) return;
      setPwMessage(null);
      const err = validatePasswordPolicy(newUserPassword);
      if (err) {
        setPwMessage(err);
        return;
      }
      const r = await resetPasswordForEmail(pwUserEmail, newUserPassword);
      if (r.ok) {
        setPwMessage("Пароль обновлён.");
        setNewUserPassword("");
        setPwUserEmail(null);
      } else {
        setPwMessage(r.error);
      }
    },
    [newUserPassword, pwUserEmail]
  );

  const toggleMaintenance = useCallback(
    (active: boolean) => {
      const next = { ...maintenance, active };
      setMaintenance(next);
      saveMaintenanceState(next);
    },
    [maintenance]
  );

  const updateMaintenanceMessage = useCallback(
    (message: string) => {
      const next = { ...maintenance, message };
      setMaintenance(next);
      saveMaintenanceState(next);
    },
    [maintenance]
  );

  const setSeasonBackground = useCallback((mode: SeasonMode) => {
    setSeasonBg(mode);
    saveSeasonBackground(mode);
  }, []);

  const handleAddContractorOrg = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setOrgListMsg(null);
      const r = addContractorOrganization(newOrgName);
      if (r.ok) {
        setNewOrgName("");
        refreshContractorOrgs();
        setOrgListMsg("Организация добавлена в список для подрядчиков.");
      } else {
        setOrgListMsg(r.error);
      }
    },
    [newOrgName, refreshContractorOrgs]
  );

  const handleRemoveContractorOrg = useCallback(
    (name: string) => {
      removeContractorOrganization(name);
      refreshContractorOrgs();
      setOrgListMsg("Название удалено из списка.");
    },
    [refreshContractorOrgs]
  );

  const handleAdminPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAdminPwMsg(null);
      const r = await updateAdminPassword(adminOldPw, adminNewPw);
      if (r.ok) {
        setAdminPwMsg("Пароль администратора изменён.");
        setAdminOldPw("");
        setAdminNewPw("");
      } else {
        setAdminPwMsg(r.error);
      }
    },
    [adminNewPw, adminOldPw]
  );

  const handleLogout = useCallback(() => {
    logoutAdmin();
    onLogout();
  }, [onLogout]);

  const legacy = isLegacyLoginAllowed();

  const themeClass =
    cabinet.cabinetId === "anastasia" ? styles.themeAnastasia : styles.themeKsenia;

  return (
    <div
      className={`${styles.cabinetPage} ${styles.cabinetDashboard} ${styles.cabinetPageWithPaws} ${themeClass} ${useParentPageBackground ? styles.cabinetPageEmbed : ""}`}
    >
      <div
        className={`${styles.cabinetBg} ${useParentPageBackground ? styles.cabinetBgTransparent : ""}`}
        aria-hidden
      />

      <div className={styles.shell}>
        <header className={styles.cabinetHero}>
          <div className={styles.cabinetHeroAvatar} aria-hidden>
            {cabinet.cabinetId === "anastasia" ? "🌸" : "🌷"}
          </div>
          <div className={styles.cabinetHeroText}>
            <p className={styles.cabinetKicker}>Личный кабинет администратора</p>
            <h2 className={styles.cabinetTitle}>
              Здравствуйте, {cabinet.displayName}!
            </h2>
            <p className={styles.cabinetEmail}>{adminEmail ?? ""}</p>
          </div>
          <div className={styles.cabinetHeroActions}>
            <button type="button" className={styles.btnNeoDanger} onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>

        <div className={`${styles.neoCard} ${styles.cabinetCard}`}>
        <h3 className={styles.dashboardSectionHeading}>Управление порталом</h3>
        <p className={styles.subtitleNeo}>
          Настройки ниже применяются сразу после сохранения.
        </p>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Технические работы</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            При включении остальные страницы портала недоступны. Раздел «Карта
            подрядчиков» (/services) остаётся открытым для входа администратора.
          </p>
          <div className={styles.toggleRow}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={maintenance.active}
                onChange={(e) => toggleMaintenance(e.target.checked)}
              />
              <span>Режим технических работ</span>
            </label>
          </div>
          <textarea
            className={styles.textarea}
            value={maintenance.message}
            onChange={(e) => updateMaintenanceMessage(e.target.value)}
            placeholder="Текст для пользователей"
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Фоновая анимация</h3>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            Лепестки и эффекты на фоне всех страниц портала. Изменение
            применяется сразу, в том числе в других открытых вкладках.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {(
              [
                ["off", "Выключено"],
                ["spring", "Весна — лепестки яблони"],
                ["summer", "Лето — зелёные листья"],
                ["autumn", "Осень — опадающая листва"],
                ["winter", "Зима — снежинки"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#2a3f5f",
                }}
              >
                <input
                  type="radio"
                  name="season-bg"
                  checked={seasonBg === value}
                  onChange={() => setSeasonBackground(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.collapseTrigger}
            aria-expanded={orgsOpen}
            onClick={() => setOrgsOpen((v) => !v)}
          >
            <span
              className={`${styles.collapseChevron} ${orgsOpen ? styles.collapseChevronOpen : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Организации подрядчиков
            </h3>
            <span className={styles.collapseMeta}>{orgListSummary(contractorOrgs.length)}</span>
          </button>
          {orgsOpen ? (
            <div className={styles.collapseBody}>
              <p className={styles.subtitle} style={{ marginBottom: 12 }}>
                Список для входа и регистрации в роли «Подрядчик». Без выбора организации из этого списка
                пользователь не попадёт в кабинет.
              </p>
              <form className={styles.form} onSubmit={handleAddContractorOrg}>
                <label className={styles.label}>
                  Новая организация
                  <input
                    className={styles.input}
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Полное наименование"
                    maxLength={200}
                  />
                </label>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Добавить в список
                </button>
              </form>
              {orgListMsg ? <p className={styles.okMsg}>{orgListMsg}</p> : null}
              <div className={styles.tableWrap} style={{ marginTop: 16 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th style={{ width: 120 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {contractorOrgs.length === 0 ? (
                      <tr>
                        <td colSpan={2}>
                          <span className={styles.hint}>Список пуст — добавьте организации выше.</span>
                        </td>
                      </tr>
                    ) : (
                      contractorOrgs.map((name) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleRemoveContractorOrg(name)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Данные кабинетов</h3>
          <p className={styles.subtitle}>
            Очистка демо-данных. Действие необратимо.
          </p>
          <div className={styles.rowBtns}>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                clearSharedCalendarEvents();
                setDataMessage("Общий календарь мероприятий очищен.");
              }}
            >
              Очистить общий календарь
            </button>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                resetMessengerLocalData();
                setDataMessage("Данные мессенджера сброшены.");
              }}
            >
              Сбросить мессенджер
            </button>
          </div>
          {dataMessage ? <p className={styles.okMsg}>{dataMessage}</p> : null}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.collapseTrigger}
            aria-expanded={usersOpen}
            onClick={() => setUsersOpen((v) => !v)}
          >
            <span
              className={`${styles.collapseChevron} ${usersOpen ? styles.collapseChevronOpen : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
              Пользователи портала
            </h3>
            <span className={styles.collapseMeta}>{usersListSummary(users.length)}</span>
          </button>
          {usersOpen ? (
            <div className={styles.collapseBody}>
          {legacy ? (
            <p className={styles.hint}>
              Зарегистрированных пользователей пока нет — на странице входа
              допускается прежний демо-вход с любым логином и паролем.
            </p>
          ) : null}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Электронная почта</th>
                  <th>Имя</th>
                  <th>Должность</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.emailNorm}>
                    <td>{u.profile.email || u.emailNorm}</td>
                    <td>
                      {u.profile.firstName} {u.profile.lastName}
                    </td>
                    <td>{u.profile.roleLabel}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => openEdit(u)}
                      >
                        Править
                      </button>{" "}
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => {
                          setPwUserEmail(u.emailNorm);
                          setPwMessage(null);
                          setNewUserPassword("");
                        }}
                      >
                        Пароль
                      </button>{" "}
                      <button
                        type="button"
                        className={styles.btnSmallDanger}
                        onClick={() => deleteUser(u)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && editForm ? (
            <form className={styles.editGrid} onSubmit={saveEdit}>
              <h4 className={styles.sectionTitle} style={{ gridColumn: "1 / -1" }}>
                Профиль: {editing.emailNorm}
              </h4>
              <label className={styles.label}>
                Имя
                <input
                  className={styles.input}
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Фамилия
                <input
                  className={styles.input}
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Должность / роль в системе
                <input
                  className={styles.input}
                  value={editForm.roleLabel}
                  onChange={(e) =>
                    setEditForm({ ...editForm, roleLabel: e.target.value })
                  }
                />
              </label>
              <label className={styles.label}>
                Телефон
                <input
                  className={styles.input}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </label>
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Организация (подрядчик)
                <input
                  className={styles.input}
                  value={editForm.contractorCompanyName}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      contractorCompanyName: e.target.value,
                    })
                  }
                />
              </label>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={editForm.notifyEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notifyEmail: e.target.checked })
                  }
                />{" "}
                Уведомления e-mail
              </label>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={editForm.notifyPush}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notifyPush: e.target.checked })
                  }
                />{" "}
                Push
              </label>
              <div className={styles.rowBtns} style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Сохранить
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => {
                    setEditing(null);
                    setEditForm(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}

          {pwUserEmail ? (
            <form className={styles.form} style={{ marginTop: 16 }} onSubmit={setUserPassword}>
              <h4 className={styles.sectionTitle}>
                Новый пароль для {pwUserEmail}
              </h4>
              <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
              <label className={styles.label}>
                Новый пароль
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </label>
              {pwMessage ? (
                <p
                  className={
                    pwMessage.includes("обновлён") ? styles.okMsg : styles.error
                  }
                >
                  {pwMessage}
                </p>
              ) : null}
              <div className={styles.rowBtns}>
                <button type="submit" className={styles.btnNeoPrimary}>
                  Установить пароль
                </button>
                <button
                  type="button"
                  className={styles.btnNeoGhost}
                  onClick={() => setPwUserEmail(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Смена пароля администратора</h3>
          <form className={styles.form} onSubmit={handleAdminPassword}>
            <label className={styles.label}>
              Текущий пароль
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={adminOldPw}
                onChange={(e) => setAdminOldPw(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              Новый пароль
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={adminNewPw}
                onChange={(e) => setAdminNewPw(e.target.value)}
              />
            </label>
            <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
            {adminPwMsg ? (
              <p
                className={
                  adminPwMsg.includes("изменён") ? styles.okMsg : styles.error
                }
              >
                {adminPwMsg}
              </p>
            ) : null}
            <button type="submit" className={styles.btnNeoPrimaryNeutral}>
              Сменить пароль
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Быстрые ссылки</h3>
          <div className={styles.links}>
            <Link to="/page3" onClick={markNavigationFromAdminDashboard}>
              Вход в кабинеты (роли)
            </Link>
            <Link to="/cabinet-school" onClick={markNavigationFromAdminDashboard}>
              Кабинет школьника
            </Link>
            <Link to="/cabinet-spo" onClick={markNavigationFromAdminDashboard}>
              Кабинет студента
            </Link>
            <Link to="/page4" onClick={markNavigationFromAdminDashboard}>
              Подрядчик
            </Link>
            <Link to="/page5" onClick={markNavigationFromAdminDashboard}>
              РАДОР
            </Link>
            <Link to="/page6" onClick={markNavigationFromAdminDashboard}>
              АДО
            </Link>
            <Link to="/profile" onClick={markNavigationFromAdminDashboard}>
              Настройки профиля
            </Link>
          </div>
        </div>
        </div>
      </div>

      <AdminTamagotchiCat />
    </div>
  );
}
