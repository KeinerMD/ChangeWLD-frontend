// src/components/ConnectWallet.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MiniKit } from "@worldcoin/minikit-js";
import { API_BASE } from "../apiConfig";

export default function ConnectWallet({ nullifier, onWalletLinked }) {
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [triedOnce, setTriedOnce] = useState(false);

  const connectWallet = async () => {
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

      // 1️⃣ Pedimos nonce + signedNonce al backend
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

      if (data.walletToken) {
        localStorage.setItem("changewld_wallet_token", data.walletToken);
      }

      // 4️⃣ Obtener balance real de WLD en World Chain desde el backend
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

      // 5️⃣ Avisar al padre para que funcione el botón MAX
      if (typeof onWalletLinked === "function") {
        onWalletLinked({
          wallet: address,
          balanceWLD,
        });
      }

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

  // 🔄 Se lanza automáticamente una vez al montar el componente
  useEffect(() => {
    if (!triedOnce && !walletAddress) {
      setTriedOnce(true);
      connectWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triedOnce, walletAddress]);

  // Solo texto de estado, SIN botones
  const short =
    walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="mt-2 text-xs text-center">
      {connecting && (
        <span className="text-indigo-600 font-semibold">
          Conectando tu billetera...
        </span>
      )}
      {!connecting && walletAddress && (
        <span className="text-emerald-600 font-semibold">
          ✔ Billetera conectada:{" "}
          <span className="font-mono text-[11px]">{short}</span>
        </span>
      )}
      {!connecting && !walletAddress && triedOnce && (
        <span className="text-red-500">
          No se pudo conectar la billetera. Cierra y vuelve a abrir ChangeWLD.
        </span>
      )}
    </div>
  );
}
