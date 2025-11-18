// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

// 👇 Importamos MiniKit y tipos
import {
  MiniKit,
  VerificationLevel,
  ISuccessResult,
} from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Comprobar que estamos dentro de World App (mini app)
      if (!MiniKit.isInstalled()) {
        await Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de la World App (Mini apps → ChangeWLD). Si estás en el navegador normal, entra desde la app.",
          "warning"
        );
        return;
      }

      // 2) Construir el payload de verify
      const verifyPayload = {
        action: "verify-changewld-v2", // 👈 usa EXACTAMENTE el "Identifier" de tu acción de incógnito
        signal: "changewld-device",    // opcional, puedes dejar este string
        verification_level: VerificationLevel.Device, // o .Orb si decides cambiar
      };

      console.log("👉 Enviando comando verify con payload:", verifyPayload);

      // 3) Pedir a World App que genere la prueba
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      console.log("🔹 finalPayload desde World App:", finalPayload);

      if (!finalPayload || finalPayload.status === "error") {
        console.error("❌ Error en verify (finalPayload):", finalPayload);
        await Swal.fire(
          "Verificación rechazada",
          "World App no pudo completar la verificación. Intenta de nuevo.",
          "error"
        );
        return;
      }

      // 4) Enviar la prueba a tu backend para que verifique en la nube
      const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,               // ISuccessResult
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      });

      let data;
      try {
        data = await resp.json();
      } catch (e) {
        console.error("❌ No se pudo parsear JSON del backend:", e);
        await Swal.fire(
          "Error en el servidor",
          "El backend devolvió una respuesta no válida.",
          "error"
        );
        return;
      }

      console.log("🔹 Respuesta backend /api/verify-world-id:", data);

      if (!resp.ok || !data?.success) {
        await Swal.fire(
          "Verificación rechazada",
          "El servidor no aceptó la prueba de World ID. Es posible que ya hayas verificado esta acción o que el proof sea inválido.",
          "error"
        );
        return;
      }

      // 5) Todo OK → marcamos como verificado en el front
      const nullifier =
        finalPayload.nullifier_hash || data.verifyRes?.nullifier_hash;

      onVerified?.(nullifier);

      await Swal.fire(
        "✔ Verificado",
        "Tu identidad fue confirmada correctamente.",
        "success"
      );
    } catch (error) {
      console.error("❌ Error durante la verificación:", error);
      await Swal.fire(
        "Error",
        `Hubo un problema durante la verificación.\n\nDetalle: ${
          error?.message || String(error)
        }`,
        "error"
      );
    }
  };

  return (
    <button
      onClick={handleVerify}
      className="w-full border border-indigo-200 py-2 mt-4 rounded-xl text-indigo-600 font-semibold"
    >
      Verificar identidad con World ID 🌐
    </button>
  );
}
