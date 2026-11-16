"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import GameShell from "./game-shell";
import { speakNorwegian, stopSpeaking } from "../lib/speech";

type GameStatus = "ready" | "playing" | "wrong" | "correct";

function createPriceCents() {
  return Math.floor(Math.random() * 9_899) + 101;
}

function priceToSpeech(cents: number) {
  const kroner = Math.floor(cents / 100);
  const ore = cents % 100;
  const kronerText = kroner === 1 ? "en krone" : `${kroner} kroner`;
  const oreText = ore === 1 ? "ett øre" : `${ore} øre`;
  return `${kronerText} og ${oreText}`;
}

function parsePrice(value: string): number | null {
  const match = /^(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(
    value.trim().replace(/\s/g, ""),
  );
  if (!match) {
    return null;
  }

  const kroner = Number(match[1]);
  const ore = Number((match[2] ?? "").padEnd(2, "0"));
  return kroner * 100 + ore;
}

export default function ValueSpellingGame() {
  const [status, setStatus] = useState<GameStatus>("ready");
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [streak, setStreak] = useState(0);
  const [audioError, setAudioError] = useState("");

  const playPrice = useCallback(async (cents: number) => {
    setAudioError("");
    try {
      await speakNorwegian(priceToSpeech(cents));
    } catch (caughtError) {
      setAudioError(
        caughtError instanceof Error
          ? caughtError.message
          : "Kunne ikke spille av norsk tale. Prøv igjen.",
      );
    }
  }, []);

  const startRound = useCallback(() => {
    const nextPrice = createPriceCents();
    setPriceCents(nextPrice);
    setAnswer("");
    setAudioError("");
    setStatus("playing");
    playPrice(nextPrice);
  }, [playPrice]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (status !== "correct") {
      return;
    }

    const timeout = window.setTimeout(startRound, 1200);
    return () => window.clearTimeout(timeout);
  }, [startRound, status]);

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (priceCents === null || status === "ready" || status === "correct") {
      return;
    }

    const answerCents = parsePrice(answer);
    if (answerCents === null) {
      setStatus("wrong");
      setStreak(0);
      return;
    }

    if (answerCents === priceCents) {
      setStatus("correct");
      setStreak((current) => current + 1);
      return;
    }

    setStatus("wrong");
    setStreak(0);
  }

  return (
    <GameShell activeGame="values" streak={streak}>
      {status === "ready" ? (
        <div className="game-body">
          <p className="prompt">Lytt og skriv prisen</p>
          <button className="button start-button" onClick={startRound}>
            Spill
          </button>
        </div>
      ) : (
        <div className="game-body">
          <p className="prompt">Lytt og skriv prisen</p>
          <form className="price-form" onSubmit={checkAnswer}>
            <div className="price-input-row">
              <span className="currency-symbol" aria-hidden="true">
                kr
              </span>
              <input
                aria-label="Skriv prisen i kroner og øre"
                autoComplete="off"
                autoFocus
                inputMode="decimal"
                placeholder="f.eks. 12,45"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={status === "correct"}
              />
              <button
                className="button submit-button"
                type="submit"
                disabled={!answer.trim() || status === "correct"}
              >
                Sjekk
              </button>
            </div>
          </form>

          <div className="actions-row">
            <button
              className="text-button"
              type="button"
              onClick={() => priceCents !== null && playPrice(priceCents)}
            >
              Hør igjen
            </button>
          </div>
          {status === "wrong" && (
            <p className="error-message" role="status">
              Ikke helt. Prøv igjen!
            </p>
          )}
          {status === "correct" && (
            <p className="success-message" role="status">
              Riktig! Neste runde starter...
            </p>
          )}
          {audioError && (
            <>
              <p className="error-message" role="alert">
                {audioError}
              </p>
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
