// src/components/ConnectWallet.jsx
import React, { useState } from "react";
import Swal from "sweetalert2";
import { MiniKit } from "@worldcoin/minikit-js";
import { API_BASE } from "../apiConfig";

/**
 * nullifier: lo recibes desde App.jsx pero aquí no lo necesitamos por ahora.
 * onWalletLinked: callback que espera un objeto { wallet, balanceWLD }
 */
export default function ConnectWallet({ nullifier, onWalletLinked }) {
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  const handleConnect = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        await Swal.fire(
          "Abre ChangeWLD desde World App",
          "La conexión de billetera solo funciona dentro de la World App (Mini Apps → ChangeWLD).",
          "warning"
        );
        return;
      }

      setConnecting(true);

      // 1️⃣ Pedimos nonce + signedNonce a tu backend
      const nonceRes = await fetch(`${API_BASE}/api/wallet-auth/nonce`);
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok || !nonceData.ok) {
        throw new Error(nonceData.error || "No se pudo obtener el nonce.");
      }

      const { nonce, signedNonce } = nonceData;

      // 2️⃣ Ejecutamos walletAuth en World App (SIWE)
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: "Inicias sesión en ChangeWLD con tu billetera World App",
      });

      if (!finalPayload || finalPayload.status === "error") {
        await Swal.fire(
          "Conexión cancelada",
          "No se completó la firma en tu billetera.",
          "error"
        );
        setConnecting(false);
        return;
      }

      // 3️⃣ Enviamos todo al backend para verificar SIWE
      const resp = await fetch(`${API_BASE}/api/wallet-auth/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce,
          signedNonce,
          finalPayloadJson: JSON.stringify(finalPayload),
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok || !data.walletAddress) {
        throw new Error(data.error || "El backend rechazó la autenticación.");
      }

      const address = data.walletAddress;
      setWalletAddress(address);

      // Opcional: guardar token de sesión de esa wallet
      if (data.walletToken) {
        localStorage.setItem("changewld_wallet_token", data.walletToken);
      }

      // 4️⃣ Leer balance real de WLD en World Chain desde el backend
      let balanceWLD = null;
      try {
        const balRes = await fetch(
          `${API_BASE}/api/wallet-balance?address=${encodeURIComponent(
            address
          )}`
        );
        const balData = await balRes.json();

        if (balRes.ok && balData.ok) {
          balanceWLD = balData.balanceWLD ?? null;
        }
      } catch (err) {
        console.warn("No se pudo obtener el balance WLD:", err);
      }

      // 5️⃣ Avisamos al padre (App.jsx) para que habilite el botón MAX
      if (typeof onWalletLinked === "function") {
        onWalletLinked({
          wallet: address,
          balanceWLD,
        });
      }

      // 6️⃣ Mensaje final al usuario
      const saldoTexto =
        balanceWLD != null
          ? `\n\nSaldo estimado: ${balanceWLD.toFixed(4)} WLD`
          : "";

      await Swal.fire(
        "Billetera conectada",
        `Tu dirección es:\n${address}${saldoTexto}`,
        "success"
      );
    } catch (err) {
      console.error("Error en ConnectWallet:", err);
      await Swal.fire(
        "Error",
        err?.message || "No se pudo conectar la billetera.",
        "error"
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className={`w-full py-2 rounded-xl border text-sm font-semibold ${
          walletAddress
            ? "border-emerald-400 text-emerald-600 bg-emerald-50"
            : "border-indigo-200 text-indigo-600 bg-white"
        }`}
      >
        {connecting
          ? "Conectando billetera..."
          : walletAddress
          ? "Billetera conectada ✔"
          : "Conectar billetera para usar MAX 🔗"}
      </button>

      {walletAddress && (
        <p className="mt-1 text-[11px] text-gray-400 break-all text-center">
          {walletAddress}
        </p>
      )}
    </div>
  );
}
