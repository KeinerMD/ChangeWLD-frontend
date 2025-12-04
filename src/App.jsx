// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import BankSelector from "./components/BankSelector";
import { MiniKit } from "@worldcoin/minikit-js";
import { WLD_ABI } from "./wldAbi";

// 👉 CONFIGURA AQUÍ TU WHATSAPP DE SOPORTE
const SUPPORT_WHATSAPP = "573123146293"; // formato 57 + número sin espacios

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

// Texto de términos y condiciones / privacidad (ajusta los campos entre [ ])
const TermsContent = () => (
  <div className="text-xs text-gray-700 space-y-3">
    <p>
      <strong>1. Identidad del servicio</strong>
      <br />
      ChangeWLD es un servicio de intercambio de Worldcoin (WLD) a pesos
      colombianos (COP) operado por [NOMBRE LEGAL DEL OPERADOR O EMPRESA].
      ChangeWLD es una aplicación independiente y no está afiliada, patrocinada
      ni respaldada de forma oficial por Worldcoin, World App ni Tools for
      Humanity.
    </p>

    <p>
      <strong>2. Objeto del servicio</strong>
      <br />
      El objetivo de ChangeWLD es permitir al usuario vender sus tokens WLD y
      recibir a cambio COP en una cuenta bancaria o billetera local indicada
      por el usuario (por ejemplo, Nequi o Llave Bre-B).
    </p>

    <p>
      <strong>3. Requisitos de uso</strong>
      <br />
      Para usar ChangeWLD el usuario declara que:
    </p>
    <ul className="list-disc list-inside space-y-1">
      <li>Es mayor de edad y con capacidad legal para contratar.</li>
      <li>
        Es titular o está autorizado para usar la cuenta bancaria o billetera
        donde recibirá los fondos.
      </li>
      <li>
        Utiliza la aplicación únicamente para fines lícitos y con origen de
        fondos legítimo.
      </li>
    </ul>

    <p>
      <strong>4. Funcionamiento básico</strong>
      <br />
      El usuario indica el monto en WLD, envía los tokens a la dirección de
      destino mostrada por ChangeWLD mediante World App y proporciona sus datos
      bancarios. Una vez verificada la recepción de los WLD, ChangeWLD realiza
      el pago en COP al medio de pago indicado por el usuario.
    </p>

    <p>
      <strong>5. Tasa de cambio y comisiones</strong>
      <br />
      La tasa de cambio WLD → COP se calcula a partir de referencias externas
      de mercado y puede incluir un margen (spread) para cubrir riesgos y costos
      operativos. La tasa visible en la app es referencial y solo se considera
      definitiva una vez creada la orden. Los montos en COP pueden variar
      ligeramente por redondeos o ajustes operativos razonables.
    </p>

    <p>
      <strong>6. Riesgos</strong>
      <br />
      El usuario entiende y acepta que:
    </p>
    <ul className="list-disc list-inside space-y-1">
      <li>
        El precio de los criptoactivos es volátil y puede cambiar rápidamente.
      </li>
      <li>
        Pueden existir retrasos por congestión de red, validaciones adicionales
        o mantenimiento de sistemas bancarios.
      </li>
      <li>
        ChangeWLD no garantiza rentabilidad ni ofrece productos de inversión,
        solo un servicio de cambio puntual.
      </li>
    </ul>

    <p>
      <strong>7. Datos personales y privacidad</strong>
      <br />
      ChangeWLD recoge y almacena datos necesarios para procesar cada orden,
      como nombre del titular, banco, número de cuenta, montos y estado de la
      operación. Estos datos se utilizan exclusivamente para:
    </p>
    <ul className="list-disc list-inside space-y-1">
      <li>Procesar y comprobar el pago de cada orden.</li>
      <li>Cumplir obligaciones contables, fiscales y/o regulatorias.</li>
      <li>
        Atender reclamaciones o consultas de soporte relacionadas con la
        operación.
      </li>
    </ul>
    <p>
      ChangeWLD no vende ni cede estos datos a terceros con fines comerciales.
      El usuario puede solicitar la revisión o eliminación de sus datos cuando
      la normativa lo permita, contactando al soporte.
    </p>

    <p>
      <strong>8. Integración con World App</strong>
      <br />
      ChangeWLD utiliza MiniKit para verificar World ID y permitir al usuario
      autorizar transacciones desde su billetera en World App. En ningún caso
      esto implica que ChangeWLD sea un servicio oficial de World App ni que
      Tools for Humanity respalde las operaciones realizadas.
    </p>

    <p>
      <strong>9. Soporte y reclamaciones</strong>
      <br />
      Para consultas o soporte sobre operaciones realizadas en ChangeWLD, el
      usuario puede contactar a:
    </p>
    <ul className="list-disc list-inside space-y-1">
      <li>
        WhatsApp:{" "}
        <span className="font-mono">
          +{SUPPORT_WHATSAPP.slice(0, 2)} {SUPPORT_WHATSAPP.slice(2)}
        </span>
      </li>
      <li>Email: [CORREO DE SOPORTE]</li>
    </ul>

    <p>
      <strong>10. Aceptación</strong>
      <br />
      Al crear una orden en ChangeWLD, el usuario declara haber leído,
      comprendido y aceptado estos Términos y Condiciones, así como la política
      de privacidad descrita. Si no está de acuerdo, debe dejar de usar la
      aplicación.
    </p>
  </div>
);

