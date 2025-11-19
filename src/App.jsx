// src/App.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import BankSelector from "./components/BankSelector";
import VerifyWorldID from "./components/VerifyWorldID";

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

  // ========= FORMULARIOS =========
  const [montoWLD, setMontoWLD] = useState("");
  const [bankData, setBankData] = useState({
    banco: "",
    titular: "",
    numero: "",
  });

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

    // Primera vez
    fetchRate();
    // Actualizar cada 60 segundos
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

  // ========= CALLBACK CUANDO SE VERIFICA (real o modo pruebas) =========
  const handleWorldIdVerified = (nullifierValue) => {
    setIsVerified(true);
    setVerificationNullifier(
      nullifierValue || "device-test-nullifier-changewld"
    );
  };

  // ========= ETAPA 1: CONFIRMAR MONTO =========
  const handleStep1 = () => {
    const monto = Number(montoWLD || 0);

    if (!monto || monto <= 0) {
      Swal.fire("Monto inválido", "Ingresa un valor válido en WLD.", "warning");
      return;
    }

    if (!rate || !rate.wld_cop_usuario) {
      Swal.fire(
        "Tasa no disponible",
        "Aún no se ha cargado la tasa actual. Espera unos segundos e inténtalo de nuevo.",
        "warning"
      );
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ========= ETAPA 2: CONFIRMAR DATOS BANCARIOS Y CREAR ORDEN =========
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

  // ========= UI PRINCIPAL =========
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex justify-center items-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-2xl rounded-3xl p-7 w-full max-w-md"
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
          {/* ============================
              ETAPA 1 — MONTO + WORLD ID
          ============================ */}
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

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Monto en WLD
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  placeholder="Ej: 12.5"
                  value={montoWLD}
                  onChange={(e) => setMontoWLD(e.target.value)}
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl text-center">
                <p className="text-sm text-gray-600">Tasa actual:</p>
                <p className="text-lg font-bold text-indigo-700">{tasaTexto}</p>

                <p className="text-xs text-gray-500 mt-2">Recibirías:</p>
                <p className="text-2xl font-extrabold text-indigo-700">
                  {recibiriasTexto}
                </p>

                <p className="mt-2 text-[11px] text-gray-400">
                  La tasa se actualiza automáticamente cada 60 segundos.
                </p>
              </div>

              {/* WORLD ID (device / minikit) */}
              <div className="mt-5">
                <VerifyWorldID onVerified={handleWorldIdVerified} />

                <p className="mt-2 text-xs text-center">
                  Estado verificación:{" "}
                  {isVerified ? (
                    <span className="text-emerald-600 font-semibold">
                      ✔ Verificado
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold">
                      ✖ Pendiente
                    </span>
                  )}
                </p>
              </div>

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
            </motion.div>
          )}

          {/* ============================
              ETAPA 2 — DATOS BANCARIOS
          ============================ */}
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

          {/* ============================
              ETAPA 3 — ESTADO DE ORDEN
          ============================ */}
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

              <div className="bg-indigo-50 p-4 rounded-xl text-center mb-4">
                <p className="text-sm text-gray-500">Orden #</p>
                <p className="text-3xl font-bold text-indigo-700">
                  {orderInfo?.id}
                </p>

                <p className="text-sm text-gray-500 mt-3">Estado:</p>
                <p className="text-xl font-bold">
                  {currentStatusLabel(orderInfo?.estado)}
                </p>

                {orderInfo && (
                  <div className="mt-4 text-xs text-gray-600 text-left">
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
                  setHasShownPaidAlert(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-3 w-full border border-gray-300 py-3 rounded-xl"
              >
                Crear una nueva orden
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;
