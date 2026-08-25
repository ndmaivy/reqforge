import { createContext, useContext, useEffect, useState } from "react";
import { t, type Lang, type Translations } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "VI",
  setLang: () => {},
  tr: t.VI,
});

const LANGUAGE_STORAGE_KEY = "reqforge.language";

function getInitialLanguage(): Lang {
  if (typeof window === "undefined") return "VI";
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "EN" || storedLanguage === "VI" ? storedLanguage : "VI";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang === "VI" ? "vi" : "en";
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: t[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
