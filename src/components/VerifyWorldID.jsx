import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    // 1) Pedimos la verificación a World App
    let vr;
    try {
      if (!window.WorldApp) {
        Swal.fire(
          "Verificación no disponible",
          "Esta verificación solo funciona dentro de World App.",
          "error"
        );
        return;
      }

      vr = await window.WorldApp.requestVerification({
        actionId: "verify-changewld-v2",
      });

      console.log("✅ verification_response desde WorldApp:", vr);
    } catch (error) {
      console.error("❌ Error en requestVerification:", error);
      Swal.fire(
        "Error",
        `World App no pudo generar la verificación.\n\nDetalle: ${error?.message || String(
          error
        )}`,
        "error"
      );
      return;
    }

    // 2) Enviamos la prueba al backend
    try {
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
        }),
      });

      const data = await resp.json();
      console.log("Respuesta del backend /api/verify-world-id:", data);

      if (data.ok && data.verified) {
        Swal.fire("✔ Verificado", "Tu identidad fue confirmada correctamente.", "success");
        if (onVerified) onVerified();
      } else {
        Swal.fire(
          "❌ Verificación rechazada",
          data.error
            ? `Código: ${data.error}\n\nDetalle: ${JSON.stringify(data.detail || "", null, 2)}`
            : "Respuesta inválida del verificador",
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Error llamando al backend:", error);
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
