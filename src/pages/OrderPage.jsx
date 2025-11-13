import React, { useEffect, useState } from "react";
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

  const fetchOrden = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/orders/${id}`);
      setOrden(res.data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadoConfig = {
    pendiente: {
      color: "bg-yellow-100 border-yellow-400 text-yellow-700",
      icon: "⏳",
      label: "Pendiente",
      desc: "Estamos esperando la confirmación de tu operación.",
    },
    enviada: {
      color: "bg-blue-100 border-blue-400 text-blue-700",
      icon: "📤",
      label: "Enviada",
      desc: "Tu solicitud ha sido registrada y está en proceso.",
    },
    recibida_wld: {
      color: "bg-purple-100 border-purple-400 text-purple-700",
      icon: "🟣",
      label: "WLD Recibidos",
      desc: "Tus WLD fueron recibidos, estamos alistando el pago.",
    },
    pagada: {
      color: "bg-green-100 border-green-400 text-green-700",
      icon: "💵",
      label: "Pagada",
      desc: "Tu pago fue enviado correctamente. ¡Gracias por usar ChangeWLD!",
    },
    rechazada: {
      color: "bg-red-100 border-red-400 text-red-700",
      icon: "❌",
      label: "Rechazada",
      desc: "Tu orden fue rechazada. Si crees que es un error, contáctanos.",
    },
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", { hour12: true });
  };

  const formatCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", {
      maximumFractionDigits: 0,
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando orden...
      </div>
    );
  }

  const config = estadoConfig[orden.estado] || estadoConfig.pendiente;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 py-10 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-md w-full bg-white shadow-2xl rounded-3xl p-7 border-t-4 ${config.color}`}
      >
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-indigo-700 mb-1">
            ChangeWLD — Orden #{orden.id}
          </h1>
          <p className="text-xs text-gray-400">
            Se actualiza automáticamente cada 5 segundos
          </p>
        </div>

        <div className="text-center mb-5">
          <div className="text-5xl mb-2">{config.icon}</div>
          <h2 className="text-xl font-semibold mb-1">{config.label}</h2>
          <p className="text-gray-600 text-sm">{config.desc}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200 text-sm text-gray-700">
          <p className="mb-1">
            <b>Monto:</b> {orden.montoWLD} WLD →{" "}
            <span className="text-indigo-700 font-semibold">
              {formatCOP(orden.montoCOP)} COP
            </span>
          </p>
          <p className="mb-1">
            <b>Banco:</b> {orden.banco} — {orden.titular}
          </p>
          <p className="mb-1">
            <b>Cuenta:</b> {orden.numero}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Última actualización: {formatDate(orden.actualizada_en)}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l-2 border-gray-300 pl-5 ml-2">
          {Array.isArray(orden.status_history) &&
          orden.status_history.length > 0 ? (
            orden.status_history.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="mb-3 relative"
              >
                <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-indigo-500"></div>
                <p className="font-semibold text-gray-800 text-sm">
                  {s.to.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">{formatDate(s.at)}</p>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">
              No hay historial disponible todavía.
            </p>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Crear nueva orden
        </button>
      </motion.div>
    </div>
  );
}

export default OrderPage;
