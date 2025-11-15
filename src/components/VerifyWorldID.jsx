// src/components/VerifyWorldID.jsx
import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      // 1) Comprobamos que estamos dentro de World App
      if (typeof window === "undefined") {
        Swal.fire(
          "Verificación no disponible",
          "Esta verificación solo funciona dentro de un navegador.",
          "error"
        );
        return;
      }

      const wa = window.WorldApp;

      if (!wa) {
        Swal.fire(
          "No se detectó World App",
          "Parece que esta versión se está abriendo en un navegador normal y no dentro de World App. Abre la mini-app desde World App usando el código QR del portal de developers.",
          "error"
        );
        return;
      }

      // 👀 DEBUG: ver qué expone realmente World App
      console.log("WorldApp object:", wa);
      console.log("WorldApp keys:", Object.keys(wa || {}));

      if (typeof wa.requestVerification !== "function") {
        Swal.fire(
          "Función de verificación no disponible",
          "World App está presente, pero no expone el método `requestVerification` en window.WorldApp.\n\n" +
            "Eso suele significar que:\n" +
            "• Estás en una versión de World App que aún no soporta este API, o\n" +
            "• El SDK cambió el nombre del método.\n\n" +
            "Revisa la documentación de mini-apps para confirmar el nombre exacto de la función de verificación.",
          "error"
        );
        return;
      }

      // 2) Pedimos la verificación al bridge de World App
      const vr = await wa.requestVerification({
        actionId: "verify-changewld-v2", // debe coincidir con el IDENTIFIER de tu acción
      });

      console.log("✅ verification_response desde WorldApp:", vr);

      // 3) Enviamos la prueba a tu backend para que la valide con Worldcoin
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
        Swal.fire(
          "✔ Verificado",
          "Tu identidad fue confirmada correctamente.",
          "success"
        );
        if (onVerified) onVerified();
      } else {
        Swal.fire(
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
