// src/components/OrderSearch.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { API_BASE } from "../apiConfig";

function formatCOP(n) {
  return Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function statusLabel(estado) {
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
}

export default function OrderSearch({ verificationNullifier, onBack }) {
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [myOrders, setMyOrders] = useState([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);

  // Cargar órdenes del usuario por nullifier
  useEffect(() => {
    const fetchMyOrders = async () => {
      if (!verificationNullifier) return;
      try {
        setLoadingMyOrders(true);
        const res = await axios.get(
          `${API_BASE}/api/orders-by-nullifier`,
          {
            params: { nullifier: verificationNullifier },
          }
        );

        if (res.data?.ok) {
          setMyOrders(res.data.orders || []);
        } else {
          setMyOrders([]);
        }
      } catch (err) {
        console.error("Error cargando órdenes del usuario:", err);
        setMyOrders([]);
      } finally {
        setLoadingMyOrders(false);
      }
    };

    fetchMyOrders();
  }, [verificationNullifier]);

  const handleSearch = async () => {
    const idNumber = Number(searchId);
    if (!searchId || !Number.isFinite(idNumber) || idNumber <= 0) {
      Swal.fire("ID inválido", "Ingresa un número de orden válido.", "warning");
      return;
    }

    try {
      setSearchError(null);
      setSearchResult(null);
      const res = await axios.get(`${API_BASE}/api/orders/${idNumber}`);

      // El backend devuelve directamente la orden
      if (res.data && !res.data.ok) {
        setSearchError(res.data.error || "Orden no encontrada.");
        return;
      }

      setSearchResult(res.data);
    } catch (err) {
      console.error("Error buscando orden:", err);
      if (err.response && err.response.status === 404) {
        setSearchError("Orden no encontrada.");
      } else {
        setSearchError("No se pudo buscar la orden. Inténtalo más tarde.");
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-indigo-700 text-center mb-2">
        🔍 Buscar orden
      </h2>
      <p className="text-xs text-gray-500 text-center mb-4">
        Ingresa el número de tu orden o revisa el historial de órdenes creadas
        con tu cuenta.
      </p>

      {/* Buscar por ID */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          Número de orden
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm"
            placeholder="Ej: 15"
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
          <p className="mt-2 text-xs text-red-500 text-center">
            {searchError}
          </p>
        )}

        {searchResult && (
          <div className="mt-3 bg-indigo-50 rounded-2xl p-3 text-xs text-gray-700">
            <p className="text-[11px] text-gray-500 mb-1">
              Resultado de búsqueda:
            </p>
            <p className="text-sm font-bold text-indigo-700">
              Orden #{searchResult.id} — {statusLabel(searchResult.estado)}
            </p>
            <div className="mt-2 space-y-1">
              <p>
                <b>Monto:</b> {searchResult.montoWLD} WLD →{" "}
                {formatCOP(searchResult.montoCOP)} COP
              </p>
              <p>
                <b>Banco:</b> {searchResult.banco}
              </p>
              <p>
                <b>Titular:</b> {searchResult.titular}
              </p>
              <p>
                <b>Número:</b> {searchResult.numero}
              </p>
              {searchResult.wld_tx_id && (
                <div className="pt-1 text-[10px] text-gray-500">
                  <p className="font-semibold mb-1">Tx World App:</p>
                  <div className="font-mono bg-white/70 rounded-lg px-2 py-1 break-all leading-snug">
                    {searchResult.wld_tx_id}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historial de órdenes del usuario */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Tus últimas órdenes
        </p>

        {!verificationNullifier && (
          <p className="text-xs text-gray-400">
            Debes estar conectado con World App para ver tu historial de
            órdenes.
          </p>
        )}

        {verificationNullifier && loadingMyOrders && (
          <p className="text-xs text-gray-500">Cargando historial...</p>
        )}

        {verificationNullifier && !loadingMyOrders && myOrders.length === 0 && (
          <p className="text-xs text-gray-400">
            No hemos encontrado órdenes asociadas a tu cuenta todavía.
          </p>
        )}

        {verificationNullifier &&
          !loadingMyOrders &&
          myOrders.length > 0 && (
            <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
              {myOrders.map((o) => (
                <div
                  key={o.id}
                  className="border border-gray-200 rounded-xl p-2 text-xs bg-white"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-indigo-700">
                      #{o.id}
                    </span>
                    <span>{statusLabel(o.estado)}</span>
                  </div>
                  <p className="mt-1">
                    {o.montoWLD} WLD → {formatCOP(o.montoCOP)} COP
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {o.banco} · {o.titular}
                  </p>
                </div>
              ))}
            </div>
          )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full border border-gray-300 py-3 rounded-xl text-sm"
      >
        Volver a crear una orden
      </button>
    </div>
  );
}
