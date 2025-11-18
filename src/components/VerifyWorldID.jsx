// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

// Import directo del SDK (el Provider ya lo inicializa)
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) ¿Estoy dentro de World App?
      if (!MiniKit.isInstalled()) {
        const r = await Swal.fire({
          icon: "warning",
          title: "Abre ChangeWLD desde World App",
          html:
            "La verificación real solo funciona dentro de la World App como mini app.<br/><br/>" +
            "Si estás probando en el navegador, puedes continuar en <b>modo pruebas</b> para simular la verificación.",
          showCancelButton: true,
          confirmButtonText: "Continuar en modo pruebas",
          cancelButtonText: "Cancelar",
        });

        if (r.isConfirmed) {
          onVerified?.("device-test-nullifier");
          Swal.fire(
            "Modo pruebas activo",
            "Se marcó tu identidad como verificada solo para pruebas.",
            "info"
          );
        }
        return;
      }

      // 2) Construir el payload de verify (según docs)
      const verifyPayload = {
        action: "verify-changewld-v2",      // IDENTIFIER de tu Incognito Action
        signal: "changewld-device",         // opcional
        verification_level: VerificationLevel.Device, // Device por ahora
      };

      console.log("🚀 Enviando verify con payload:", verifyPayload);

      // commandsAsync.verify -> devuelve { finalPayload }
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      console.log("✅ finalPayload:", finalPayload);

      if (!finalPayload || finalPayload.status === "error") {
        Swal.fire(
          "Error",
          "World App canceló o rechazó la verificación.",
          "error"
        );
        return;
      }

      // 3) Enviar la prueba a tu backend para validarla
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
      console.log("🔁 /api/verify-world-id:", resp.status, data);

      if (resp.ok && data.ok && data.verified) {
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        onVerified?.(finalPayload.nullifier_hash || "device-nullifier");
      } else {
        Swal.fire(
          "❌ Verificación rechazada",
          data?.error || "La prueba no fue válida.",
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Error durante la verificación:", error);
      Swal.fire(
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
