import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ChatTurn } from "../utils/aiAssistantReply";
import { getTamagotchiCatReply } from "../utils/adminTamagotchiAi";
import {
  applyTimeDecay,
  feedPet,
  loadTamagotchi,
  loadTamagotchiMessages,
  petStroke,
  saveTamagotchi,
  saveTamagotchiMessages,
  type TamagotchiMsg,
  type TamagotchiV1,
} from "../utils/adminTamagotchiStorage";
import styles from "./AdminTamagotchiCat.module.css";

const PET = 72;
const MARGIN = 10;
const WALK_MS = 45;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function CatSvg({ fur, belly, facingRight }: { fur: string; belly: string; facingRight: boolean }) {
  const uid = useId().replace(/:/g, "");
  const gFur = `fur-${uid}`;
  const gBelly = `belly-${uid}`;
  const gEar = `ear-${uid}`;
  const pawPad = "#e8a4b8";
  const shadow = "rgba(45, 35, 55, 0.22)";
  const strokeSoft = "rgba(255, 255, 255, 0.35)";

  return (
    <svg
      width={PET}
      height={PET}
      viewBox="0 0 80 80"
      className={`${styles.catSvg} ${facingRight ? styles.faceRight : styles.faceLeft}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gFur} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fur} stopOpacity={1} />
          <stop offset="100%" stopColor={fur} stopOpacity={0.88} />
        </linearGradient>
        <linearGradient id={gBelly} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={belly} stopOpacity={1} />
          <stop offset="100%" stopColor={belly} stopOpacity={0.92} />
        </linearGradient>
        <radialGradient id={gEar} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffd6e0" />
          <stop offset="100%" stopColor="#f0a8bc" />
        </radialGradient>
      </defs>

      <ellipse className={styles.groundShadow} cx="40" cy="72" rx="26" ry="5" fill={shadow} />

      <g className={styles.catRig}>
        <g className={styles.tailGroup}>
          <path
            d="M14 48 Q6 38 10 28 Q14 18 22 22 Q18 32 20 42 Q18 52 24 56 Z"
            fill={`url(#${gFur})`}
            stroke={strokeSoft}
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <ellipse cx="12" cy="26" rx="5" ry="6" fill={`url(#${gFur})`} opacity="0.95" />
        </g>

        <g className={styles.rearGroup}>
          <ellipse cx="22" cy="58" rx="12" ry="10" fill={`url(#${gFur})`} />
          <ellipse cx="58" cy="58" rx="12" ry="10" fill={`url(#${gFur})`} />
          <g opacity="0.95">
            <ellipse cx="18" cy="64" rx="7" ry="5" fill={`url(#${gFur})`} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
            <ellipse cx="62" cy="64" rx="7" ry="5" fill={`url(#${gFur})`} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
            <circle cx="16" cy="63" r="1.6" fill={pawPad} opacity="0.85" />
            <circle cx="19" cy="65" r="1.4" fill={pawPad} opacity="0.85" />
            <circle cx="22" cy="63" r="1.4" fill={pawPad} opacity="0.85" />
            <circle cx="58" cy="63" r="1.6" fill={pawPad} opacity="0.85" />
            <circle cx="61" cy="65" r="1.4" fill={pawPad} opacity="0.85" />
            <circle cx="64" cy="63" r="1.4" fill={pawPad} opacity="0.85" />
          </g>
        </g>

        <g className={styles.torsoGroup}>
          <ellipse cx="40" cy="46" rx="23" ry="19" fill={`url(#${gFur})`} />
          <ellipse cx="40" cy="48" rx="15" ry="12" fill={`url(#${gBelly})`} />
          <ellipse cx="40" cy="44" rx="10" ry="7" fill="#ffffff" opacity="0.18" />
          <path
            d="M28 52 L28 62 Q28 66 32 66 L36 66 Q40 66 40 62 L40 52"
            fill={`url(#${gFur})`}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="0.4"
          />
          <path
            d="M40 52 L40 62 Q40 66 44 66 L48 66 Q52 66 52 62 L52 52"
            fill={`url(#${gFur})`}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="0.4"
          />
          <g className={styles.frontPawsGroup}>
            <ellipse cx="34" cy="67" rx="8" ry="5.5" fill={`url(#${gFur})`} stroke={strokeSoft} strokeWidth="0.5" />
            <ellipse cx="46" cy="67" rx="8" ry="5.5" fill={`url(#${gFur})`} stroke={strokeSoft} strokeWidth="0.5" />
            <circle cx="31" cy="66" r="1.8" fill={pawPad} opacity="0.9" />
            <circle cx="34" cy="68" r="1.5" fill={pawPad} opacity="0.9" />
            <circle cx="37" cy="66" r="1.5" fill={pawPad} opacity="0.9" />
            <circle cx="43" cy="66" r="1.8" fill={pawPad} opacity="0.9" />
            <circle cx="46" cy="68" r="1.5" fill={pawPad} opacity="0.9" />
            <circle cx="49" cy="66" r="1.5" fill={pawPad} opacity="0.9" />
          </g>
        </g>

        <g className={styles.headGroup}>
          {/* Уши под кругом головы — стык выглядит естественно */}
          <g className={styles.earLeft}>
            <path
              d="M 23 18.5 L 28 6.5 L 33 18.5 Q 28 16.8 23 18.5 Z"
              fill={`url(#${gFur})`}
              stroke={strokeSoft}
              strokeWidth="0.45"
              strokeLinejoin="round"
            />
            <path
              d="M 25.2 16.8 L 28 10.5 L 30.8 16.8 Q 28 15.4 25.2 16.8 Z"
              fill={`url(#${gEar})`}
            />
          </g>
          <g className={styles.earRight}>
            <path
              d="M 47 18.5 L 52 6.5 L 57 18.5 Q 52 16.8 47 18.5 Z"
              fill={`url(#${gFur})`}
              stroke={strokeSoft}
              strokeWidth="0.45"
              strokeLinejoin="round"
            />
            <path
              d="M 49.2 16.8 L 52 10.5 L 54.8 16.8 Q 52 15.4 49.2 16.8 Z"
              fill={`url(#${gEar})`}
            />
          </g>

          <circle cx="40" cy="28" r="17" fill={`url(#${gFur})`} />
          <ellipse cx="40" cy="30" rx="11" ry="9" fill={`url(#${gBelly})`} opacity="0.55" />

          <g className={styles.faceGroup}>
            <g className={styles.eyesGroup}>
              <ellipse cx="32" cy="26" rx="4.2" ry="5" fill="#1a1520" />
              <ellipse cx="48" cy="26" rx="4.2" ry="5" fill="#1a1520" />
              <ellipse cx="33" cy="25" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
              <ellipse cx="49" cy="25" rx="1.6" ry="1.8" fill="#ffffff" opacity="0.95" />
              <ellipse cx="32.3" cy="26.5" rx="0.7" ry="0.8" fill="#7ecbff" opacity="0.35" />
            </g>
            <path d="M40 32 L37 36 L43 36 Z" fill="#f090a8" className={styles.noseShape} />
            <path
              className={styles.mouthLine}
              d="M34 38 Q40 42 46 38"
              stroke="#c89588"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="26" cy="32" rx="3.5" ry="2" fill="#ffb0c8" opacity="0.45" />
            <ellipse cx="54" cy="32" rx="3.5" ry="2" fill="#ffb0c8" opacity="0.45" />
            <g
              className={styles.whiskersGroup}
              stroke="rgba(40,35,50,0.25)"
              strokeWidth="0.9"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M18 28 L8 26" />
              <path d="M17 31 L6 31" />
              <path d="M18 34 L8 36" />
              <path d="M62 28 L72 26" />
              <path d="M63 31 L74 31" />
              <path d="M62 34 L72 36" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const AdminTamagotchiCat = memo(function AdminTamagotchiCat() {
  const [pet, setPet] = useState<TamagotchiV1>(() => {
    const p = loadTamagotchi();
    if (typeof window === "undefined") return p;
    return {
      ...p,
      pos: {
        left: clamp(p.pos.left, MARGIN, window.innerWidth - PET - MARGIN),
        top: clamp(p.pos.top, MARGIN, window.innerHeight - PET - MARGIN),
      },
    };
  });
  const [msgs, setMsgs] = useState<TamagotchiMsg[]>(() => loadTamagotchiMessages());
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const velRef = useRef({ vx: 0.35, vy: 0.22 });
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [facingRight, setFacingRight] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPet((prev) => {
        const next = applyTimeDecay(prev, Date.now());
        saveTamagotchi(next);
        return next;
      });
    }, 45_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    saveTamagotchiMessages(msgs);
  }, [msgs]);

  const pos = pet.pos;
  const walkActive = pet.walk && !dragging && !panelOpen;

  useEffect(() => {
    if (!walkActive) return;
    const t = window.setInterval(() => {
      setPet((prev) => {
        let { vx, vy } = velRef.current;
        if (Math.random() < 0.07) {
          vx += (Math.random() - 0.5) * 0.25;
          vy += (Math.random() - 0.5) * 0.25;
        }
        vx = clamp(vx, -1.1, 1.1);
        vy = clamp(vy, -1.1, 1.1);
        const sp = 2.2;
        let left = prev.pos.left + vx * sp;
        let top = prev.pos.top + vy * sp;
        const maxL = window.innerWidth - PET - MARGIN;
        const maxT = window.innerHeight - PET - MARGIN;
        if (left <= MARGIN) {
          left = MARGIN;
          vx = Math.abs(vx) * (0.75 + Math.random() * 0.5);
        } else if (left >= maxL) {
          left = maxL;
          vx = -Math.abs(vx) * (0.75 + Math.random() * 0.5);
        }
        if (top <= MARGIN) {
          top = MARGIN;
          vy = Math.abs(vy) * (0.75 + Math.random() * 0.5);
        } else if (top >= maxT) {
          top = maxT;
          vy = -Math.abs(vy) * (0.75 + Math.random() * 0.5);
        }
        velRef.current = { vx, vy };
        setFacingRight(vx >= 0);
        const next = { ...prev, pos: { left, top }, lastTick: prev.lastTick };
        saveTamagotchi(next);
        return next;
      });
    }, WALK_MS);
    return () => window.clearInterval(t);
  }, [walkActive]);

  const onPetMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      ox: e.clientX - pet.pos.left,
      oy: e.clientY - pet.pos.top,
    };
    setDragging(true);
  }, [pet.pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const left = clamp(
        e.clientX - d.ox,
        MARGIN,
        window.innerWidth - PET - MARGIN
      );
      const top = clamp(
        e.clientY - d.oy,
        MARGIN,
        window.innerHeight - PET - MARGIN
      );
      setPet((prev) => {
        const next = { ...prev, pos: { left, top } };
        saveTamagotchi(next);
        return next;
      });
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const onResize = useCallback(() => {
    setPet((prev) => {
      const next = {
        ...prev,
        pos: {
          left: clamp(prev.pos.left, MARGIN, window.innerWidth - PET - MARGIN),
          top: clamp(prev.pos.top, MARGIN, window.innerHeight - PET - MARGIN),
        },
      };
      saveTamagotchi(next);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onResize]);

  const historyForAi = useMemo((): ChatTurn[] => {
    return msgs.map((m) => ({
      role: m.role === "ai" ? ("ai" as const) : ("user" as const),
      text: m.text,
    }));
  }, [msgs]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    const userMsg: TamagotchiMsg = {
      role: "user",
      text,
      ts: Date.now(),
    };
    setMsgs((m) => [...m, userMsg]);
    setChatInput("");
    try {
      const turns: ChatTurn[] = [
        ...historyForAi,
        { role: "user", text },
      ];
      const reply = await getTamagotchiCatReply(
        pet.name,
        pet.satiety,
        pet.happiness,
        turns
      );
      const aiMsg: TamagotchiMsg = {
        role: "ai",
        text: reply,
        ts: Date.now(),
      };
      setMsgs((m) => [...m, aiMsg]);
      setPet((prev) => {
        const next: TamagotchiV1 = {
          ...prev,
          happiness: clamp(prev.happiness + 3, 0, 100),
          lastTick: Date.now(),
        };
        saveTamagotchi(next);
        return next;
      });
    } catch {
      const aiMsg: TamagotchiMsg = {
        role: "ai",
        text: "Мрр… что-то пошло не так. Попробуйте ещё раз.",
        ts: Date.now(),
      };
      setMsgs((m) => [...m, aiMsg]);
    } finally {
      setChatBusy(false);
    }
  }, [chatBusy, chatInput, historyForAi, pet.happiness, pet.name, pet.satiety]);

  const onFeed = useCallback(() => {
    setPet((prev) => {
      const next = feedPet(prev);
      saveTamagotchi(next);
      return next;
    });
  }, []);

  const onStroke = useCallback(() => {
    setPet((prev) => {
      const next = petStroke(prev);
      saveTamagotchi(next);
      return next;
    });
  }, []);

  const updateName = useCallback((name: string) => {
    setPet((prev) => {
      const next = {
        ...prev,
        name: name.trim().slice(0, 32) || "Мурзик",
      };
      saveTamagotchi(next);
      return next;
    });
  }, []);

  const updateColors = useCallback((fur: string, belly: string) => {
    setPet((prev) => {
      const next = { ...prev, fur, belly };
      saveTamagotchi(next);
      return next;
    });
  }, []);

  const toggleWalk = useCallback(() => {
    setPet((prev) => {
      const next = { ...prev, walk: !prev.walk };
      saveTamagotchi(next);
      return next;
    });
  }, []);

  const lowSatiety = pet.satiety < 30;
  const happyCat = pet.happiness >= 68;

  const petWrapMods = [
    styles.petWrap,
    lowSatiety && styles.petWrapLow,
    lowSatiety && styles.petWrapHungry,
    walkActive && styles.petWrapWalk,
    dragging && styles.petWrapDrag,
    panelOpen && styles.petWrapPanel,
    chatBusy && styles.petWrapThink,
    happyCat && !lowSatiety && styles.petWrapHappy,
  ]
    .filter(Boolean)
    .join(" ");

  const ui = (
    <div className={styles.root}>
      <div
        className={petWrapMods}
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={onPetMouseDown}
        role="img"
        aria-label={`Питомец ${pet.name}, перетащите мышью`}
      >
        {lowSatiety ? (
          <span className={styles.bubbleHint}>Покорми меня…</span>
        ) : null}
        <CatSvg fur={pet.fur} belly={pet.belly} facingRight={facingRight} />
        <div className={styles.miniBar} aria-hidden>
          <div
            className={styles.miniBarFill}
            style={{ width: `${pet.satiety}%` }}
          />
        </div>
        <button
          type="button"
          className={styles.openBtn}
          aria-label="Открыть панель питомца"
          onClick={(e) => {
            e.stopPropagation();
            setPanelOpen((v) => !v);
          }}
        >
          💬
        </button>
      </div>

      {panelOpen ? (
        <div className={styles.panel} role="dialog" aria-label="Питомец администратора">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>{pet.name} · тамагочи</h2>
            <button
              type="button"
              className={styles.panelClose}
              onClick={() => setPanelOpen(false)}
            >
              Закрыть
            </button>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.statRow}>
              <div className={styles.barLabel}>
                Сытость
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${pet.satiety}%`,
                      background: `linear-gradient(90deg,#f59e0b,#84cc16)`,
                    }}
                  />
                </div>
              </div>
              <div className={styles.barLabel}>
                Радость
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${pet.happiness}%`,
                      background: `linear-gradient(90deg,#a78bfa,#f472b6)`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onFeed}>
                Покормить
              </button>
              <button type="button" className={styles.btn} onClick={onStroke}>
                Погладить
              </button>
            </div>

            <label className={styles.walkRow}>
              <input
                type="checkbox"
                checked={pet.walk}
                onChange={toggleWalk}
              />
              Гулять по экрану (как Shimeji)
            </label>

            <div className={styles.customGrid}>
              <label>
                Имя
                <input
                  type="text"
                  value={pet.name}
                  maxLength={32}
                  onChange={(e) => updateName(e.target.value)}
                />
              </label>
              <label>
                Шерсть
                <input
                  type="color"
                  value={pet.fur}
                  onChange={(e) => updateColors(e.target.value, pet.belly)}
                />
              </label>
              <label>
                Пузо / морда
                <input
                  type="color"
                  value={pet.belly}
                  onChange={(e) => updateColors(pet.fur, e.target.value)}
                />
              </label>
            </div>

            <p className={styles.hint}>
              ИИ отвечает через тот же канал, что Т-бот (при наличии{" "}
              <code>VITE_AI_CHAT_URL</code> — ваш сервер, иначе локальный «умный» режим).
            </p>

            <div className={styles.messages} aria-live="polite">
              {msgs.length === 0 ? (
                <div className={`${styles.msg} ${styles.msgAi}`}>
                  Мяу! Я {pet.name}. Поговори со мной или покорми — буду умнее с каждым
                  разговором.
                </div>
              ) : (
                msgs.map((m) => (
                  <div
                    key={m.ts + m.text.slice(0, 12)}
                    className={`${styles.msg} ${
                      m.role === "user" ? styles.msgUser : styles.msgAi
                    }`}
                  >
                    {m.text}
                  </div>
                ))
              )}
            </div>

            <form
              className={styles.chatForm}
              onSubmit={(e) => {
                e.preventDefault();
                void sendChat();
              }}
            >
              <input
                className={styles.chatInput}
                placeholder="Написать коту…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatBusy}
              />
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={chatBusy || !chatInput.trim()}
              >
                {chatBusy ? "…" : "Отправить"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(ui, document.body);
});

export default AdminTamagotchiCat;
