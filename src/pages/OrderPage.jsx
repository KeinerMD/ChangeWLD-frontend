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
  }, []);

  const estadoConfig = {
    pendiente: {
      color: "bg-yellow-100 border-yellow-400 text-yellow-700",
      icon: "🕒",
      label: "Pendiente de envío",
      desc: "Estamos esperando que envíes tus Worldcoins.",
    },
    enviada: {
      color: "bg-blue-100 border-blue-400 text-blue-700",
      icon: "📤",
      label: "Enviada",
      desc: "Tu transferencia fue detectada. Estamos verificando el depósito.",
    },
    recibida_wld: {
      color: "bg-purple-100 border-purple-400 text-purple-700",
      icon: "🔍",
      label: "WLD Recibidos",
      desc: "Tus Worldcoins fueron confirmados. Procesando pago.",
    },
    pagada: {
      color: "bg-green-100 border-green-400 text-green-700",
      icon: "💸",
      label: "Pagada",
      desc: "Tu pago fue enviado correctamente. ¡Gracias por usar ChangeWLD!",
    },
    rechazada: {
      color: "bg-red-100 border-red-400 text-red-700",
      icon: "❌",
      label: "Rechazada",
      desc: "Tu orden fue rechazada. Contacta soporte si crees que hubo un error.",
    },
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", { hour12: true });
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando orden...
      </div>
    );

  const config = estadoConfig[orden.estado] || estadoConfig.pendiente;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 py-10 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-md w-full bg-white shadow-2xl rounded-3xl p-7 border-t-4 ${config.color}`}
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-700 mb-2">
            ChangeWLD
          </h1>
          <p className="text-sm text-gray-500">Orden #{orden.id}</p>
        </div>

        <div className="text-center mb-5">
          <div className="text-6xl mb-3">{config.icon}</div>
          <h2 className="text-xl font-semibold mb-1">{config.label}</h2>
          <p className="text-gray-600 text-sm">{config.desc}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
          <p className="text-gray-700 text-sm mb-1">
            <b>Monto:</b> {orden.montoWLD} WLD →{" "}
            <span className="text-indigo-700 font-semibold">
              {orden.montoCOP.toLocaleString("es-CO")} COP
            </span>
          </p>
          <p className="text-gray-700 text-sm mb-1">
            <b>Banco:</b> {orden.banco} — {orden.titular}
          </p>
          <p className="text-gray-700 text-sm mb-1">
            <b>Cuenta:</b> {orden.numero}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Wallet destino: <b>{orden.walletDestino}</b>
          </p>
        </div>

        {/* Línea de tiempo visual */}
        <div className="relative border-l-2 border-gray-300 pl-5 ml-2">
          {Array.isArray(orden?.status_history) && orden.status_history.length > 0 ? (
            orden.status_history.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="mb-3 relative"
              >
                <div
                  className={`absolute -left-[9px] w-4 h-4 rounded-full ${
                    estadoConfig[s.to]?.color?.split(" ")[0] || "bg-gray-400"
                  }`}
                ></div>
                <p className="font-semibold text-gray-800 text-sm">
                  {s.to.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">{formatDate(s.at)}</p>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">Aún no hay historial disponible.</p>
          )}
        </div>

        {/* Botón volver */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Nueva orden
        </motion.button>
      </motion.div>

      <p className="text-gray-400 text-xs mt-6">
        Última actualización: {formatDate(orden.actualizada_en)}
      </p>
    </div>
  );
}

export default OrderPage;
