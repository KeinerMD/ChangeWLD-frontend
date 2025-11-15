// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      if (typeof window === "undefined") {
        await Swal.fire(
          "Verificación no disponible",
          "Esta verificación solo funciona dentro de un navegador.",
          "error"
        );
        return;
      }

      const wa = window.WorldApp;

      if (!wa) {
        // Navegador normal (no World App)
        await Swal.fire(
          "World App no detectada",
          "Abre esta mini app desde la World App para usar la verificación por dispositivo.",
          "error"
        );
        return;
      }

      console.log("WorldApp object:", wa);
      console.log("WorldApp keys:", Object.keys(wa || {}));

      // 👉 CASO 1: el método SÍ existe (cuando World App actualice el SDK)
      if (typeof wa.requestVerification === "function") {
        const vr = await wa.requestVerification({
          // Según la doc actual, suele ser "action" o similar;
          // tu IDENTIFIER en la acción es: verify-changewld-v2
          action: "verify-changewld-v2",
        });

        console.log("✅ verification_response desde WorldApp:", vr);

        const resp = await fetch(`${API_BASE}/api/verify-world-id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: vr.proof,
            merkle_root: vr.merkle_root,
            nullifier_hash: vr.nullifier_hash,
            verification_level: vr.verification_level,
            action: vr.action,
            signal: vr.signal,
            credential_type: vr.credential_type,
          }),
        });

        const data = await resp.json();
        console.log("Respuesta backend verify-world-id:", data);

        if (data.ok && data.verified) {
          await Swal.fire(
            "✔ Verificado",
            "Tu identidad fue confirmada correctamente.",
            "success"
          );
          onVerified?.(vr.nullifier_hash || null);
        } else {
          await Swal.fire(
            "❌ Verificación rechazada",
            data.error
              ? `Código: ${data.error}\n\nDetalle: ${JSON.stringify(
                  data.detail || "",
                  null,
                  2
                )}`
              : "Respuesta inválida del verificador.",
            "error"
          );
        }
        return;
      }

      // 👉 CASO 2: el método NO existe → modo PRUEBAS AUTOMÁTICO
      const result = await Swal.fire({
        icon: "info",
        title: "Modo pruebas",
        html:
          "World App está presente, pero no expone el método <b>requestVerification</b> en <code>window.WorldApp</code>.<br/><br/>" +
          "Mientras actualizan el SDK, usaremos un <b>modo pruebas</b>: " +
          "la app marcará tu identidad como 'verificada' <u>sin validación real</u>, " +
          "solo para que puedas probar el flujo de órdenes y envíos de WLD.",
        confirmButtonText: "Entendido, continuar",
      });

      if (result.isConfirmed) {
        // ⚠️ SOLO DESARROLLO / TEST
        onVerified?.("test-device-nullifier");
        await Swal.fire(
          "Modo pruebas activo",
          "Se ha marcado tu identidad como verificada SOLO para pruebas. No uses esto en producción.",
          "info"
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
