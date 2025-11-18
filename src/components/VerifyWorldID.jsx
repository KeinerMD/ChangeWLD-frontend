import React from "react";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const handleVerify = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        await Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación solo funciona dentro de la World App (Mini apps → ChangeWLD).",
          "warning"
        );
        return;
      }

      const verifyPayload = {
        action: "verify-changewld-v2",
        signal: "changewld-device",
        verification_level: VerificationLevel.Device,
      };

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (!finalPayload || finalPayload.status === "error") {
        await Swal.fire(
          "Verificación rechazada",
          "World App no pudo completar la verificación. Intenta de nuevo.",
          "error"
        );
        return;
      }

      const url = `${API_BASE}/api/verify-world-id`;

      let resp;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: finalPayload,      // ✅ aquí sin TypeScript
            action: verifyPayload.action,
            signal: verifyPayload.signal,
          }),
        });
      } catch (networkErr) {
        await Swal.fire(
          "Error",
          `No se pudo conectar con el servidor.\n\nDetalle: ${
            networkErr?.message || String(networkErr)
          }`,
          "error"
        );
        return;
      }

      const data = await resp.json().catch(async (parseErr) => {
        console.error("No se pudo parsear JSON:", parseErr);
        throw parseErr;
      });

      if (!resp.ok || !data?.success) {
        await Swal.fire(
          "Verificación rechazada",
          "El servidor no aceptó la prueba de World ID.",
          "error"
        );
        return;
      }

      const nullifier = finalPayload.nullifier_hash;
      onVerified?.(nullifier);

      await Swal.fire(
        "✔ Verificado",
        "Tu identidad fue confirmada correctamente.",
        "success"
      );
    } catch (err) {
      console.error("Error durante la verificación:", err);
      await Swal.fire(
        "Error",
        `Hubo un problema durante la verificación.\n\nDetalle: ${
          err?.message || String(err)
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
