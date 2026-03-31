import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "vi"] as const;
const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value || DEFAULT_LOCALE;
  const locale = SUPPORTED_LOCALES.includes(cookieLocale as typeof SUPPORTED_LOCALES[number])
    ? cookieLocale
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
