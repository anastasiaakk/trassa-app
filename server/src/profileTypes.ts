/** Согласовано с `src/profileSettingsStorage.ts` (клиент). */

export type ProfileSettingsData = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  messengerUid: string;
  contractorCompanyName: string;
  email: string;
  phone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
};

export function defaultProfile(partial: Partial<ProfileSettingsData> & { email: string }): ProfileSettingsData {
  return {
    firstName: partial.firstName ?? "",
    lastName: partial.lastName ?? "",
    roleLabel: partial.roleLabel ?? "Организатор",
    messengerUid: partial.messengerUid ?? "",
    contractorCompanyName: partial.contractorCompanyName ?? "",
    email: partial.email.trim(),
    phone: partial.phone ?? "",
    notifyEmail: partial.notifyEmail ?? true,
    notifyPush: partial.notifyPush ?? false,
  };
}
