// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 👀 Solo para debug, no bloquea nada
      try {
        console.log(
          "MiniKit presente:",
          !!MiniKit,
          "MiniKit.isInstalled():",
          typeof MiniKit?.isInstalled === "function"
            ? MiniKit.isInstalled()
            : "no disponible"
        );
        // También podemos ver si World App inyectó algo viejo
        console.log("window.WorldApp:", window.WorldApp || "no definido");
      } catch (_) {}

      // 📦 Payload según docs de /mini-apps/commands/verify
      const verifyPayload = {
        action: "verify-changewld-v2", // IDENTIFIER de tu acción de incognito
        signal: "changewld-device",    // opcional, pero útil para tracking
        verification_level: VerificationLevel.Device, // Device por ahora
      };

      // 🚀 Lanzar comando a World App
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      console.log("✅ finalPayload recibido de World App:", finalPayload);

      // Usuario canceló o algo salió mal del lado de World App
      if (!finalPayload || finalPayload.status === "error") {
        Swal.fire(
          "Error",
          "World App canceló o falló la verificación.",
          "error"
        );
        return;
      }

      // finalPayload tiene la forma:
      // { status:'success', proof, merkle_root, nullifier_hash, verification_level, version }

      // 🔐 Verificar la prueba en tu backend
      const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      console.log("Respuesta backend /api/verify-world-id:", resp.status, data);

      if (resp.ok && data.ok && data.verified) {
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        // Guardamos el nullifier en el front
        onVerified?.(finalPayload.nullifier_hash);
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

      // 🔎 Errores típicos cuando NO estamos realmente dentro de World App
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

      // Cualquier otro error genérico
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
