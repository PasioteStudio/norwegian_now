import axios from "axios";

const TTS_ENDPOINT =
  process.env.NEXT_PUBLIC_TTS_ENDPOINT || "http://192.168.1.20:8000/tts";

let activeRequest: AbortController | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;

export function stopSpeaking() {
  activeRequest?.abort();
  activeRequest = null;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
  }
}

export async function speakNorwegian(text: string): Promise<void> {
  stopSpeaking();
  const request = new AbortController();
  activeRequest = request;

  try {
    const response = await axios.post<Blob>(
      TTS_ENDPOINT,
      { text, language: "no" },
      {
        withCredentials: true,
        responseType: "blob",
        signal: request.signal,
        validateStatus: () => true,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`TTS request failed (${response.status}).`);
    }

    const audioBlob = response.data;
    if (audioBlob.size === 0) {
      throw new Error("The TTS service returned an empty audio file.");
    }

    if (request.signal.aborted) {
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeAudioUrl = audioUrl;
    activeAudio = audio;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        request.signal.removeEventListener("abort", onAbort);
        audio.onended = null;
        audio.onerror = null;

        if (activeAudio === audio) {
          activeAudio = null;
        }
        if (activeAudioUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          activeAudioUrl = null;
        }
        if (activeRequest === request) {
          activeRequest = null;
        }

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      const onAbort = () => {
        audio.pause();
        finish();
      };

      request.signal.addEventListener("abort", onAbort);
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error("Could not play the TTS audio."));
      audio.play().catch(() => finish(new Error("Could not play the TTS audio.")));
    });
  } catch (error) {
    if (request.signal.aborted) {
      return;
    }
    if (activeRequest === request) {
      activeRequest = null;
    }
    throw error;
  }
}
