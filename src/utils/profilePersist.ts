import { saveProfileSettings, type ProfileSettingsData } from "../profileSettingsStorage";
import * as authApi from "../api/authApi";
import { isAuthApiEnabled } from "./authMode";
import { syncCurrentUserProfile } from "./localAuth";

/**
 * Сохраняет профиль локально и при включённом API — на сервере.
 */
export async function persistProfileToStores(profile: ProfileSettingsData): Promise<void> {
  saveProfileSettings(profile);
  if (isAuthApiEnabled()) {
    const r = await authApi.authPatchProfile(profile);
    if (!r.ok) {
      throw new Error(r.error);
    }
    saveProfileSettings(r.profile);
    return;
  }
  syncCurrentUserProfile(profile);
}
