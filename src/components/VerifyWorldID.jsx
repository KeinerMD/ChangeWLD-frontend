import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      if (!window.WorldApp) {
        Swal.fire(
          "Verificación no disponible",
          "Esta verificación solo funciona dentro de World App.",
          "error"
        );
        return;
      }

      // 1️⃣ Pedir verificación a World App (nivel: device, según tu acción)
      const vr = await window.WorldApp.requestVerification({
        actionId: "verify-changewld-v2",
      });

      console.log("verification_response desde WorldApp:", vr);

      // 2️⃣ Enviar datos mínimos al backend
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

      if (data.ok && data.verified) {
        Swal.fire("✔ Verificado", "Tu identidad fue confirmada correctamente.", "success");
        if (onVerified) onVerified();
      } else {
        Swal.fire(
          "❌ Verificación fallida",
          data.error || "Respuesta inválida del verificador",
          "error"
        );
      }
    } catch (error) {
      console.error("Error en verificación:", error);
      Swal.fire("Error", "Hubo un problema durante la verificación.", "error");
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
