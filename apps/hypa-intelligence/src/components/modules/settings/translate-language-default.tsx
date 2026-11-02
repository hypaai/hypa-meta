// @ts-nocheck
import {
  LangSelect,
  type LangOption,
} from "@/components/shared/lang-select";
import {
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type Language,
} from "@/constants/app.constants";
import { useSettings } from "@/context/settings-context";

import CardWidth from "../../ui/card-with";

const LanguageDefault = () => {
  const { settings, updateSettings } = useSettings();

  const handleSourceLanguageChange = (language: LangOption) => {
    // Find the full Language object from the constants
    const fullLanguage = SOURCE_LANGUAGES.find(
      (l) => l.code === language.code,
    ) as Language;

    updateSettings("defaultSourceLanguage", fullLanguage);
  };

  const handleTargetLanguageChange = (language: LangOption) => {
    // Find the full Language object from the constants
    const fullLanguage = TARGET_LANGUAGES.find(
      (l) => l.code === language.code,
    ) as Language;

    updateSettings("defaultTargetLanguage", fullLanguage);
  };

  return (
    <CardWidth>
      <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
        Language Defaults
      </h3>
      <div className="mt-8 space-y-6">
        <div>
          <h4 className="mb-3 text-card-foreground font-medium text-sm lg:text-base">
            Default Source Language
          </h4>
          <LangSelect
            className="lg:w-[230px]"
            options={SOURCE_LANGUAGES}
            value={settings.defaultSourceLanguage as LangOption}
            onChange={handleSourceLanguageChange}
          />
        </div>
        <div>
          <h4 className="mb-3 text-card-foreground font-medium text-sm lg:text-base">
            Default Target Language
          </h4>
          <LangSelect
            className="lg:w-[230px]"
            label="Default Target Language"
            options={TARGET_LANGUAGES}
            value={settings.defaultTargetLanguage as LangOption}
            onChange={handleTargetLanguageChange}
          />
        </div>
      </div>
    </CardWidth>
  );
};

export default LanguageDefault;
