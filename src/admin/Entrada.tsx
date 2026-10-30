// The sign-in: the admin key, typed once; the server answers whether it is right.
import { useState, type FormEvent } from "react";
import { entrar } from "./api";

export function Entrada({ alEntrar }: { alEntrar: () => void }) {
  const [clave, setClave] = useState("");
  const [mal, setMal] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (await entrar(clave)) alEntrar();
    else setMal(true);
  };

  return (
    <form className="entrada" onSubmit={(e) => void enviar(e)}>
      <h1>Matices · Tablero</h1>
      <input className="campo" type="password" autoFocus placeholder="Clave de admin" value={clave} onChange={(e) => setClave(e.target.value)} />
      {mal && <p className="nota">Esa clave no es.</p>}
      <button className="boton principal">Entrar</button>
    </form>
  );
}
