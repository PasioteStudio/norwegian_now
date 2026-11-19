import axios from "axios";

export type WordEntry = {
  word: string;
  definition: string;
  sourceUrl: string;
};

type SearchResult = {
  pageid: number;
  title: string;
};

type SearchResponse = {
  query?: {
    search?: SearchResult[];
  };
};

type ExtractPage = {
  title: string;
  extract?: string;
};

type ExtractResponse = {
  query?: {
    pages?: Record<string, ExtractPage>;
  };
};

const WIKTIONARY_API = "https://no.wiktionary.org/w/api.php";

function getDefinition(title: string, extract: string): string | null {
  const lines = extract.split("\n");
  const sectionStart = lines.findIndex((line) =>
    /^==\s*Norsk\s*==\s*$/i.test(line.trim()),
  );

  if (sectionStart < 0) {
    return null;
  }

  let sectionEnd = lines.length;
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (/^==\s*[^=].*?==\s*$/.test(lines[index].trim())) {
      sectionEnd = index;
      break;
    }
  }

  const sectionLines = lines.slice(sectionStart + 1, sectionEnd);
  const normalizedTitle = title.toLocaleLowerCase("nb-NO");
  const headwordIndex = sectionLines.findIndex((line) => {
    const normalizedLine = line.toLocaleLowerCase("nb-NO");
    return (
      normalizedLine.includes(normalizedTitle) &&
      normalizedLine.includes("bokmål")
    );
  });

  if (headwordIndex < 0) {
    return null;
  }

  let definition: string | undefined;
  for (const line of sectionLines.slice(headwordIndex + 1)) {
    const cleanedLine = line.trim().replace(/^[#*:]+\s*/, "");
    if (/^={4,}/.test(cleanedLine)) {
      break;
    }

    if (cleanedLine.length >= 12) {
      definition = cleanedLine;
      break;
    }
  }

  if (!definition) {
    return null;
  }

  const cleaned = definition
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 12 ? cleaned : null;
}

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("title" in value) || typeof value.title !== "string") {
    return false;
  }

  return (
    "pageid" in value &&
    typeof value.pageid === "number" &&
    Number.isInteger(value.pageid) &&
    /^[\p{L}][\p{L}-]*$/u.test(value.title)
  );
}

export async function getRandomBokmalWord(
  previouslyUsedWords: string[],
): Promise<WordEntry> {
  const excludedWords = new Set(previouslyUsedWords);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const searchUrl = new URL(WIKTIONARY_API);
    searchUrl.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: 'insource:"== Norsk ==" insource:"bokmål"',
      srnamespace: "0",
      srlimit: "50",
      sroffset: String(Math.floor(Math.random() * 501)),
      format: "json",
      origin: "*",
    }).toString();

    const searchResponse = await axios.get<SearchResponse>(searchUrl.toString(), {
      adapter: "fetch",
      fetchOptions: { cache: "no-store" },
      validateStatus: () => true,
    });
    if (searchResponse.status < 200 || searchResponse.status >= 300) {
      throw new Error(
        `Søk i Wiktionary mislyktes (HTTP ${searchResponse.status}).`,
      );
    }

    const searchData = searchResponse.data;
    const candidates = (searchData.query?.search ?? []).filter(isSearchResult);
    if (candidates.length === 0) {
      continue;
    }

    const extractUrl = new URL(WIKTIONARY_API);
    extractUrl.search = new URLSearchParams({
      action: "query",
      prop: "extracts",
      explaintext: "1",
      pageids: candidates.map((candidate) => candidate.pageid).join("|"),
      format: "json",
      origin: "*",
    }).toString();

    const extractResponse = await axios.get<ExtractResponse>(
      extractUrl.toString(),
      {
        adapter: "fetch",
        fetchOptions: { cache: "no-store" },
        validateStatus: () => true,
      },
    );
    if (extractResponse.status < 200 || extractResponse.status >= 300) {
      throw new Error(
        `Kunne ikke hente ord fra Wiktionary (HTTP ${extractResponse.status}).`,
      );
    }

    const extractData = extractResponse.data;
    const entries = Object.values(extractData.query?.pages ?? {}).flatMap(
      (page) => {
        if (
          typeof page.title !== "string" ||
          typeof page.extract !== "string" ||
          excludedWords.has(page.title.toLocaleLowerCase("nb-NO"))
        ) {
          return [];
        }

        const definition = getDefinition(page.title, page.extract);
        if (!definition) {
          return [];
        }

        return [
          {
            word: page.title,
            definition,
            sourceUrl: `https://no.wiktionary.org/wiki/${encodeURIComponent(page.title)}`,
          },
        ];
      },
    );

    if (entries.length > 0) {
      return entries[Math.floor(Math.random() * entries.length)];
    }
  }

  throw new Error("Wiktionary fant ikke et nytt brukbart bokmålsord.");
}
