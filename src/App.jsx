import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { IDKitWidget } from "@worldcoin/idkit";
import BankSelector from "./components/BankSelector";

function App() {
  const [step, setStep] = useState(1);
  const [rate, setRate] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  // ========= FORMULARIOS =========
  const [montoWLD, setMontoWLD] = useState("");
  const [bankData, setBankData] = useState({
    banco: "",
    titular: "",
    numero: "",
  });

  // ========= 1) CARGAR TASA DESDE BACKEND =========
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/rate`)
      .then((res) => setRate(res.data))
      .catch(() =>
        Swal.fire("Error", "No se pudo obtener la tasa actual.", "error")
      );
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

  // ========= ETAPA 1: CONFIRMAR MONTO =========
  const handleStep1 = () => {
    if (!montoWLD || Number(montoWLD) <= 0) {
      Swal.fire("Monto inválido", "Ingresa un valor válido en WLD.", "warning");
      return;
    }
    setStep(2);
  };

  // ========= ETAPA 2: CONFIRMAR DATOS BANCARIOS Y CREAR ORDEN =========
  const handleStep2 = async () => {
    if (!bankData.banco || !bankData.titular || !bankData.numero) {
      Swal.fire("Campos incompletos", "Llena todos los campos.", "warning");
      return;
    }

    if (!rate || !rate.wld_cop_usuario) {
      Swal.fire("Error", "La tasa aún no está disponible.", "error");
      return;
    }

    Swal.fire({
      title: "Creando orden...",
      text: "Por favor espera unos segundos.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const montoCOP = Number(montoWLD) * Number(rate.wld_cop_usuario);

    try {
      const res = await axios.post(`${API_BASE}/api/orders`, {
        nombre: bankData.titular,
        correo: "no-email@changewld.com", // no lo usas ahora, pero backend lo espera
        banco: bankData.banco,
        titular: bankData.titular,
        numero: bankData.numero,
        montoWLD: Number(montoWLD),
        montoCOP: Number(montoCOP.toFixed(2)),
      });

      Swal.close();

      if (res.data && res.data.ok && res.data.orden) {
        setOrderId(res.data.orden.id);
        setOrderInfo(res.data.orden);
        setStep(3);
      } else {
        Swal.fire("Error", "No se pudo crear la orden.", "error");
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
    }
  };

  // ========= FORMATEADORES =========
  const formatCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", {
      maximumFractionDigits: 0,
    });

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
            Cambia tus WLD a pesos colombianos
          </p>
        </div>

        {/* STEPPER */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${
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
                {s === 3 && "Estado de Orden"}
              </p>
            </div>
          ))}
        </div>

        {/* CONTENIDO POR ETAPA */}
        <AnimatePresence mode="wait">
          {/* ============================
              ETAPA 1 — INGRESAR MONTO
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
                ¿Cuántos <b>WLD</b> tienes disponibles para cambiar?
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Monto en WLD
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Ej: 12.5"
                  value={montoWLD}
                  onChange={(e) => setMontoWLD(e.target.value)}
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-100">
                <p className="text-xs text-gray-500 mb-1">
                  Tasa actual:
                </p>
                <p className="text-sm font-semibold text-indigo-700 mb-3">
                  {rate && rate.wld_cop_usuario
                    ? `${rate.wld_cop_usuario.toLocaleString(
                        "es-CO"
                      )} COP por 1 WLD`
                    : "Cargando tasa..."}
                </p>

                <p className="text-xs text-gray-500 mb-1">
                  Recibirás aproximadamente:
                </p>
                <p className="text-2xl font-extrabold text-indigo-700">
                  {montoWLD && rate && rate.wld_cop_usuario
                    ? `${formatCOP(
                        Number(montoWLD) * Number(rate.wld_cop_usuario)
                      )} COP`
                    : "0 COP"}
                </p>
              </div>

              {/* Verificación opcional World ID */}
              <div className="mt-5">
                <IDKitWidget
                  app_id="app_123456789" // reemplaza con tu app_id real
                  action="verify-changeWLD"
                  onSuccess={(result) =>
                    console.log("✅ Verificado con World ID:", result)
                  }
                  onError={() =>
                    Swal.fire(
                      "Error",
                      "No se pudo verificar tu identidad.",
                      "error"
                    )
                  }
                  credential_types={["orb", "phone"]}
                  autoClose
                >
                  {({ open }) => (
                    <button
                      onClick={open}
                      className="w-full text-xs mb-2 border border-indigo-200 text-indigo-600 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition"
                    >
                      Verificar identidad con World ID 🌐 (opcional)
                    </button>
                  )}
                </IDKitWidget>
              </div>

              <button
                onClick={handleStep1}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition"
              >
                Confirmar monto
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
      Ahora dinos a dónde te enviamos los pesos.
    </p>

    <div className="mb-3">
      <label className="block text-sm text-gray-600 mb-1">
        Banco o billetera
      </label>
      <BankSelector
        value={bankData.banco}
        onChange={(b) => setBankData({ ...bankData, banco: b })}
      />
    </div>

    <div className="mb-3">
      <label className="block text-sm text-gray-600 mb-1">
        Titular de la cuenta
      </label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Nombre del titular"
        value={bankData.titular}
        onChange={(e) =>
          setBankData({ ...bankData, titular: e.target.value })
        }
      />
    </div>

    <div className="mb-1">
      <label className="block text-sm text-gray-600 mb-1">
        Número de cuenta / Nequi / Daviplata
      </label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Ej: 3001234567"
        value={bankData.numero}
        onChange={(e) =>
          setBankData({ ...bankData, numero: e.target.value })
        }
      />
    </div>

    <div className="text-xs text-gray-400 mt-2 mb-3">
      Monto a recibir:{" "}
      <span className="font-semibold text-indigo-600">
        {montoWLD && rate && rate.wld_cop_usuario
          ? `${formatCOP(
              Number(montoWLD) * Number(rate.wld_cop_usuario)
            )} COP`
          : "0 COP"}
      </span>
    </div>

    <div className="flex gap-3 mt-4">
      <button
        onClick={() => setStep(1)}
        className="w-1/3 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50"
      >
        Volver
      </button>
      <button
        onClick={handleStep2}
        className="w-2/3 bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition"
      >
        Confirmar y crear orden
      </button>
    </div>
  </motion.div>
)}


          {/* ============================
              ETAPA 3 — ESTADO DE LA ORDEN
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

              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-4 text-center">
                <p className="text-sm text-gray-500 mb-1">
                  Número de orden:
                </p>
                <p className="text-2xl font-extrabold text-indigo-700 mb-3">
                  #{orderInfo?.id}
                </p>

                <p className="text-sm text-gray-500 mb-1">Estado actual:</p>
                <p className="text-xl font-bold">
                  {currentStatusLabel(orderInfo?.estado)}
                </p>

                <p className="text-xs text-gray-500 mt-3">
                  Se actualiza automáticamente cada 5 segundos.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 mb-3">
                <p>
                  <b>Monto:</b>{" "}
                  {orderInfo?.montoWLD} WLD →{" "}
                  {orderInfo?.montoCOP
                    ? `${formatCOP(orderInfo.montoCOP)} COP`
                    : "-"}
                </p>
                <p>
                  <b>Banco:</b> {orderInfo?.banco} • {orderInfo?.titular}
                </p>
                <p>
                  <b>Cuenta:</b> {orderInfo?.numero}
                </p>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setMontoWLD("");
                  setBankData({ banco: "", titular: "", numero: "" });
                  setOrderId(null);
                  setOrderInfo(null);
                }}
                className="mt-2 w-full border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50"
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
