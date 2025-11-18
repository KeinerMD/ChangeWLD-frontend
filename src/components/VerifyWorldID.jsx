// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";
import { MiniKit as ImportedMiniKit, VerificationLevel } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Detectar MiniKit desde import o desde window
      const mk =
        (typeof ImportedMiniKit !== "undefined" && ImportedMiniKit) ||
        (typeof window !== "undefined" && window.MiniKit) ||
        null;

      console.log("🔍 ImportedMiniKit:", ImportedMiniKit);
      console.log("🔍 window.MiniKit:", typeof window !== "undefined" ? window.MiniKit : "no-window");
      console.log("🔍 mk usado:", mk);

      if (!mk) {
        // Si NO hay MiniKit en absoluto, mostramos mensaje claro
        Swal.fire(
          "MiniKit no detectado",
          "No se encontró el SDK de World App (MiniKit). Asegúrate de abrir ChangeWLD desde la World App como mini app.",
          "error"
        );
        return;
      }

      // 2) Payload según docs de /mini-apps/commands/verify
      const verifyPayload = {
        action: "verify-changewld-v2", // IDENTIFIER de tu acción incognito
        signal: "changewld-device",    // opcional
        verification_level: VerificationLevel.Device, // Device por ahora
      };

      console.log("🚀 Enviando comando verify con payload:", verifyPayload);

      // 3) Lanzar comando asíncrono a World App
      const { finalPayload } = await mk.commandsAsync.verify(verifyPayload);

      console.log("✅ finalPayload recibido de World App:", finalPayload);

      if (!finalPayload || finalPayload.status === "error") {
        Swal.fire(
          "Error",
          "World App canceló o falló la verificación.",
          "error"
        );
        return;
      }

      // 4) Enviar al backend para verificar la prueba
      const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: finalPayload.proof,
          merkle_root: finalPayload.merkle_root,
          nullifier_hash: finalPayload.nullifier_hash,
          verification_level: finalPayload.verification_level,
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      });

      const data = await resp.json();
      console.log("🔁 Respuesta backend /api/verify-world-id:", resp.status, data);

      if (resp.ok && data.ok && data.verified) {
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        onVerified?.(finalPayload.nullifier_hash || "device-nullifier-test");
      } else {
        Swal.fire(
          "❌ Verificación rechazada",
          data?.error || "La prueba no fue válida.",
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Error durante la verificación:", error);
      const msg = String(error?.message || error || "");

      // Errores típicos cuando el provider no está disponible
      if (
        msg.toLowerCase().includes("provider not found") ||
        msg.toLowerCase().includes("minikit is not installed") ||
        msg.toLowerCase().includes("no provider")
      ) {
        Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de la World App (mini app).",
          "error"
        );
        return;
      }

      Swal.fire(
        "Error",
        `Hubo un problema durante la verificación.\n\nDetalle: ${msg}`,
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
