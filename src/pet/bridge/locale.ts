export type PetLocale = "zh" | "en";

export const PET_LOCALE_STORAGE_KEY = "language";
export const PET_LOCALE_EVENT = "pet://locale-changed";

export function isPetLocale(value: unknown): value is PetLocale {
  return value === "zh" || value === "en";
}

export function getPetLocale(): PetLocale {
  try {
    const raw = localStorage.getItem(PET_LOCALE_STORAGE_KEY) || "zh";
    return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "zh";
  }
}

/** 写入偏好并广播；调用方再改 vue-i18n.locale */
export function setPetLocale(locale: PetLocale): void {
  try {
    localStorage.setItem(PET_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  try {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  } catch {
    // ignore
  }
  void import("@tauri-apps/api/event")
    .then(({ emit }) => emit(PET_LOCALE_EVENT, { locale }))
    .catch(() => {});
}
