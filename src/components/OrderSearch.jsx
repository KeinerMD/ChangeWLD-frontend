// src/components/OrderSearch.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../apiConfig";

export default function OrderSearch({ onBack, currentWallet }) {
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // 🔎 Buscar por ID (siempre disponible, con o sin wallet)
  const handleSearchById = async () => {
    const idNumber = Number(searchId);

    if (!searchId || !Number.isFinite(idNumber) || idNumber <= 0) {
      setSearchError("Ingresa un número de orden válido.");
      setSearchResult(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await axios.get(`${API_BASE}/api/orders/${idNumber}`);

      // Éxito: el backend devuelve el documento de la orden (sin campo ok)
      setSearchResult(res.data);
    } catch (err) {
      console.error("Error buscando orden por ID:", err);
      if (err.response?.status === 404) {
        setSearchError("Orden no encontrada. Verifica el número.");
      } else {
        setSearchError(
          err.response?.data?.error ||
            "No se pudo buscar la orden. Intenta más tarde."
        );
      }
    } finally {
      setSearching(false);
    }
  };

  // 📜 Cargar historial por wallet (solo si hay wallet)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentWallet) {
        setHistory([]);
        setHistoryError(
          "Debes estar conectado con tu World App para ver tu historial."
        );
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const res = await axios.get(`${API_BASE}/api/orders-by-wallet`, {
          params: { wallet: currentWallet },
        });

        if (res.data?.ok) {
          setHistory(res.data.orders || []);
        } else {
          setHistory([]);
          setHistoryError(
            res.data?.error || "No se pudo cargar tu historial de órdenes."
          );
        }
      } catch (err) {
        console.error("Error cargando historial:", err);
        setHistory([]);
        setHistoryError(
          err.response?.data?.error ||
            "No se pudo cargar tu historial de órdenes."
        );
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [currentWallet]);

  const formatCOP = (n) =>
    Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const statusLabel = (estado) => {
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
        return estado || "⏳ Pendiente";
    }
  };

  return (
    <div>
      {/* HEADER BUSCAR ORDEN */}
      <div className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-indigo-600 underline mb-2"
        >
          ← Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-800 text-center">
          Buscar orden
        </h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          Ingresa el número de tu orden o revisa tus últimas transacciones.
        </p>
      </div>

      {/* BUSCADOR POR ID */}
      <div className="mb-5 border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2">
          Buscar por número de orden
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"
            placeholder="Ej: 15"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSearchById}
            disabled={searching}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {searchError && (
          <p className="mt-2 text-xs text-red-500">{searchError}</p>
        )}

        {searchResult && (
          <div className="mt-3 bg-indigo-50 rounded-xl px-3 py-3 text-xs text-gray-700">
            <p className="text-[11px] text-gray-500 mb-1">
              Resultado de la búsqueda
            </p>
            <p>
              <b>Orden #</b> {searchResult.id}
            </p>
            <p>
              <b>Estado:</b> {statusLabel(searchResult.estado)}
            </p>
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
          </div>
        )}
      </div>

      {/* HISTORIAL POR WALLET */}
      <div className="border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2">
          Tus últimas órdenes
        </p>

        {!currentWallet && (
          <p className="text-xs text-red-500">
            Debes estar conectado con tu World App para ver tu historial.
          </p>
        )}

        {currentWallet && (
          <>
            {historyLoading && (
              <p className="text-xs text-gray-500">Cargando historial...</p>
            )}

            {historyError && (
              <p className="text-xs text-red-500 mt-1">{historyError}</p>
            )}

            {!historyLoading && !historyError && history.length === 0 && (
              <p className="text-xs text-gray-500">
                No tienes órdenes registradas con esta cuenta todavía.
              </p>
            )}

            {!historyLoading && history.length > 0 && (
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                {history.map((o) => (
                  <div
                    key={o.id}
                    className="bg-slate-50 rounded-lg px-3 py-2 text-[11px]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800">
                        Orden #{o.id}
                      </span>
                      <span className="text-[10px]">
                        {statusLabel(o.estado)}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600">
                      {o.montoWLD} WLD → {formatCOP(o.montoCOP)} COP
                    </p>
                    <p className="text-gray-500">
                      {o.banco} · {o.titular}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
