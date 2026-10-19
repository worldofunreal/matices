// Every line is spoken. A recording public/assets/voz/<clave>.mp3 wins; otherwise the browser voice.
import arte from "virtual:arte";

const grabadas = new Set(arte.voces);
let audio: HTMLAudioElement | null = null;

const vozDelNavegador = () => speechSynthesis.getVoices().find((v) => v.lang === "es-MX") ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));

export function callar() {
  audio?.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

export function hablar(clave: string, texto: string) {
  callar();
  if (grabadas.has(clave)) {
    audio = new Audio(`assets/voz/${clave}.mp3`);
    void audio.play();
    return;
  }
  if (!("speechSynthesis" in window)) return;
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = "es-MX";
  frase.rate = 0.95;
  const voz = vozDelNavegador();
  if (voz) frase.voice = voz;
  speechSynthesis.speak(frase);
}
