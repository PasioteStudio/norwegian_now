"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getRandomBokmalWord, type WordEntry } from "../lib/wiktionary";
import { speakNorwegian, stopSpeaking } from "../lib/speech";
import GameShell from "./game-shell";

type GameStatus = "ready" | "loading" | "playing" | "answered";

export default function WordSpellingGame() {
  const [round, setRound] = useState<WordEntry | null>(null);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [streak, setStreak] = useState(0);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  async function loadRound() {
    setStatus("loading");
    setError("");
    setAudioError("");
    setAnswer("");
    setShowHint(false);
    setRound(null);

    try {
      const entry = await getRandomBokmalWord(usedWords);
      setRound(entry);
      setUsedWords((current) => [
        ...current,
        entry.word.toLocaleLowerCase("nb-NO"),
      ]);
      setStatus("playing");
    } catch (caughtError) {
      setStatus("ready");
      setError(
        caughtError instanceof TypeError
          ? "Kunne ikke koble til Wiktionary. Sjekk internettforbindelsen og prøv igjen."
          : caughtError instanceof Error
            ? caughtError.message
            : "Kunne ikke hente et ord. Prøv igjen.",
      );
    }
  }

  async function playWord() {
    if (!round) {
      return;
    }

    setAudioError("");
    try {
      await speakNorwegian(round.word);
    } catch (caughtError) {
      setAudioError(
        caughtError instanceof Error
          ? caughtError.message
          : "Kunne ikke spille av norsk tale. Prøv igjen.",
      );
    }
  }
  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!round || status !== "playing" || !answer.trim()) {
      return;
    }

    const correct =
      answer.trim().normalize("NFC").toLocaleLowerCase("nb-NO") ===
      round.word.normalize("NFC").toLocaleLowerCase("nb-NO");

    setIsCorrect(correct);
    setStatus("answered");
    setShowHint(false);
    setStreak((current) => (correct ? current + 1 : 0));
  }

  return (
    <GameShell activeGame="words" streak={streak}>
        {status === "ready" && (
          <div className="game-body">
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button className="button start-button" onClick={() => loadRound()}>
              {error ? "Prøv igjen" : "Spill"}
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="game-body" role="status">
            <p className="prompt">Henter et nytt ord …</p>
          </div>
        )}

        {(status === "playing" || status === "answered") && round && (
          <div className="game-body">
            <p className="prompt">
              {status === "playing"
                ? "Lytt og stav ordet"
                : isCorrect
                  ? "Korrekt!"
                  : "Ikke helt!"}
            </p>

            {status === "playing" ? (
              <>
                <form className="answer-form" onSubmit={checkAnswer}>
                  <button
                    className="listen-button"
                    type="button"
                    onClick={playWord}
                    aria-label="Spill av ordet"
                    title="Lytt"
                  >
                    🔊
                  </button>
                  <input
                    aria-label="Skriv ordet du hører"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoFocus
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Skriv ordet du hører"
                  />
                  <button className="button submit-button" type="submit" disabled={!answer.trim()}>
                    Send inn
                  </button>
                </form>

                <div className="actions-row">
                  <button className="text-button" onClick={playWord}>
                    Hør igjen
                  </button>
                  <button
                    className="text-button hint-button"
                    onClick={() => setShowHint((visible) => !visible)}
                    aria-expanded={showHint}
                  >
                    {showHint ? "Skjul hint" : "Vis hint"}
                  </button>
                </div>
                {showHint && <p className="hint-copy">{round.definition}</p>}
                {audioError && (
                  <>
                    <p className="error-message" role="alert">
                      {audioError}
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="answer-result" aria-live="polite">
                  <strong>{round.word}</strong>
                  <p>{round.definition}</p>
                </div>
                <button className="button next-button" onClick={() => loadRound()}>
                  Neste ord
                </button>
                <a
                  className="source-link"
                  href={round.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Kilde: Wiktionary på norsk
                </a>
              </>
            )}
          </div>
        )}
    </GameShell>
  );
}
