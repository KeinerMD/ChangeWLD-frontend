// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import BankSelector from "./components/BankSelector";
import { MiniKit } from "@worldcoin/minikit-js";
import { WLD_ABI } from "./wldAbi";
import OrderSearch from "./components/OrderSearch"; // 👈 IMPORTANTE

// 👉 Soporte Whatsapp
const SUPPORT_WHATSAPP = "573123146293";

// Helper: convierte "3.125" a uint256 con 18 decimales (BigInt → string)
function toTokenUnits(amountStr, decimals = 18) {
  if (!amountStr) return 0n;

  const [intPartRaw, decPartRaw] = String(amountStr).split(".");
  const intPart = intPartRaw || "0";
  const decPart = (decPartRaw || "").padEnd(decimals, "0").slice(0, decimals);

  const base = 10n ** BigInt(decimals);
  return BigInt(intPart) * base + BigInt(decPart || "0");
}

async function waitForMiniKit(maxAttempts = 15, delayMs = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    if (MiniKit.isInstalled()) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return MiniKit.isInstalled();
}

// 🔎 Términos y condiciones (texto dentro del modal)
function TermsContent() {
  return (
    <div className="text-xs text-gray-700 space-y-3">
      <p>
        <strong>1. Quiénes somos</strong>
        <br />
        ChangeWLD es un servicio de intercambio de Worldcoin (WLD) a pesos
        colombianos (COP) operado por BAYRON MEDINA. ChangeWLD es
        independiente y no está afiliado, patrocinado ni respaldado de forma
        oficial por World App, Worldcoin ni Tools for Humanity.
      </p>

      <p>
        <strong>2. Qué hacemos</strong>
        <br />
        Permitimos que vendas tus WLD y recibas COP en la cuenta o billetera
        local que indiques (por ejemplo, Nequi o Llave Bre-B), usando como
        referencia precios de mercado.
      </p>

      <p>
        <strong>3. Requisitos de uso</strong>
        <br />
        Al usar ChangeWLD declaras que:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Eres mayor de edad y puedes contratar legalmente.</li>
        <li>
          Eres titular o estás autorizado para usar la cuenta/billetera donde
          recibes los fondos.
        </li>
        <li>El origen de tus fondos y tus operaciones es lícito.</li>
      </ul>

      <p>
        <strong>4. Tasa de cambio y margen</strong>
        <br />
        La tasa WLD → COP se calcula a partir de referencias externas y puede
        incluir un margen (spread) para cubrir costos y riesgos. La tasa
        mostrada es informativa hasta que se crea la orden; pueden existir
        pequeños ajustes por redondeos u operaciones internas.
      </p>

      <p>
        <strong>5. Riesgos</strong>
        <br />
        El usuario entiende que:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>El precio de los criptoactivos es altamente volátil.</li>
        <li>
          Pueden presentarse retrasos por redes blockchain o sistemas bancarios.
        </li>
        <li>
          ChangeWLD no ofrece productos de inversión ni rentabilidades
          garantizadas, solo un servicio de cambio puntual.
        </li>
      </ul>

      <p>
        <strong>6. Datos personales</strong>
        <br />
        Guardamos datos mínimos necesarios para procesar las órdenes (nombre,
        banco, número, montos y estado). Se usan para:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Procesar y comprobar pagos.</li>
        <li>Cumplir obligaciones legales y contables.</li>
        <li>Atender soporte y reclamaciones.</li>
      </ul>
      <p>
        No vendemos tus datos a terceros con fines comerciales. Puedes
        solicitar revisar o eliminar tu información cuando la normativa lo
        permita, escribiendo a nuestro soporte.
      </p>

      <p>
        <strong>7. Integración con World App</strong>
        <br />
        Usamos MiniKit para que inicies sesión y autorices operaciones desde
        tu World App. Esto no implica que ChangeWLD sea un servicio oficial de
        World App ni que Tools for Humanity garantice las operaciones realizadas
        aquí.
      </p>

      <p>
        <strong>8. Soporte</strong>
        <br />
        Para dudas o reclamos sobre tus órdenes, puedes escribirnos a:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>WhatsApp: +57 3123146293</li>
        <li>Email: soportechangewld@gmail.com</li>
      </ul>

      <p>
        <strong>9. Aceptación</strong>
        <br />
        Al crear una orden en ChangeWLD declaras que leíste y aceptas estos
        Términos y Condiciones. Si no estás de acuerdo, no uses la aplicación.
      </p>
    </div>
  );
}

