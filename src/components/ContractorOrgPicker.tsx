import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { filterOrganizations } from "../utils/contractorOrganizations";
import styles from "./ContractorOrgPicker.module.css";

type Props = {
  id: string;
  organizations: string[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label: string;
};

export default function ContractorOrgPicker({
  id,
  organizations,
  value,
  onChange,
  disabled,
  placeholder = "Начните вводить название…",
  label,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(
    () => filterOrganizations(query, organizations),
    [query, organizations]
  );

  const showList =
    open &&
    !disabled &&
    organizations.length > 0 &&
    (filtered.length > 0 || query.trim().length > 0);

  const selectOrg = useCallback(
    (name: string) => {
      onChange(name);
      setQuery(name);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showList && e.key === "ArrowDown" && organizations.length > 0) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      if (!showList) return;
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        const pick = filtered[highlight] ?? filtered[0];
        if (pick) selectOrg(pick);
      }
    },
    [showList, organizations.length, filtered, highlight, selectOrg]
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.field}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            setHighlight(0);
            onChange(v);
          }}
          onFocus={() => {
            if (!disabled && organizations.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {showList ? (
          <ul id={listId} className={styles.list} role="listbox">
            {filtered.length === 0 ? (
              <li className={styles.empty} role="option">
                Ничего не найдено — выберите из списка или уточните запрос
              </li>
            ) : (
              filtered.map((org, i) => (
                <li
                  key={org}
                  role="option"
                  aria-selected={org === value}
                  className={`${styles.item} ${i === highlight ? styles.itemHi : ""}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOrg(org);
                  }}
                >
                  {org}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
