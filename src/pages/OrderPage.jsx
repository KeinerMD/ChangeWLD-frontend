// src/pages/OrderPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../apiConfig";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

function OrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Bandera interna para evitar mostrar el alert varias veces
  const pagoAlertShown = useRef(false);

  const fetchOrden = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/orders/${id}`);
      const nuevaOrden = res.data;

      // 🔥 Mostrar ALERT cuando pase a "pagada"
      if (
        nuevaOrden.estado === "pagada" &&
        !pagoAlertShown.current
      ) {
        pagoAlertShown.current = true;

        Swal.fire({
          title: "💸 ¡Pago enviado!",
          text: "Tu orden ha sido PAGADA. Revisa tu cuenta bancaria.",
          icon: "success",
          confirmButtonText: "Entendido",
        });
      }

      setOrden(nuevaOrden);
      setLoading(false);
    } catch (err) {
      Swal.fire("Error", "Esta orden no existe o fue eliminada.", "error");
      navigate("/");
    }
  };

  useEffect(() => {
    fetchOrden();
    const interval = setInterval(fetchOrden, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const estadoConfig = {
    pendiente: {
      label: "Pendiente de envío",
      desc: "Estamos esperando que envíes tus WLD.",
      color: "bg-amber-100 text-amber-800 border-amber-300",
      dot: "bg-amber-500",
    },
    enviada: {
      label: "Enviada",
      desc: "Detectamos tu envío. Estamos verificando.",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      dot: "bg-blue-500",
    },
    recibida_wld: {
      label: "WLD Recibidos",
      desc: "Tus WLD fueron confirmados. Pagando...",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      dot: "bg-purple-500",
    },
    pagada: {
      label: "Pagada",
      desc: "Tu pago fue enviado correctamente.",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      dot: "bg-emerald-500",
    },
    rechazada: {
      label: "Rechazada",
      desc: "Tu orden fue rechazada.",
      color: "bg-rose-100 text-rose-800 border-rose-300",
      dot: "bg-rose-500",
    },
  };

  const steps = [
    { key: "pendiente", label: "Pendiente" },
    { key: "enviada", label: "Enviada" },
    { key: "recibida_wld", label: "Recibida WLD" },
    { key: "pagada", label: "Pagada" },
  ];

  const getCurrentStepIndex = (estado) => {
    const idx = steps.findIndex((s) => s.key === estado);
    return idx === -1 ? 0 : idx;
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("es-CO", { hour12: true });
  };

  if (loading || !orden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando orden...</p>
        </div>
      </div>
    );
  }

  const estadoActual = orden.estado || "pendiente";
  const config = estadoConfig[estadoActual];
  const currentStep = getCurrentStepIndex(estadoActual);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 px-6 py-7 md:px-8 md:py-8"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Estado de tu orden
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Orden: <span className="font-mono text-slate-700">#{orden.id}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block mb-1">
              Última actualización
            </span>
            <span className="text-xs font-medium text-slate-600">
              {formatDate(orden.actualizada_en)}
            </span>
          </div>
        </div>

        {/* ESTADO ACTUAL */}
        <div
          className={`mb-6 rounded-2xl border px-4 py-3.5 flex items-start gap-3 ${config.color}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${config.dot}`}
          >
            {estadoActual === "pagada"
              ? "✓"
              : estadoActual === "rechazada"
              ? "!"
              : "•"}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{config.label}</p>
            <p className="text-xs text-slate-600 mt-1">{config.desc}</p>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            {steps.map((step, idx) => {
              const isDone = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center">
                  <div className="relative flex items-center justify-center w-full">
                    {idx > 0 && (
                      <div
                        className={`absolute left-0 right-1 top-1/2 h-[2px] -translate-y-1/2 ${
                          isDone ? "bg-indigo-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${
                        isDone
                          ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                          : "border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>
                  </div>
                  <span
                    className={`mt-1 text-[11px] text-center ${
                      isCurrent ? "text-indigo-600 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DATOS DE MONTO */}
        <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-slate-500">Monto enviado</span>
            <span className="font-semibold">{orden.montoWLD} WLD</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-500">Recibirás</span>
            <span className="font-semibold text-emerald-700">
              {Number(orden.montoCOP).toLocaleString("es-CO")} COP
            </span>
          </div>
        </div>

        {/* HISTORIAL */}
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Historial
          </h2>
          <div className="relative pl-4 border-l border-slate-200 space-y-3 max-h-52 overflow-y-auto">
            {orden.status_history?.map((s, i) => {
              const conf = estadoConfig[s.to] || {};
              return (
                <div key={i} className="relative">
                  <div
                    className={`w-2 h-2 rounded-full absolute -left-[5px] top-1 ${
                      conf.dot || "bg-slate-300"
                    }`}
                  />
                  <p className="text-xs font-semibold text-slate-800">
                    {s.to.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatDate(s.at)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* VOLVER */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className="w-full mt-2 rounded-xl bg-slate-900 text-white text-sm font-semibold py-3 hover:bg-slate-800 transition"
        >
          ← Nueva orden
        </motion.button>
      </motion.div>
    </div>
  );
}

export default OrderPage;