function App() {
  const [step, setStep] = useState(1);
  const [rate, setRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [hasShownPaidAlert, setHasShownPaidAlert] = useState(false);

  // 🔒 Verificación World ID
  const [isVerified, setIsVerified] = useState(false);
  const [verificationNullifier, setVerificationNullifier] = useState(null);
  const [worldIdError, setWorldIdError] = useState(null);

  // 🧾 Wallet + balance
  const [walletAddress, setWalletAddress] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(null);
  const [walletError, setWalletError] = useState(null);

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

  // ========= AUTO: World ID + Wallet al abrir la mini app =========
  useEffect(() => {
    if (autoInitDone) return;

    let cancelled = false;

    const autoInit = async () => {
      const installed = await waitForMiniKit();
      if (!installed) {
        if (!cancelled) {
          setWorldIdError(
            "No se pudo verificar tu World ID. Abre ChangeWLD desde la World App."
          );
          setWalletError(
            "No se pudo conectar la billetera. Abre ChangeWLD desde la World App."
          );
        }
        setAutoInitDone(true);
        return;
      }

      try {
        // 1️⃣ Verificar World ID
        const { finalPayload } = await MiniKit.commandsAsync.verify({
          action: "verify-changewld-v2",
          signal: "changewld-device",
        });

        if (!finalPayload || finalPayload.status === "error") {
          if (!cancelled) {
            setWorldIdError(
              "No se completó la verificación World ID en la app."
            );
          }
          setAutoInitDone(true);
          return;
        }

        const verifyRes = await axios.post(`${API_BASE}/api/verify-world-id`, {
          payload: finalPayload,
          action: "verify-changewld-v2",
          signal: "changewld-device",
        });

        if (!verifyRes.data?.success) {
          if (!cancelled) {
            setWorldIdError(
              "Tu World ID fue rechazado. Cierra y vuelve a abrir ChangeWLD."
            );
          }
          setAutoInitDone(true);
          return;
        }

        if (!cancelled) {
          setIsVerified(true);
          setVerificationNullifier(finalPayload.nullifier_hash);
          setWorldIdError(null);
        }

        // 2️⃣ Autenticación de billetera (walletAuth + SIWE)
        const nonceRes = await axios.get(`${API_BASE}/api/wallet-auth/nonce`);
        if (!nonceRes.data?.ok) {
          if (!cancelled) {
            setWalletError(
              nonceRes.data?.error ||
                "No se pudo preparar la autenticación de billetera."
            );
          }
          setAutoInitDone(true);
          return;
        }

        const { nonce, signedNonce } = nonceRes.data;

        const { finalPayload: walletPayload } =
          await MiniKit.commandsAsync.walletAuth({
            nonce,
            statement:
              "Inicias sesión en ChangeWLD con tu billetera World App.",
          });

        if (!walletPayload || walletPayload.status === "error") {
          if (!cancelled) {
            setWalletError(
              "No se completó la conexión de la billetera en World App."
            );
          }
          setAutoInitDone(true);
          return;
        }

        const completeRes = await axios.post(
          `${API_BASE}/api/wallet-auth/complete`,
          {
            nonce,
            signedNonce,
            finalPayloadJson: JSON.stringify(walletPayload),
          }
        );

        if (!completeRes.data?.ok) {
          if (!cancelled) {
            setWalletError(
              completeRes.data?.error ||
                "El servidor rechazó la autenticación de la billetera."
            );
          }
          setAutoInitDone(true);
          return;
        }

        const addr = completeRes.data.walletAddress;
        if (!cancelled) {
          setWalletAddress(addr);
          setWalletError(null);
        }

        // 3️⃣ Leer balance WLD de esa address (para botón MAX)
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
        console.error("Error en autoInit World ID / wallet:", err);
        if (!cancelled) {
          if (!isVerified) {
            setWorldIdError(
              "No se pudo verificar tu World ID. Cierra y vuelve a abrir ChangeWLD."
            );
          } else {
            setWalletError(
              "No se pudo conectar la billetera. Cierra y vuelve a abrir ChangeWLD."
            );
          }
        }
      } finally {
        if (!cancelled) setAutoInitDone(true);
      }
    };

    autoInit();

    return () => {
      cancelled = true;
    };
  }, [autoInitDone, isVerified]);

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

    if (!isVerified || !verificationNullifier) {
      Swal.fire(
        "Verificación requerida",
        "Debes verificar tu identidad con World ID antes de continuar.",
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

    if (!verificationNullifier || !isVerified) {
      Swal.fire(
        "Error",
        "No se detectó la verificación World ID. Intenta nuevamente.",
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

    // 1️⃣ Primero enviamos los WLD al wallet destino
    const txId = await sendWldToDestination(montoWLD);
    if (!txId) {
      return;
    }

    lastTxIdRef.current = txId;

    // 2️⃣ Ahora sí, creamos la orden en el backend
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
        verified: isVerified,
        nullifier: verificationNullifier,
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

  // ========= FORMATEADOR =========
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

  const tasaTexto =
    rate?.wld_cop_usuario && !loadingRate
      ? `${rate.wld_cop_usuario.toLocaleString("es-CO")} COP por 1 WLD`
      : loadingRate
      ? "Cargando tasa..."
      : "Tasa no disponible";

  const recibiriasTexto =
    montoWLD && rate?.wld_cop_usuario
      ? `${formatCOP(montoWLD * rate.wld_cop_usuario)} COP`
      : "0 COP";

  const continuarDisabled =
    !montoWLD ||
    Number(montoWLD) <= 0 ||
    !rate?.wld_cop_usuario ||
    !isVerified ||
    !verificationNullifier;

  const supportLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    "Hola, necesito ayuda con mi orden en ChangeWLD."
  )}`;

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

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          {/* ETAPA 1 — MONTO + AUTO WORLD ID + AUTO WALLET */}
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
                      if (availableBalance != null && availableBalance > 0) {
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
                <p className="text-sm text-gray-600">Tasa actual:</p>
                <p className="text-lg font-bold text-indigo-700">
                  {tasaTexto}
                </p>

                <p className="text-xs text-gray-500 mt-2">Recibirías:</p>
                <p className="text-2xl font-extrabold text-indigo-700">
                  {recibiriasTexto}
                </p>
              </div>

              {/* ESTADOS DE WORLD ID Y BILLETERA (sin mostrar address) */}
              <div className="mt-4 text-xs text-center">
                <p>
                  Estado verificación World ID:{" "}
                  {isVerified ? (
                    <span className="text-emerald-600 font-semibold">
                      ✔ Verificado
                    </span>
                  ) : worldIdError ? (
                    <span className="text-red-500 font-semibold">
                      {worldIdError}
                    </span>
                  ) : (
                    <span className="text-gray-500">Conectando...</span>
                  )}
                </p>

                <p className="mt-2">
                  Billetera:{" "}
                  {walletAddress ? (
                    <span className="text-emerald-600 font-semibold">
                      Conectada ✅
                    </span>
                  ) : walletError ? (
                    <span className="text-red-500 font-semibold">
                      {walletError}
                    </span>
                  ) : (
                    <span className="text-gray-500">Conectando...</span>
                  )}
                </p>
              </div>

              {/* Mensajes en rojo como los de tu screenshot */}
              {worldIdError && (
                <p className="mt-3 text-xs text-center text-red-500">
                  No se pudo verificar tu World ID. Cierra y vuelve a abrir
                  ChangeWLD.
                </p>
              )}
              {walletError && (
                <p className="mt-1 text-xs text-center text-red-500">
                  No se pudo conectar la billetera. Cierra y vuelve a abrir
                  ChangeWLD.
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

              {/* Soporte y T&C link */}
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

          {/* ETAPA 2 — DATOS BANCARIOS */}
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
                de ChangeWLD y autorizas el uso de tus datos para procesar esta
                transacción.
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

              <div className="mt-4 text-[11px] text-center text-gray-500">
                ¿Problemas con tu orden?{" "}
                <a
                  href={supportLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-600"
                >
                  Hablar con soporte por WhatsApp
                </a>
              </div>
            </motion.div>
          )}

          {/* ETAPA 3 — ESTADO DE ORDEN */}
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
                  setWorldIdError(null);
                  setWalletAddress(null);
                  setAvailableBalance(null);
                  setWalletError(null);
                  setHasShownPaidAlert(false);
                  setAutoInitDone(false);
                  lastTxIdRef.current = null;
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-3 w-full border border-gray-300 py-3 rounded-xl"
              >
                Crear una nueva orden
              </button>

              <div className="mt-4 text-[11px] text-center text-gray-500">
                ¿Tienes dudas sobre esta orden?{" "}
                <a
                  href={supportLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-600"
                >
                  Contactar soporte por WhatsApp
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL DE TÉRMINOS Y CONDICIONES */}
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
