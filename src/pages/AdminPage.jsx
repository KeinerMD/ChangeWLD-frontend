import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

function AdminPage() {
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const loadOrders = async (p) => {
    try {
      setLoadingOrders(true);
      const res = await axios.get(`${API_BASE}/api/orders-admin?pin=${p}`);
      setOrders(res.data || []);
      setAuthed(true);
    } catch (err) {
      Swal.fire("Error", "PIN inválido o servidor no disponible", "error");
      setAuthed(false);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogin = async () => {
    if (!pin.trim()) return;
    await loadOrders(pin.trim());
  };

  const handleChangeEstado = async (id, estado) => {
    try {
      const res = await axios.put(`${API_BASE}/api/orders/${id}/estado`, {
        estado,
        pin,
      });

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

  const stateColors = {
    pendiente: "bg-yellow-500",
    enviada: "bg-blue-500",
    recibida_wld: "bg-purple-500",
    pagada: "bg-green-500",
    rechazada: "bg-red-500",
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
        ⚙️ Panel de Administración — ChangeWLD
      </h1>

      {!authed ? (
        <motion.div
          className="max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold text-center mb-2">
            Ingresar PIN de Operador
          </h2>
          <p className="text-xs text-gray-500 text-center mb-4">
            Solo personal autorizado. Ingresa el PIN para ver las órdenes.
          </p>
          <input
            type="password"
            className="input input-bordered w-full text-center mb-3"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="btn btn-primary w-full bg-indigo-600 border-none hover:bg-indigo-700"
          >
            Entrar
          </button>
        </motion.div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Total de órdenes:{" "}
              <span className="font-semibold">{orders.length}</span>
            </p>
            <button
              onClick={() => loadOrders(pin)}
              className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              🔄 Actualizar lista
            </button>
          </div>

          {loadingOrders && (
            <p className="text-center text-gray-500 mb-3">Cargando órdenes...</p>
          )}

          {orders.length === 0 ? (
            <p className="text-center text-gray-500 mt-6">
              No hay órdenes registradas aún.
            </p>
          ) : (
            <AnimatePresence>
              <div className="grid gap-4">
                {orders.map((o) => (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="font-bold text-lg text-indigo-700">
                          Orden #{o.id}
                        </h2>
                        <p className="text-xs text-gray-500">
                          Creada: {formatDate(o.creada_en)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                          stateColors[o.estado] || "bg-gray-400"
                        }`}
                      >
                        {o.estado.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      <p>
                        <b>{o.montoWLD}</b> WLD →{" "}
                        <b>{o.montoCOP?.toLocaleString("es-CO")} COP</b>
                      </p>
                      <p>
                        {o.banco} • {o.titular} • {o.numero}
                      </p>
                    </div>

                    {/* Timeline compacto */}
                    <div className="relative border-l-2 border-gray-200 pl-4 ml-1 mt-2 mb-2">
                      {Array.isArray(o.status_history) &&
                        o.status_history.map((s, i) => (
                          <div key={i} className="mb-1.5 relative">
                            <div className="absolute -left-[9px] w-3 h-3 rounded-full bg-indigo-500"></div>
                            <p className="text-xs font-semibold text-gray-800">
                              {s.to.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {formatDate(s.at)}
                            </p>
                          </div>
                        ))}
                    </div>

                    {/* Botones de acción */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getNextStates(o.estado).map((estadoSig) => (
                        <button
                          key={estadoSig}
                          onClick={() => handleChangeEstado(o.id, estadoSig)}
                          className={`rounded-md px-4 py-2 text-xs font-semibold text-white ${
                            estadoSig === "pagada"
                              ? "bg-green-600 hover:bg-green-700"
                              : estadoSig === "rechazada"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          {estadoSig.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
