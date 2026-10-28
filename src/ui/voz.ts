// Every line is spoken. A recording public/assets/voz/<clave>.mp3 wins; otherwise the browser voice.
import arte from "virtual:arte";
import { estado } from "../datos/guardado";

const grabadas = new Set(arte.voces);
let audio: HTMLAudioElement | null = null;
const volumen = () => estado().opciones.voz / 5; // the child's level in Opciones

const vozDelNavegador = () => speechSynthesis.getVoices().find((v) => v.lang === "es-MX") ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));

export function callar() {
  audio?.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// Resolves when the line has been said (or right away if there is no voice), so the game can
// measure decision time from the end of the question.
export function hablar(clave: string, texto: string): Promise<void> {
  callar();
  return new Promise((listo) => {
    // Some browsers never fire the end event; never wait longer than the line could take.
    const tope = setTimeout(listo, 1500 + texto.length * 90);
    const fin = () => {
      clearTimeout(tope);
      listo();
    };
    if (grabadas.has(clave)) {
      audio = new Audio(`assets/voz/${clave}.mp3`);
      audio.volume = volumen();
      audio.onended = audio.onerror = fin;
      void audio.play().catch(fin);
      return;
    }
    if (!("speechSynthesis" in window)) return fin();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = "es-MX";
    frase.rate = 0.95;
    frase.volume = volumen();
    const voz = vozDelNavegador();
    if (voz) frase.voice = voz;
    frase.onend = frase.onerror = fin;
    speechSynthesis.speak(frase);
  });
}

// A line someone says in the world: a recording plays on its own; the browser voice only from the speaker.
export function sonarSiGrabada(clave: string, texto: string) {
  if (grabadas.has(clave)) void hablar(clave, texto);
}
