// src/components/ConnectWallet.jsx
import React, { useState } from "react";
import Swal from "sweetalert2";
import { MiniKit } from "@worldcoin/minikit-js";
import { API_BASE } from "../apiConfig";

export default function ConnectWallet({ nullifier, onWalletLinked }) {
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);

  const handleConnect = async () => {
    try {
      if (!nullifier) {
        await Swal.fire(
          "Primero verifica tu identidad",
          "Debes completar la verificación con World ID antes de vincular tu billetera.",
          "warning"
        );
        return;
      }

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

      if (!nonceData.ok) {
        throw new Error(nonceData.error || "No se pudo obtener nonce");
      }

      const { nonce, signedNonce } = nonceData;

      // 2️⃣ Ejecutamos walletAuth en la World App (SIWE)
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

      // 3️⃣ Verificamos SIWE en el backend
      const authResp = await fetch(`${API_BASE}/api/wallet-auth/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce,
          signedNonce,
          finalPayloadJson: JSON.stringify(finalPayload),
        }),
      });

      const authData = await authResp.json();

      if (!authResp.ok || !authData.ok) {
        throw new Error(authData.error || "El backend rechazó la autenticación");
      }

      const address = authData.walletAddress;
      const { message, signature } = finalPayload;

      // opcional: guardar token si luego quieres auth de rutas
      if (authData.walletToken) {
        localStorage.setItem("changewld_wallet_token", authData.walletToken);
      }

      // 4️⃣ Vinculamos la wallet al nullifier y obtenemos balance
      const linkResp = await fetch(`${API_BASE}/api/wallet/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nullifier,
          address,
          message,
          signature,
        }),
      });

      const linkData = await linkResp.json();

      if (!linkResp.ok || !linkData.ok) {
        throw new Error(linkData.error || "No se pudo vincular la billetera.");
      }

      setWalletAddress(linkData.wallet);
      setBalance(linkData.balanceWLD ?? 0);

      onWalletLinked?.({
        wallet: linkData.wallet,
        balanceWLD: linkData.balanceWLD ?? 0,
      });

      await Swal.fire(
        "Billetera conectada",
        `Tu dirección es:\n${address}`,
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
        <>
          <p className="mt-1 text-[11px] text-gray-400 break-all text-center">
            {walletAddress}
          </p>
          {balance != null && (
            <p className="mt-1 text-[11px] text-gray-500 text-center">
              Saldo detectado:{" "}
              <span className="font-semibold">
                {balance.toFixed ? balance.toFixed(4) : balance} WLD
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
