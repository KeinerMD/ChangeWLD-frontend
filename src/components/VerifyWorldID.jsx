// src/components/VerifyWorldID.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { MiniKit } from "@worldcoin/minikit-js";
import { API_BASE } from "../apiConfig";

export default function VerifyWorldID({ onVerified }) {
  const [status, setStatus] = useState("idle"); // idle | verifying | ok | error

  useEffect(() => {
    const runVerification = async () => {
      if (status !== "idle") return;

      if (!MiniKit.isInstalled()) {
        setStatus("error");
        await Swal.fire(
          "Abre ChangeWLD desde World App",
          "La verificación con World ID solo funciona dentro de la World App.",
          "warning"
        );
        return;
      }

      try {
        setStatus("verifying");

        const action = "verify-changewld-v2";
        const signal = "changewld-device";

        // 1️⃣ Mandar comando de verificación a World App
        const { finalPayload } = await MiniKit.commandsAsync.verify({
          action,
          signal,
        });

        if (!finalPayload || finalPayload.status === "error") {
          setStatus("error");
          await Swal.fire(
            "Verificación cancelada",
            "No se completó la verificación de World ID.",
            "error"
          );
          return;
        }

        // 2️⃣ Validar proof en tu backend
        const resp = await axios.post(`${API_BASE}/api/verify-world-id`, {
          payload: finalPayload,
          action,
          signal,
        });

        if (!resp.data?.success) {
          setStatus("error");
          await Swal.fire(
            "Verificación rechazada",
            "World ID no pudo validar tu prueba. Intenta más tarde.",
            "error"
          );
          return;
        }

        // 3️⃣ Extraer nullifier y avisar al padre (App.jsx)
        const nullifier =
          finalPayload.nullifier_hash ||
          finalPayload.nullifierHash ||
          resp.data?.verifyRes?.nullifier_hash;

        if (nullifier) {
          setStatus("ok");
          onVerified?.(nullifier);
        } else {
          setStatus("error");
          await Swal.fire(
            "Error",
            "No se pudo obtener el identificador de World ID.",
            "error"
          );
        }
      } catch (err) {
        console.error("Error en VerifyWorldID:", err);
        setStatus("error");
        await Swal.fire(
          "Error",
          err?.message || "No se pudo verificar tu World ID.",
          "error"
        );
      }
    };

    // Se lanza automáticamente al montar el componente
    runVerification();
  }, [status, onVerified]);

  // Solo texto de estado, SIN botones
  return (
    <div className="mt-2 text-xs text-center">
      {status === "verifying" && (
        <span className="text-indigo-600 font-semibold">
          Conectando tu World ID...
        </span>
      )}
      {status === "ok" && (
        <span className="text-emerald-600 font-semibold">
          ✔ World ID verificado
        </span>
      )}
      {status === "error" && (
        <span className="text-red-500">
          No se pudo verificar tu World ID. Cierra y vuelve a abrir ChangeWLD.
        </span>
      )}
    </div>
  );
}

