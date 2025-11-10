import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

function AdminPage() {
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);

  // Cargar órdenes
  const loadOrders = async (p) => {
    try {
      const res = await axios.get(`/api/orders-admin?pin=${p}`);
      setOrders(res.data);
      setAuthed(true);
    } catch (err) {
      Swal.fire("Error", "PIN inválido o servidor no disponible", "error");
      setAuthed(false);
    }
  };

  const handleLogin = async () => {
    if (!pin.trim()) return;
    await loadOrders(pin.trim());
  };

  const handleChangeEstado = async (id, estado) => {
    try {
      const res = await axios.put(`/api/orders/${id}/estado`, { estado, pin });
      if (res.data.ok) {
        Swal.fire({
          title: "✅ Estado actualizado",
          text: `Orden #${id} → ${estado.toUpperCase()}`,
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
        await loadOrders(pin);
      } else {
        Swal.fire("Error", res.data.error || "No se pudo actualizar", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo realizar la actualización", "error");
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("es-CO");
  };

  const getNextStates = (estado) => {
    switch (estado) {
      case "pendiente":
        return ["enviada"];
      case "enviada":
        return ["recibida_wld"];
      case "recibida_wld":
        return ["pagada", "rechazada"];
      default:
        return [];
    }
  };

  // Paleta de colores por estado
  const stateColors = {
    pendiente: "bg-yellow-500",
    enviada: "bg-blue-500",
    recibida_wld: "bg-purple-500",
    pagada: "bg-green-500",
    rechazada: "bg-red-500",
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-5">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        ⚙️ Panel de Administración — ChangeWLD
      </h1>

      {!authed ? (
        <motion.div
          className="max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-lg border"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-center mb-4">
            Ingresar PIN de Operador
          </h2>
          <input
            type="password"
            className="input input-bordered w-full text-center mb-3"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button onClick={handleLogin} className="btn btn-primary w-full">
            Entrar
          </button>
        </motion.div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-5">
            {orders.length === 0 ? (
              <p className="text-center text-gray-500 mt-6">
                No hay órdenes registradas aún
              </p>
            ) : (
              <AnimatePresence>
                {orders.map((o) => (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-xl transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="font-bold text-lg text-blue-700">
                        #{o.id} — {o.nombre}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-lg text-white text-sm ${stateColors[o.estado] || "bg-gray-400"}`}
                      >
                        {o.estado.toUpperCase()}
                      </span>
                    </div>

                    {/* Datos básicos */}
                    <p className="text-sm text-gray-600">
                      {o.montoWLD} WLD →{" "}
                      <b>{o.montoCOP.toLocaleString("es-CO")} COP</b>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {o.banco} • {o.titular} • {o.numero}
                    </p>

                    {/* === Timeline Animado === */}
                    <motion.div
                      className="relative border-l-2 border-gray-300 pl-4 ml-2 mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {Array.isArray(o.status_history) &&
                        o.status_history.map((s, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.1 }}
                            className="mb-2 relative"
                          >
                            <div
                              className={`absolute -left-[9px] w-4 h-4 rounded-full ${
                                stateColors[s.to] || "bg-gray-400"
                              }`}
                            ></div>
                            <p className="font-semibold text-gray-800">
                              {s.to.toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(s.at)}
                            </p>
                          </motion.div>
                        ))}
                    </motion.div>

                    {/* === Botones de acción === */}
                    <motion.div layout className="flex flex-wrap gap-3">
                      {getNextStates(o.estado).map((estadoSig) => (
                        <motion.button
                          key={estadoSig}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleChangeEstado(o.id, estadoSig)}
                          className={`rounded-md px-6 py-2 font-semibold text-white ${
                            estadoSig === "pagada"
                              ? "bg-green-600 hover:bg-green-700"
                              : estadoSig === "rechazada"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {estadoSig.toUpperCase()}
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
