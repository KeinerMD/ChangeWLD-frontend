// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";
import {
  MiniKit,
  VerificationLevel,
} from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Comprobar que estamos dentro de World App
      if (!MiniKit.isInstalled()) {
        await Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de World App (mini app).",
          "error"
        );
        return;
      }

      // 2) Payload de verificación (según docs)
      const verifyPayload = {
        action: "verify-changewld-device",   // IDENTIFIER de tu acción
        signal: "changewld-device",          // opcional, string cualquiera
        verification_level: VerificationLevel.Device, // Device u Orb
      };

      console.log("⚙️ Enviando verify con payload:", verifyPayload);

      // 3) Ejecutar comando verify en World App
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      console.log("✅ finalPayload devuelto por MiniKit:", finalPayload);

      if (!finalPayload || finalPayload.status === "error") {
        console.log("❌ Error en MiniKit.verify:", finalPayload);
        await Swal.fire(
          "Verificación rechazada",
          "World App no pudo completar la verificación.",
          "error"
        );
        return;
      }

      // 4) Mandar el proof al backend para que lo valide
      const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,               // ISuccessResult
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      });

      const text = await resp.text();
      console.log("📨 Respuesta cruda backend /verify-world-id:", resp.status, text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Aquí es donde antes salía el "Unexpected token '<'"
        throw new Error(`Respuesta no JSON del backend: ${text.slice(0, 120)}...`);
      }

      if (resp.ok && data.ok && data.verified) {
        await Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        // devolvemos el nullifier al padre (App.jsx)
        onVerified?.(data.nullifier_hash || finalPayload.nullifier_hash);
      } else {
        console.error("❌ Verificación rechazada en backend:", data);
        await Swal.fire(
          "Verificación rechazada",
          data?.error
            ? `Código: ${data.error}`
            : "El servidor no aceptó la prueba enviada.",
          "error"
        );
      }
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
