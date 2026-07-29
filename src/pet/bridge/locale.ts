export function getPetLocale(): "zh" | "en" {
  try {
    const raw = localStorage.getItem("language") || "zh";
    return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "zh";
  }
}
