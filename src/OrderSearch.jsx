    // src/OrderSearch.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "./apiConfig";

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

export default function OrderSearch({ nullifier, onBack }) {
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Cargar historial del usuario por nullifier
  useEffect(() => {
    const load = async () => {
      if (!nullifier) return;

      try {
        setLoadingList(true);
        const res = await axios.get(`${API_BASE}/api/orders/by-user`, {
          params: { nullifier },
        });
        if (res.data?.ok) {
          setOrders(res.data.orders || []);
        }
      } catch (err) {
        console.error("Error cargando órdenes del usuario:", err);
      } finally {
        setLoadingList(false);
      }
    };

    load();
  }, [nullifier]);

  const handleSearch = async () => {
    setSearchError("");
    setSearchResult(null);

    const idNum = Number(searchId);
    if (!idNum) {
      setSearchError("Ingresa un número de orden válido.");
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/orders/${idNum}`);
      if (res.data && res.data.id) {
        setSearchResult(res.data);
      } else {
        setSearchError("Orden no encontrada.");
      }
    } catch (err) {
      console.error("Error buscando orden:", err);
      setSearchError("Orden no encontrada.");
    }
  };

  return (
    <div>
      <p className="text-center text-gray-500 mb-4">
        Busca el estado de tu orden por número o revisa tu historial reciente.
      </p>

      {/* BUSCAR POR ID */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          Número de orden
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm"
            placeholder="Ej: 123"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            Buscar
          </button>
        </div>
        {searchError && (
          <p className="mt-1 text-xs text-red-500">{searchError}</p>
        )}
      </div>

      {/* RESULTADO DE BÚSQUEDA */}
      {searchResult && (
        <div className="mb-5 bg-indigo-50 rounded-2xl p-4 text-sm">
          <p className="text-xs text-gray-500 mb-1">Resultado de búsqueda</p>
          <p className="text-lg font-bold text-indigo-700">
            Orden #{searchResult.id}
          </p>
          <p className="mt-1">
            <b>Estado:</b> {currentStatusLabel(searchResult.estado)}
          </p>
          <p className="mt-1">
            <b>Monto:</b> {searchResult.montoWLD} WLD →{" "}
            {formatCOP(searchResult.montoCOP)} COP
          </p>
          <p className="mt-1">
            <b>Banco:</b> {searchResult.banco} — {searchResult.titular}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Creada: {searchResult.creada_en}
          </p>
        </div>
      )}

      {/* HISTORIAL DEL USUARIO */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">
            Tus órdenes recientes
          </span>
          {loadingList && (
            <span className="text-[11px] text-gray-400">Cargando...</span>
          )}
        </div>

        {(!nullifier || orders.length === 0) && !loadingList && (
          <p className="text-xs text-gray-500">
            Aún no encontramos órdenes asociadas a este dispositivo.
          </p>
        )}

        <div className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border border-gray-200 rounded-xl p-3 text-xs bg-white"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-indigo-700">#{o.id}</span>
                <span>{currentStatusLabel(o.estado)}</span>
              </div>
              <p>
                {o.montoWLD} WLD →{" "}
                <span className="font-semibold">
                  {formatCOP(o.montoCOP)} COP
                </span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {o.banco} · {o.titular}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* VOLVER */}
      <button
        type="button"
        onClick={onBack}
        className="mt-2 w-full border border-gray-300 py-3 rounded-xl text-sm"
      >
        Volver
      </button>
    </div>
  );
}
