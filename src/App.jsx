import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { IDKitWidget } from "@worldcoin/idkit";

function App() {
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    banco: "",
    titular: "",
    numero: "",
    montoWLD: "",
  });

  const [rate, setRate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/rate`)
      .then((r) => setRate(r.data))
      .catch(() =>
        Swal.fire("Error", "No se pudo obtener la tasa actual", "error")
      );
  }, []);

  const handleCrearOrden = async () => {
    if (
      !form.nombre ||
      !form.correo ||
      !form.banco ||
      !form.titular ||
      !form.numero ||
      !form.montoWLD
    ) {
      Swal.fire("Campos incompletos", "Por favor llena todos los campos", "warning");
      return;
    }

    try {
      const montoCOP = rate
        ? (form.montoWLD * rate.wld_cop_usuario).toFixed(2)
        : 0;

      Swal.fire({
        title: "Procesando orden...",
        text: "Por favor espera unos segundos.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await axios.post(`${API_BASE}/api/orders`, {
        ...form,
        montoCOP,
      });

      Swal.close();

      if (res.data && res.data.ok && res.data.orden && res.data.orden.id) {
        const orden = res.data.orden;

        Swal.fire({
          title: "✅ Orden creada",
          text: `Tu orden #${orden.id} fue registrada exitosamente.`,
          icon: "success",
          showConfirmButton: false,
          timer: 1500,
        });

        setTimeout(() => navigate(`/order/${orden.id}`), 1200);
        setForm({
          nombre: "",
          correo: "",
          banco: "",
          titular: "",
          numero: "",
          montoWLD: "",
        });
      } else {
        Swal.fire("Error", "No se pudo crear la orden", "error");
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "No se pudo conectar con el servidor.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          💱 ChangeWLD
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Convierte tus <b>Worldcoins (WLD)</b> a pesos colombianos (COP)
        </p>

        {/* Campos */}
        <div className="space-y-5">
          {[
            { id: "nombre", label: "Nombre completo" },
            { id: "correo", label: "Correo electrónico", type: "email" },
            { id: "banco", label: "Banco o billetera", select: true },
            { id: "titular", label: "Titular de cuenta" },
            { id: "numero", label: "Número de cuenta o Nequi" },
            { id: "montoWLD", label: "Monto en WLD", type: "number" },
          ].map((field) => (
            <div key={field.id} className="relative">
              {field.select ? (
                <select
                  className="peer w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.banco}
                  onChange={(e) => setForm({ ...form, banco: e.target.value })}
                >
                  <option value="">Selecciona un banco...</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Bancolombia">Bancolombia</option>
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  id={field.id}
                  className="peer w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form[field.id]}
                  onChange={(e) =>
                    setForm({ ...form, [field.id]: e.target.value })
                  }
                  placeholder=" "
                />
              )}
              <label
                htmlFor={field.id}
                className="absolute text-gray-500 text-sm bg-white px-1 transition-all left-3 top-2.5 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-0 peer-focus:text-sm peer-focus:text-indigo-600"
              >
                {field.label}
              </label>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="mt-6 bg-indigo-50 p-4 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-1">
  {rate && rate.ok ? (
    <>
      Tasa actual:{" "}
      <b>
        {rate && rate.wld_cop_usuario
  ? `${Number(rate.wld_cop_usuario).toLocaleString("es-CO")} COP/WLD`
  : "Cargando..."}
      </b>
    </>
  ) : (
    <span className="text-gray-400">Cargando tasa...</span>
  )}
</p>
          <p className="text-lg font-semibold text-indigo-700">
  Recibirás:{" "}
  {rate && rate.wld_cop_usuario && form.montoWLD
    ? Math.round(form.montoWLD * Number(rate.wld_cop_usuario)).toLocaleString("es-CO")
    : 0}{" "}
  <span className="text-gray-700">COP</span>
</p>
        </div>

        <IDKitWidget
  app_id="app_123456789" // tu app_id real desde el panel de Worldcoin Developers
  action="verify-changeWLD"
  onSuccess={(result) => console.log("✅ Verificado:", result)}
  onError={(err) => Swal.fire("Error", "No se pudo verificar identidad", "error")}
  credential_types={["orb", "phone"]}
  autoClose
>
  {({ open }) => (
    <button
      onClick={open}
      className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold"
    >
      Verificar con World ID 🌐
    </button>
  )}
</IDKitWidget>


        {/* Botón */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCrearOrden}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-lg font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Crear orden
        </motion.button>
      </motion.div>
    </div>
  );
}

export default App;
