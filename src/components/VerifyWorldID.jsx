// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";
import { MiniKit } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Comprobamos si estamos dentro de World App (mini app)
      if (!MiniKit.isInstalled()) {
        // Aquí sí tiene sentido este mensaje
        Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de la World App (mini app).",
          "error"
        );
        return;
      }

      // 2) Definimos el payload del comando verify
      const verifyPayload = {
        // IDENTIFIER de tu acción de incógnito
        action: "verify-changewld-v2",
        signal: "changewld", // opcional
        // Puedes usar "device" o "orb" según lo que configuraste en el portal
        verification_level: "device",
      };

      // 3) Lanzamos el comando verify en World App
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      console.log("🔹 finalPayload desde MiniKit:", finalPayload);

      if (!finalPayload || finalPayload.status === "error") {
        console.log("❌ Error payload:", finalPayload);
        Swal.fire(
          "Error",
          "World App no pudo completar la verificación.",
          "error"
        );
        return;
      }

      // 4) Verificamos el proof en tu backend (OBLIGATORIO)
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
      console.log("🔹 Respuesta backend /api/verify-world-id:", resp.status, data);

      if (resp.ok && data.ok && data.verified) {
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );

        // Le pasamos al App.jsx el payload completo,
        // para que saque el nullifier_hash y marque isVerified=true
        onVerified?.(finalPayload);
        return;
      }

      // Si llegó aquí, el backend rechazó la prueba
      Swal.fire(
        "❌ Verificación rechazada",
        data?.error
          ? `Código: ${data.error}\n\nDetalle: ${JSON.stringify(
              data.detail || "",
              null,
              2
            )}`
          : "La prueba no fue válida.",
        "error"
      );
    } catch (error) {
      console.error("❌ Error durante la verificación:", error);

      // 5) Fallback: modo pruebas (solo DEV)
      const result = await Swal.fire({
        icon: "warning",
        title: "Error en la verificación",
        html:
          "Hubo un problema al verificar con World App.<br/><br/>" +
          "<b>Modo pruebas:</b> si continúas, la app marcará tu identidad como 'verificada' <u>sin validación real</u>, " +
          "solo para que puedas probar el flujo de órdenes.",
        showCancelButton: true,
        confirmButtonText: "Continuar en modo pruebas",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        onVerified?.("device-test-nullifier-changewld");
        Swal.fire(
          "Modo pruebas activo",
          "Se ha marcado tu identidad como verificada SOLO para pruebas. No uses esto en producción.",
          "info"
        );
      } else {
        Swal.fire(
          "Verificación cancelada",
          "Intenta nuevamente más tarde.",
          "info"
        );
      }
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