function App() {
  const [view, setView] = useState("main"); // "main" | "search"

  const [step, setStep] = useState(1);
  const [rate, setRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [hasShownPaidAlert, setHasShownPaidAlert] = useState(false);

  // 🔐 Estado combinado: identidad + billetera (una sola aprobación)
  const [isVerified, setIsVerified] = useState(false);
  const [verificationNullifier, setVerificationNullifier] = useState(null); // usamos la wallet como "id"
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 🧾 Wallet + balance
  const [walletAddress, setWalletAddress] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(null);

  // Para no ejecutar el auto-init dos veces
  const [autoInitDone, setAutoInitDone] = useState(false);

  // ========= FORMULARIOS =========
  const [montoWLD, setMontoWLD] = useState("");
  const [bankData, setBankData] = useState({
    banco: "",
    titular: "",
    numero: "",
  });

  // 🔗 Guardar el id interno de la transacción de World App
  const lastTxIdRef = useRef(null);

  // Modal T&C
  const [showTerms, setShowTerms] = useState(false);

  const supportLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    "Hola, necesito ayuda con mi orden en ChangeWLD."
  )}`;

  // ========= ENVÍO DE WLD (sendTransaction) =========
  const sendWldToDestination = async (amountWLD) => {
    if (!MiniKit.isInstalled()) {
      await Swal.fire(
        "Abre ChangeWLD desde World App",
        "La transferencia solo funciona dentro de la mini app en World App.",
        "warning"
      );
      return null;
    }

    const tokenAddress = import.meta.env.VITE_WLD_TOKEN_ADDRESS;
    const destination = import.meta.env.VITE_WLD_DESTINATION;

    if (!tokenAddress || !destination) {
      console.error(
        "Falta VITE_WLD_TOKEN_ADDRESS o VITE_WLD_DESTINATION en el .env del frontend"
      );
      await Swal.fire(
        "Error de configuración",
        "Faltan direcciones en la configuración. Contacta al soporte de ChangeWLD.",
        "error"
      );
      return null;
    }

    const amountWei = toTokenUnits(String(amountWLD), 18);

    try {
      Swal.fire({
        title: "Firmando en World App...",
        text: "Confirma la transferencia de WLD a ChangeWLD.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: tokenAddress,
            abi: WLD_ABI,
            functionName: "transfer",
            args: [destination, amountWei.toString()],
          },
        ],
      });

      Swal.close();

      if (finalPayload.status === "error") {
        console.error("Error en sendTransaction:", finalPayload);
        await Swal.fire(
          "Transferencia cancelada",
          "World App no pudo completar la transferencia de WLD.",
          "error"
        );
        return null;
      }

      console.log("✅ Transacción enviada:", finalPayload);

      await Swal.fire(
        "WLD enviados",
        "La transacción fue enviada. En unos segundos deberías ver los WLD en la wallet destino.",
        "success"
      );

      return finalPayload.transaction_id || null;
    } catch (err) {
      Swal.close();
      console.error("Error inesperado en sendWldToDestination:", err);
      await Swal.fire(
        "Error al enviar WLD",
        "No se pudo iniciar la transacción en World App.",
        "error"
      );
      return null;
    }
  };

  // ========= AUTO: UNA SOLA APROBACIÓN (walletAuth) AL ABRIR LA MINI APP =========
  useEffect(() => {
    if (autoInitDone) return;

    let cancelled = false;

    const autoInit = async () => {
      const installed = await waitForMiniKit();
      if (!installed) {
        if (!cancelled) {
          setAuthError(
            "Debes abrir ChangeWLD dentro de la World App para continuar."
          );
        }
        setAutoInitDone(true);
        return;
      }

      try {
        setAuthLoading(true);

        // 1️⃣ Pedimos nonce al backend
        const nonceRes = await axios.get(`${API_BASE}/api/wallet-auth/nonce`);
        if (!nonceRes.data?.ok) {
          throw new Error(
            nonceRes.data?.error ||
              "No se pudo preparar la autenticación con World App."
          );
        }

        const { nonce, signedNonce } = nonceRes.data;

        // 2️⃣ Ejecutamos SOLO walletAuth en World App (una sola aprobación)
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement:
            "Inicias sesión en ChangeWLD con tu billetera de World App.",
        });

        if (!finalPayload || finalPayload.status === "error") {
          throw new Error(
            "No se completó la autenticación en tu billetera de World App."
          );
        }

        // 3️⃣ Enviamos al backend para verificar SIWE
        const completeRes = await axios.post(
          `${API_BASE}/api/wallet-auth/complete`,
          {
            nonce,
            signedNonce,
            finalPayloadJson: JSON.stringify(finalPayload),
          }
        );

        if (!completeRes.data?.ok || !completeRes.data.walletAddress) {
          throw new Error(
            completeRes.data?.error ||
              "El servidor rechazó la autenticación con World App."
          );
        }

        const addr = completeRes.data.walletAddress;

        if (cancelled) return;

        // ✅ Consideramos "identidad + billetera conectadas"
        setIsVerified(true);
        setVerificationNullifier(addr.toLowerCase());
        setWalletAddress(addr);
        setAuthError(null);

        // 4️⃣ Leer balance WLD (para botón MAX)
        try {
          const balRes = await axios.get(`${API_BASE}/api/wallet-balance`, {
            params: { address: addr },
          });

          if (!cancelled && balRes.data?.ok) {
            setAvailableBalance(balRes.data.balanceWLD || 0);
          }
        } catch (err) {
          console.error("Error leyendo balance WLD:", err);
        }
      } catch (err) {
        console.error("Error en autoInit (walletAuth):", err);
        if (!cancelled) {
          setIsVerified(false);
          setVerificationNullifier(null);
          setWalletAddress(null);
          setAvailableBalance(null);
          setAuthError(
            err?.message ||
              "No se pudo conectar con tu World App. Cierra y vuelve a abrir ChangeWLD."
          );
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          setAutoInitDone(true);
        }
      }
    };

    autoInit();

    return () => {
      cancelled = true;
    };
  }, [autoInitDone]);

  // ========= 1) CARGAR TASA DESDE BACKEND (con auto-refresh) =========
  useEffect(() => {
    const fetchRate = () => {
      setLoadingRate(true);
      axios
        .get(`${API_BASE}/api/rate`)
        .then((res) => {
          setRate(res.data);
        })
        .catch(() => {
          Swal.fire(
            "Error",
            "No se pudo obtener la tasa actual. Intenta de nuevo más tarde.",
            "error"
          );
        })
        .finally(() => setLoadingRate(false));
    };

    fetchRate();
    const interval = setInterval(fetchRate, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ========= 2) AUTO-REFRESH DE ORDEN CADA 5s =========
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(() => {
      axios
        .get(`${API_BASE}/api/orders/${orderId}`)
        .then((res) => setOrderInfo(res.data))
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  // ========= 3) ALERTA CUANDO ESTÉ PAGADA =========
  useEffect(() => {
    if (orderInfo && orderInfo.estado === "pagada" && !hasShownPaidAlert) {
      setHasShownPaidAlert(true);
      Swal.fire(
        "✅ Orden pagada",
        "Tu orden ya fue pagada. Revisa tu cuenta bancaria.",
        "success"
      );
    }
  }, [orderInfo, hasShownPaidAlert]);

  // ========= ETAPA 1: CONFIRMAR MONTO (solo validación) =========
  const handleStep1 = async () => {
    if (!montoWLD || Number(montoWLD) <= 0) {
      Swal.fire("Monto inválido", "Ingresa un valor válido en WLD.", "warning");
      return;
    }

    if (!isVerified || !verificationNullifier || !walletAddress) {
      Swal.fire(
        "Conexión requerida",
        "Debes conectarte con tu cuenta de World App antes de continuar.",
        "warning"
      );
      return;
    }

    setStep(2);
  };

  // ========= ETAPA 2: ENVIAR WLD + CREAR ORDEN =========
  const handleStep2 = async () => {
    if (!bankData.banco || !bankData.titular || !bankData.numero) {
      Swal.fire("Campos incompletos", "Llena todos los campos.", "warning");
      return;
    }

    if (!walletAddress || !isVerified || !verificationNullifier) {
      Swal.fire(
        "Error",
        "No se detectó la conexión con World App. Intenta nuevamente.",
        "error"
      );
      return;
    }

    if (!rate || !rate.wld_cop_usuario) {
      Swal.fire(
        "Tasa no disponible",
        "No se pudo leer la tasa actual. Intenta crear la orden de nuevo.",
        "error"
      );
      return;
    }

    const txId = await sendWldToDestination(montoWLD);
    if (!txId) {
      return;
    }

    lastTxIdRef.current = txId;

    Swal.fire({
      title: "Creando orden...",
      text: "Por favor espera un momento.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const montoCOP = Number(montoWLD) * Number(rate?.wld_cop_usuario || 0);

    try {
      const res = await axios.post(`${API_BASE}/api/orders`, {
        nombre: bankData.titular,
        correo: "no-email@changewld.com",
        banco: bankData.banco,
        titular: bankData.titular,
        numero: bankData.numero,
        montoWLD: Number(montoWLD),
        montoCOP: Number(montoCOP.toFixed(2)),
        verified: true,
        nullifier: walletAddress,
        wld_tx_id: lastTxIdRef.current || txId,
      });

      Swal.close();

      if (res.data?.ok) {
        setOrderId(res.data.orden.id);
        setOrderInfo(res.data.orden);
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        Swal.fire(
          "Error",
          res.data?.error || "No se pudo crear la orden.",
          "error"
        );
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
    }
  };

  const formatCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const currentStatusLabel = (estado) => {
    switch (estado) {
      case "pendiente":
        return "⏳ Pendiente";
      case "enviada":
        return "📤 Enviada";
      case "recibida_wld":
        return "🟣 WLD Recibidos";
      case "pagada":
        return "💵 Pagada";
      case "rechazada":
        return "❌ Rechazada";
      default:
        return "⏳ Pendiente";
    }
  };

  const recibiriasTexto =
    montoWLD && rate?.wld_cop_usuario
      ? `${formatCOP(montoWLD * rate.wld_cop_usuario)} COP`
      : "0 COP";

  const continuarDisabled =
    !montoWLD ||
    Number(montoWLD) <= 0 ||
    !rate?.wld_cop_usuario ||
    !isVerified ||
    !verificationNullifier ||
    !walletAddress;

  // ========= UI PRINCIPAL =========
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex justify-center items-start px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-2xl rounded-3xl p-7 w-full max-w-md box-border"
      >
        {/* HEADER */}
        <div className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-indigo-700 mb-1">
            💱 ChangeWLD
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest">
            Cambia tus WLD a COP de forma segura
          </p>
        </div>

        {view === "search" ? (
          <OrderSearch
            onBack={() => setView("main")}
            currentWallet={walletAddress}
          />
        ) : (
          <>
            {/* STEPPER */}
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? "bg-indigo-600 text-white"
                        : step > s
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {s}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {s === 1 && "Monto"}
                    {s === 2 && "Datos Bancarios"}
                    {s === 3 && "Estado"}
                  </p>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1 */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-center text-gray-500 mb-4">
                    Ingresa cuántos <b>WLD</b> quieres cambiar.
                  </p>

                  <div className="mb-3">
                    <label className="block text-sm text-gray-600 mb-1">
                      Monto en WLD (mínimo 1 WLD)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
                        placeholder="Ej: 12.5"
                        value={montoWLD}
                        onChange={(e) => setMontoWLD(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            availableBalance != null &&
                            availableBalance > 0
                          ) {
                            setMontoWLD(String(availableBalance));
                          }
                        }}
                        className="px-3 py-2 text-xs font-semibold border border-indigo-300 text-indigo-700 rounded-xl whitespace-nowrap"
                        disabled={
                          availableBalance == null ||
                          availableBalance <= 0 ||
                          !walletAddress
                        }
                      >
                        MAX
                      </button>
                    </div>

                    {walletAddress && availableBalance != null && (
                      <p className="mt-1 text-xs text-gray-500">
                        Saldo disponible:{" "}
                        <span className="font-semibold text-indigo-600">
                          {availableBalance.toFixed(4)} WLD
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-xl text-center">
                    <p className="text-xs text-gray-500">
                      Recibirías aproximadamente:
                    </p>
                    <p className="text-2xl font-extrabold text-indigo-700">
                      {recibiriasTexto}
                    </p>
                  </div>

                  {/* Estado único de conexión (SIN mostrar address) */}
                  <div className="mt-4 text-xs text-center">
                    <p>
                      Estado de conexión:{" "}
                      {isVerified ? (
                        <span className="text-emerald-600 font-semibold">
                          ✔ Cuenta de World App conectada
                        </span>
                      ) : authError ? (
                        <span className="text-red-500 font-semibold">
                          {authError}
                        </span>
                      ) : authLoading ? (
                        <span className="text-indigo-600 font-semibold">
                          Conectando con tu World App...
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          Preparando conexión con World App...
                        </span>
                      )}
                    </p>
                  </div>

                  {authError && (
                    <p className="mt-3 text-xs text-center text-red-500">
                      Si el problema persiste, cierra y vuelve a abrir ChangeWLD
                      desde la World App.
                    </p>
                  )}

                  <button
                    onClick={handleStep1}
                    disabled={continuarDisabled}
                    className={`mt-4 w-full py-3 rounded-xl font-semibold ${
                      continuarDisabled
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    Continuar
                  </button>

                  {/* Botón Buscar orden */}
                  <button
                    type="button"
                    onClick={() => setView("search")}
                    className="mt-2 w-full py-3 rounded-xl border border-indigo-200 text-indigo-700 font-semibold bg-white"
                  >
                    Buscar orden
                  </button>

                  {/* Términos + soporte */}
                  <div className="mt-3 text-[11px] text-center text-gray-500 space-y-1">
                    <p>
                      Al continuar aceptas los{" "}
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="underline text-indigo-600"
                      >
                        Términos y Condiciones
                      </button>{" "}
                      de ChangeWLD.
                    </p>
                    <p>
                      ¿Necesitas ayuda?{" "}
                      <a
                        href={supportLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-emerald-600"
                      >
                        Contactar soporte por WhatsApp
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-center text-gray-500 mb-4">
                    Ingresa los datos donde recibirás los COP.
                  </p>

                  <label className="block text-sm text-gray-600 mb-1">
                    Banco o billetera
                  </label>
                  <BankSelector
                    value={bankData.banco}
                    onChange={(b) => setBankData({ ...bankData, banco: b })}
                  />

                  <label className="block text-sm text-gray-600 mt-3 mb-1">
                    Titular de la cuenta
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    placeholder="Nombre del titular"
                    value={bankData.titular}
                    onChange={(e) =>
                      setBankData({ ...bankData, titular: e.target.value })
                    }
                  />

                  <label className="block text-sm text-gray-600 mt-3 mb-1">
                    Número de cuenta / Nequi / Bre-B
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    placeholder="Ej: 3001234567"
                    value={bankData.numero}
                    onChange={(e) =>
                      setBankData({ ...bankData, numero: e.target.value })
                    }
                  />

                  <div className="text-xs text-gray-400 mt-3">
                    Recibirás:{" "}
                    <span className="font-semibold text-indigo-600">
                      {formatCOP(montoWLD * rate?.wld_cop_usuario || 0)} COP
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] text-gray-500">
                    Al crear tu orden aceptas los{" "}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="underline text-indigo-600"
                    >
                      Términos y Condiciones
                    </button>{" "}
                    de ChangeWLD y autorizas el uso de tus datos para procesar
                    esta transacción.
                  </p>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="w-1/3 border border-gray-300 py-3 rounded-xl"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleStep2}
                      className="w-2/3 bg-indigo-600 text-white py-3 rounded-xl font-semibold"
                    >
                      Crear orden
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-center text-gray-500 mb-3">
                    Tu orden ha sido creada correctamente 🎉
                  </p>

                  <div className="bg-indigo-50 p-4 rounded-2xl text-center mb-4 w-full max-w-sm mx-auto box-border">
                    <p className="text-sm text-gray-500">Orden #</p>
                    <p className="text-3xl font-bold text-indigo-700">
                      {orderInfo?.id}
                    </p>

                    <p className="text-sm text-gray-500 mt-3">Estado:</p>
                    <p className="text-xl font-bold">
                      {currentStatusLabel(orderInfo?.estado)}
                    </p>

                    {orderInfo && (
                      <div className="mt-4 text-xs text-gray-600 text-left space-y-1">
                        <p>
                          <b>Monto:</b> {orderInfo.montoWLD} WLD →{" "}
                          {formatCOP(orderInfo.montoCOP)} COP
                        </p>
                        <p>
                          <b>Banco:</b> {orderInfo.banco}
                        </p>
                        <p>
                          <b>Titular:</b> {orderInfo.titular}
                        </p>
                        <p>
                          <b>Número:</b> {orderInfo.numero}
                        </p>

                        {orderInfo.wld_tx_id && (
                          <div className="pt-2 text-[11px] text-gray-500">
                            <p className="font-semibold mb-1">Tx World App:</p>
                            <div className="font-mono bg-white/70 rounded-lg px-2 py-1 break-all leading-snug">
                              {orderInfo.wld_tx_id}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setStep(1);
                      setMontoWLD("");
                      setBankData({ banco: "", titular: "", numero: "" });
                      setOrderId(null);
                      setOrderInfo(null);
                      setIsVerified(false);
                      setVerificationNullifier(null);
                      setAuthError(null);
                      setWalletAddress(null);
                      setAvailableBalance(null);
                      setHasShownPaidAlert(false);
                      setAutoInitDone(false);
                      lastTxIdRef.current = null;
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 w-full border border-gray-300 py-3 rounded-xl"
                  >
                    Crear una nueva orden
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* MODAL TÉRMINOS Y CONDICIONES */}
        {showTerms && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl max-h-[80vh] w-full max-w-md p-4 overflow-y-auto">
              <h2 className="text-base font-bold mb-2 text-gray-800">
                Términos y Condiciones de ChangeWLD
              </h2>
              <TermsContent />
              <button
                onClick={() => setShowTerms(false)}
                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;
