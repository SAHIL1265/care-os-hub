export type LanguageCode =
  | "en" | "hi" | "mr" | "bn" | "gu" | "ta" | "te" | "kn" | "ml"
  | "pa" | "ur" | "ja" | "es" | "fr" | "de" | "zh";

export type LanguageMeta = {
  code: LanguageCode;
  label: string;      // native name
  english: string;    // english name
  font: string;       // font stack that supports the script
  dir: "ltr" | "rtl";
};

const LATIN = '"Inter", ui-sans-serif, system-ui, sans-serif';
const DEVANAGARI = '"Noto Sans Devanagari", "Inter", ui-sans-serif, system-ui, sans-serif';

/** Add a new language by appending an entry here and a dictionary in i18n-translations.ts. */
export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", english: "English", font: LATIN, dir: "ltr" },
  { code: "hi", label: "हिन्दी", english: "Hindi", font: DEVANAGARI, dir: "ltr" },
  { code: "mr", label: "मराठी", english: "Marathi", font: DEVANAGARI, dir: "ltr" },
  { code: "bn", label: "বাংলা", english: "Bengali", font: '"Noto Sans Bengali", ' + LATIN, dir: "ltr" },
  { code: "gu", label: "ગુજરાતી", english: "Gujarati", font: '"Noto Sans Gujarati", ' + LATIN, dir: "ltr" },
  { code: "ta", label: "தமிழ்", english: "Tamil", font: '"Noto Sans Tamil", ' + LATIN, dir: "ltr" },
  { code: "te", label: "తెలుగు", english: "Telugu", font: '"Noto Sans Telugu", ' + LATIN, dir: "ltr" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada", font: '"Noto Sans Kannada", ' + LATIN, dir: "ltr" },
  { code: "ml", label: "മലയാളം", english: "Malayalam", font: '"Noto Sans Malayalam", ' + LATIN, dir: "ltr" },
  { code: "pa", label: "ਪੰਜਾਬੀ", english: "Punjabi", font: '"Noto Sans Gurmukhi", ' + LATIN, dir: "ltr" },
  { code: "ur", label: "اردو", english: "Urdu", font: '"Noto Naskh Arabic", ' + LATIN, dir: "rtl" },
  { code: "ja", label: "日本語", english: "Japanese", font: '"Noto Sans JP", ' + LATIN, dir: "ltr" },
  { code: "es", label: "Español", english: "Spanish", font: LATIN, dir: "ltr" },
  { code: "fr", label: "Français", english: "French", font: LATIN, dir: "ltr" },
  { code: "de", label: "Deutsch", english: "German", font: LATIN, dir: "ltr" },
  { code: "zh", label: "中文", english: "Chinese", font: '"Noto Sans SC", ' + LATIN, dir: "ltr" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function getLanguageMeta(code: string | null | undefined): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
