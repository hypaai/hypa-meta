type DictionarySpeechItem = {
  type?: string;
  text: string;
};

type DictionarySpeechSection = {
  text: string;
};

type DictionarySpeechData = {
  word: string;
  definitions?: DictionarySpeechItem[];
  usage?: DictionarySpeechItem[];
  syms?: string[];
  antm?: string[];
  cultural_context?: DictionarySpeechSection[];
  fun_facts?: DictionarySpeechSection[];
};

const cleanSpeechText = (value: string) => value.replace(/\s+/g, " ").trim();

export const buildWordOnlySpeech = (word: string) => cleanSpeechText(word);

export const buildSectionSpeech = (title: string, body: string) =>
  cleanSpeechText(`${title}. ${body}`);

export const buildTypedItemSpeech = (item: DictionarySpeechItem) =>
  item.type
    ? cleanSpeechText(`${item.type}. ${item.text}`)
    : cleanSpeechText(item.text);

export const joinTypedItemSpeech = (
  items: DictionarySpeechItem[] | undefined,
  separator = ". ",
) => items?.map(buildTypedItemSpeech).join(separator) ?? "";

export const buildDictionaryResultSpeech = (data: DictionarySpeechData) => {
  const parts = [buildSectionSpeech("Word", buildWordOnlySpeech(data.word))];

  if (data.definitions?.length) {
    parts.push(
      buildSectionSpeech("Definition", joinTypedItemSpeech(data.definitions)),
    );
  }

  if (data.usage?.length) {
    parts.push(
      buildSectionSpeech("Usage Examples", joinTypedItemSpeech(data.usage)),
    );
  }

  if (data.syms?.length) {
    parts.push(buildSectionSpeech("Synonyms", data.syms.join(", ")));
  }

  if (data.antm?.length) {
    parts.push(buildSectionSpeech("Antonyms", data.antm.join(", ")));
  }

  if (data.cultural_context?.length) {
    parts.push(
      buildSectionSpeech(
        "Cultural Context",
        data.cultural_context.map((item) => item.text).join(". "),
      ),
    );
  }

  if (data.fun_facts?.length) {
    parts.push(
      buildSectionSpeech(
        "Fun Fact",
        data.fun_facts.map((item) => item.text).join(". "),
      ),
    );
  }

  return parts.join(". ");
};
