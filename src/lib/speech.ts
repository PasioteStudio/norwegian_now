const NORWEGIAN_LANGUAGE = /^(nb|no)(-|$)/i;

function findNorwegianVoice(voices: SpeechSynthesisVoice[]) {
  const norwegianVoices = voices.filter((voice) =>
    NORWEGIAN_LANGUAGE.test(voice.lang),
  );

  return (
    norwegianVoices.find((voice) => /^nb-NO$/i.test(voice.lang)) ??
    norwegianVoices.find((voice) => /^nb(-|$)/i.test(voice.lang)) ??
    norwegianVoices[0]
  );
}

function speakWithVoice(
  synthesis: SpeechSynthesis,
  text: string,
  language: string,
  voice?: SpeechSynthesisVoice,
): Promise<void> {
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  if (voice) {
    utterance.voice = voice;
  }

  return new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        resolve();
      } else {
        reject(new Error("Kunne ikke spille av norsk tale. Prøv igjen."));
      }
    };
    synthesis.speak(utterance);
  });
}

function getSpeechSynthesis() {
  if (!("speechSynthesis" in window)) {
    throw new Error("Taleavspilling er ikke tilgjengelig i denne nettleseren.");
  }
  return window.speechSynthesis;
}

export function speakNorwegian(text: string): Promise<void> {
  const synthesis = getSpeechSynthesis();
  const voice = findNorwegianVoice(synthesis.getVoices());
  if (!voice) {
    return speakWithDefaultVoice(text);
  }

  return speakWithVoice(synthesis, text, "nb-NO", voice);
}

export function speakWithDefaultVoice(text: string): Promise<void> {
  const synthesis = getSpeechSynthesis();
  const englishVoice = synthesis
    .getVoices()
    .find((voice) => /^en(-|$)/i.test(voice.lang));

  return speakWithVoice(
    synthesis,
    text,
    englishVoice?.lang ?? "en-US",
    englishVoice,
  );
}
