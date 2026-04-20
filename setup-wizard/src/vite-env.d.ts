/// <reference types="vite/client" />

type SetupApi = {
  pickFolder: () => Promise<string | null>;
  install: (dest: string) => Promise<{ ok: boolean; error?: string; exePath?: string }>;
  defaultPath: () => Promise<string>;
  openFolder: (dir: string) => Promise<void>;
  openExe: (exe: string) => Promise<void>;
  quit: () => void;
};

declare global {
  interface Window {
    trassaSetup: SetupApi;
  }
}

export {};
