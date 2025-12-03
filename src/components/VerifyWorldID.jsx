// src/components/VerifyWorldID.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MiniKit } from "@worldcoin/minikit-js";

export default function VerifyWorldID({ onVerified }) {
  const [status, setStatus] = useState("pending"); // 'pending' | 'ok' | 'error'
  const [error, setError] = useState("");

  useEffect(() => {
    const runVerification = async () => {
      try {
        setStatus("pending");
        setError("");

        // ⛔️ OJO: SIN MiniKit.isInstalled()
        const { finalPayload } = await MiniKit.commandsAsync.verify({
          action: "verify-changewld-v2",
          signal: "changewld-device",
        });

        if (!finalPayload || finalPayload.status === "error") {
          setStatus("error");
          setError(
            "No se pudo verificar tu World ID. Cierra y vuelve a abrir ChangeWLD."
          );
          return;
        }

        const nullifier = finalPayload.nullifier_hash;
        if (!nullifier) {
          setStatus("error");
          setError("Respuesta inválida de World ID.");
          return;
        }

        // ✅ Avisamos al padre (App.jsx)
        onVerified?.(nullifier);
        setStatus("ok");
      } catch (err) {
        console.error("Error en VerifyWorldID:", err);
        setStatus("error");
        setError(
          "No se pudo verificar tu World ID. Cierra y vuelve a abrir ChangeWLD."
        );
      }
    };

    // 🔁 Se ejecuta automáticamente al abrir la mini app
    runVerification();
  }, [onVerified]);

  return (
    <div className="mt-3 text-center text-xs">
      <p className="text-gray-600">
        Estado verificación:{" "}
        {status === "ok" ? (
          <span className="text-emerald-600 font-semibold">✔ Verificado</span>
        ) : status === "pending" ? (
          <span className="text-orange-500 font-semibold">
            ⏳ Verificando...
          </span>
        ) : (
          <span className="text-red-500 font-semibold">✖ Pendiente</span>
        )}
      </p>

      {error && (
        <p className="mt-1 text-[11px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
