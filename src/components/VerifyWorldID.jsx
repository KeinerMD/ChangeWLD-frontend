import React from "react";
import Swal from "sweetalert2";

export default function VerifyWorldID() {

  const handleVerify = async () => {
    try {
      if (!window.WorldApp) {
        Swal.fire(
          "Error",
          "Esta verificación solo funciona dentro de World App.",
          "error"
        );
        return;
      }

      // 📌 1. Solicitar verificación al runtime de World App
      const verification_response = await window.WorldApp.requestVerification({
        actionId: "verify-changewld-v2",  // tu acción nueva
      });

      // 📌 2. Enviar al backend para validación real
      const backend = await fetch(
        "https://changewld-backend-1.onrender.com/api/verify-world-id",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verification_response }),
        }
      );

      const data = await backend.json();

      if (data.verified) {
        Swal.fire("✔ Verificado", "Identidad confirmada correctamente.", "success");
      } else {
        Swal.fire("❌ No verificado", JSON.stringify(data.detail || ""), "error");
      }

    } catch (error) {
      Swal.fire("Error", "Hubo un problema durante la verificación", "error");
    }
  };


  return (
    <button
      onClick={handleVerify}
      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold mt-3"
    >
      Verificar identidad con World ID 🌐
    </button>
  );
}
