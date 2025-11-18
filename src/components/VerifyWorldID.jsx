// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Comprobar que estamos dentro de World App
      if (!MiniKit.isInstalled()) {
        Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de la World App (mini app).",
          "error"
        );
        return;
      }

      // 2) Payload de verificación (usando tu acción de incognito)
      const verifyPayload = {
        action: "verify-changewld-v2",          // IDENTIFIER de tu acción
        signal: "changewld-device",            // opcional, texto que quieras
        verification_level: VerificationLevel.Device, // Device (no Orb)
      };

      // 3) Pedir a World App que verifique
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (!finalPayload || finalPayload.status === "error") {
        console.log("Error payload MiniKit:", finalPayload);
        Swal.fire(
          "Verificación cancelada",
          "No se pudo completar la verificación en World App.",
          "error"
        );
        return;
      }

      // 4) Enviar la prueba al backend para validarla
      const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,            // MiniAppVerifyActionSuccessPayload
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      });

      const data = await resp.json();
      console.log("Respuesta backend verify-world-id:", data);

      if (resp.ok && (data.ok || data.verifyRes?.success)) {
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        // Devolvemos el payload completo al padre (App.jsx)
        onVerified?.(finalPayload);
      } else {
        Swal.fire(
          "❌ Verificación rechazada",
          data.error
            ? `Código: ${data.error}\n\nDetalle: ${JSON.stringify(
                data.detail || "",
                null,
                2
              )}`
            : "La prueba de verificación no fue válida.",
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Error durante la verificación:", error);
      Swal.fire(
        "Error",
        error?.message || "Hubo un problema durante la verificación.",
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
