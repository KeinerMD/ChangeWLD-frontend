// src/pages/AdminPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from "../apiConfig";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

function AdminPage() {
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7d");
  const [autoRefreshMs, setAutoRefreshMs] = useState(5000);

  // ===== META DE ESTADOS =====
  const STATUS_META = {
    pendiente: {
      label: "Pendientes",
      short: "Pendiente",
      colorPill: "bg-yellow-500",
      colorBadge: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: "🕒",
    },
    enviada: {
      label: "Enviadas",
      short: "Enviada",
      colorPill: "bg-blue-500",
      colorBadge: "bg-blue-100 text-blue-800 border-blue-300",
      icon: "📤",
    },
    recibida_wld: {
      label: "WLD Recibidos",
      short: "WLD Recibidos",
      colorPill: "bg-purple-500",
      colorBadge: "bg-purple-100 text-purple-800 border-purple-300",
      icon: "🟣",
    },
    pagada: {
      label: "Pagadas",
      short: "Pagada",
      colorPill: "bg-green-500",
      colorBadge: "bg-green-100 text-green-800 border-green-300",
      icon: "💸",
    },
    rechazada: {
      label: "Rechazadas",
      short: "Rechazada",
      colorPill: "bg-red-500",
      colorBadge: "bg-red-100 text-red-800 border-red-300",
      icon: "❌",
    },
  };

  const STATUS_ORDER = [
    "pendiente",
    "enviada",
    "recibida_wld",
    "pagada",
    "rechazada",
  ];

  // ===== COPIAR NÚMERO DE CUENTA =====
  const copyToClipboard = async (texto, label = "Texto copiado") => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(texto || ""));
        Swal.fire({
          toast: true,
          position: "top",
          timer: 1200,
          showConfirmButton: false,
          icon: "success",
          title: label,
        });
      } else {
        throw new Error("Clipboard no disponible");
      }
    } catch (err) {
      console.error("Error al copiar:", err);
      Swal.fire("Error", "No se pudo copiar al portapapeles.", "error");
    }
  };

  // ===== CARGAR ÓRDENES (usa POST con PIN en body) =====
  const loadOrders = async (p, silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await axios.post(`${API_BASE}/api/orders-admin`, {
        pin: p,
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setOrders(data);
      setAuthed(true);
    } catch (err) {
      console.error("Error cargando órdenes:", err?.response || err);
      if (!silent) {
        Swal.fire(
          "Error",
          "PIN inválido o servidor no disponible.",
          "error"
        );
      }
      setAuthed(false);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!pin.trim()) {
      Swal.fire("PIN requerido", "Ingresa el PIN del operador.", "warning");
      return;
    }
    await loadOrders(pin.trim());
  };

  // ===== CAMBIO DE ESTADO =====
  const handleChangeEstado = async (id, estado) => {
    const meta = STATUS_META[estado];
    const label = meta?.short || estado.toUpperCase();

    const confirm = await Swal.fire({
      title: `Cambiar estado a "${label}"`,
      text: `¿Seguro que quieres marcar la orden #${id} como ${label}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
      confirmButtonColor:
        estado === "rechazada"
          ? "#dc2626"
          : estado === "pagada"
          ? "#16a34a"
          : "#2563eb",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.put(
        `${API_BASE}/api/orders/${id}/estado`,
        { estado },
        {
          headers: {
            "x-admin-pin": pin, // 🔐 va en header, no en la URL
          },
        }
      );

      if (res.data.ok) {
        Swal.fire({
          title: "✅ Estado actualizado",
          text: `Orden #${id} → ${label}`,
          icon: "success",
          timer: 1300,
          showConfirmButton: false,
        });
        await loadOrders(pin, true); // recarga silenciosa
      } else {
        Swal.fire(
          "Error",
          res.data.error || "No se pudo actualizar la orden.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
      Swal.fire(
        "Error",
        "No se pudo realizar la actualización de estado.",
        "error"
      );
    }
  };

  // ===== AUTO-REFRESH =====
  useEffect(() => {
    if (!authed || !pin) return;

    const interval = setInterval(() => {
      loadOrders(pin, true);
    }, autoRefreshMs);

    return () => clearInterval(interval);
  }, [authed, pin, autoRefreshMs]);

  // ===== FORMATEADORES =====
  const formatDateTime = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Fecha inválida";
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Fecha inválida";
    return d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      weekday: "short",
    });
  };

  const isInDateFilter = (orden) => {
    if (!orden.creada_en) return true;
    const created = new Date(orden.creada_en).getTime();
    if (Number.isNaN(created)) return true;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (dateFilter === "today") {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime();
      const end = start + oneDay;
      return created >= start && created < end;
    }

    if (dateFilter === "yesterday") {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      ).getTime();
      const end = start + oneDay;
      return created >= start && created < end;
    }

    if (dateFilter === "7d") {
      return created >= now - 7 * oneDay;
    }

    return true; // "all"
  };

  // ===== FILTRADO & AGRUPACIÓN =====
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // Filtro por estado
    if (statusFilter !== "all") {
      list = list.filter((o) => o.estado === statusFilter);
    }

    // Filtro por fecha
    list = list.filter((o) => isInDateFilter(o));

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((o) => {
        const id = String(o.id || "").toLowerCase();
        const nombre = String(o.nombre || "").toLowerCase();
        const banco = String(o.banco || "").toLowerCase();
        const titular = String(o.titular || "").toLowerCase();
        const numero = String(o.numero || "").toLowerCase();
        return (
          id.includes(q) ||
          nombre.includes(q) ||
          banco.includes(q) ||
          titular.includes(q) ||
          numero.includes(q)
        );
      });
    }

    // Ordenar por fecha descendente (más nuevas primero)
    list.sort((a, b) => {
      const da = new Date(a.creada_en || a.actualizada_en || 0).getTime();
      const db = new Date(b.creada_en || b.actualizada_en || 0).getTime();
      return db - da;
    });

    return list;
  }, [orders, statusFilter, dateFilter, searchTerm]);

  // Agrupar por día y luego por estado
  const groupedByDay = useMemo(() => {
    const map = {};

    filteredOrders.forEach((o) => {
      const key = o.creada_en
        ? new Date(o.creada_en).toDateString()
        : "sin-fecha";
      if (!map[key]) {
        map[key] = {
          dateKey: key,
          display: formatDateOnly(o.creada_en),
          orders: [],
        };
      }
      map[key].orders.push(o);
    });

    const groups = Object.values(map);

    // Ordenar días (más recientes primero)
    groups.sort((a, b) => {
      const da = new Date(a.orders[0]?.creada_en || 0).getTime();
      const db = new Date(b.orders[0]?.creada_en || 0).getTime();
      return db - da;
    });

    // Dentro de cada día agrupar por estado
    return groups.map((g) => {
      const byStatus = {};
      g.orders.forEach((o) => {
        if (!byStatus[o.estado]) byStatus[o.estado] = [];
        byStatus[o.estado].push(o);
      });
      return { ...g, byStatus };
    });
  }, [filteredOrders]);

  // ===== ESTADÍSTICAS =====
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    let totalToday = 0;
    let totalWldToday = 0;
    let totalCopToday = 0;

    orders.forEach((o) => {
      const dStr = new Date(o.creada_en || 0).toDateString();
      if (dStr === todayStr) {
        totalToday += 1;
        totalWldToday += Number(o.montoWLD || 0);
        totalCopToday += Number(o.montoCOP || 0);
      }
    });

    const totalPendientes = orders.filter(
      (o) => o.estado === "pendiente"
    ).length;
    const totalPagadas = orders.filter((o) => o.estado === "pagada").length;

    return {
      totalToday,
      totalWldToday,
      totalCopToday,
      totalPendientes,
      totalPagadas,
    };
  }, [orders]);

  // ===== RENDER LOGIN =====
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700"
        >
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            ⚙️ Panel Operador — ChangeWLD
          </h1>
          <p className="text-slate-400 text-center mb-6 text-sm">
            Ingresa el{" "}
            <span className="font-semibold text-indigo-300">
              PIN de operador
            </span>{" "}
            para ver y gestionar las órdenes.
          </p>
          <input
            type="password"
            className="w-full mb-4 rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
          >
            Entrar al panel
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-4">
            Cambia el PIN desde tu archivo <code>.env</code> del backend
            (<code>OPERATOR_PIN</code>).
          </p>
        </motion.div>
      </div>
    );
  }

  // ===== RENDER PANEL =====
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-10">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 text-2xl">◆</span> ChangeWLD —
              Panel Operador PRO
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Control en tiempo real de órdenes de cambio WLD → COP.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center justify-end text-xs md:text-sm">
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
              🔐 PIN:{" "}
              <span className="font-mono text-green-400 tracking-widest">
                {pin}
              </span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 flex items-center gap-2">
              🔄 Auto-refresh:
              <select
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
                value={autoRefreshMs}
                onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
              >
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>60s</option>
              </select>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-4 space-y-6">
        {/* STATS */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Órdenes de hoy</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalToday}
              <span className="text-xs text-slate-500 ml-1">orden(es)</span>
            </p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">WLD procesados hoy</p>
            <p className="text-2xl font-bold text-indigo-300">
              {stats.totalWldToday.toFixed(4)}
              <span className="text-xs text-slate-500 ml-1">WLD</span>
            </p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 mb-1">COP enviados hoy</p>
            <p className="text-2xl font-bold text-emerald-300">
              {stats.totalCopToday.toLocaleString("es-CO")}
              <span className="text-xs text-slate-500 ml-1">COP</span>
            </p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
            <p className="text-xs text-slate-400 mb-1">Resumen global</p>
            <p className="text-sm text-slate-300">
              🟡 Pendientes:{" "}
              <span className="font-semibold text-yellow-300">
                {stats.totalPendientes}
              </span>
            </p>
            <p className="text-sm text-slate-300">
              💸 Pagadas:{" "}
              <span className="font-semibold text-emerald-300">
                {stats.totalPagadas}
              </span>
            </p>
          </div>
        </section>

        {/* FILTROS */}
        <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                🔍
              </span>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Buscar por ID, nombre, banco o número de cuenta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs md:text-[11px]">
            <select
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Estado: Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="enviada">Enviada</option>
              <option value="recibida_wld">WLD recibidos</option>
              <option value="pagada">Pagada</option>
              <option value="rechazada">Rechazada</option>
            </select>

            <select
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="7d">Últimos 7 días</option>
              <option value="all">Todas las fechas</option>
            </select>

            <button
              onClick={() => loadOrders(pin, false)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-200 flex items-center gap-1"
            >
              🔄 Actualizar
            </button>
          </div>
        </section>

        {/* LISTADO AGRUPADO */}
        <section className="space-y-4">
          {loading && (
            <p className="text-slate-400 text-sm">Cargando órdenes...</p>
          )}

          {!loading && filteredOrders.length === 0 && (
            <p className="text-slate-500 text-sm text-center mt-4">
              No hay órdenes que coincidan con los filtros actuales.
            </p>
          )}

          <AnimatePresence>
            {groupedByDay.map((group) => (
              <motion.div
                key={group.dateKey}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden"
              >
                {/* HEADER DE DÍA */}
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">📅</span>
                    <h2 className="text-sm font-semibold text-slate-100">
                      {group.display}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    {group.orders.length} orden(es)
                  </span>
                </div>

                {/* AGRUPADO POR ESTADO */}
                <div className="p-4 space-y-4">
                  {STATUS_ORDER.map((estadoKey) => {
                    const list = group.byStatus[estadoKey] || [];
                    if (!list.length) return null;

                    const meta = STATUS_META[estadoKey];

                    return (
                      <div
                        key={estadoKey}
                        className={`rounded-xl border ${
                          estadoKey === "pendiente"
                            ? "border-yellow-500/70 bg-yellow-500/5"
                            : "border-slate-800 bg-slate-900/60"
                        }`}
                      >
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{meta?.icon || "●"}</span>
                            <span className="text-xs font-semibold text-slate-100">
                              {meta?.label || estadoKey.toUpperCase()}{" "}
                              <span className="text-slate-500">
                                ({list.length})
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-800">
                          {list.map((o) => (
                            <div
                              key={o.id}
                              className="px-3 py-3 flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between"
                            >
                              {/* INFO IZQUIERDA */}
                              <div className="flex-1 min-w-0">
                                {/* ID + nombre */}
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs text-slate-500">
                                    #{o.id}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-100 truncate max-w-[220px] md:max-w-xs">
                                    {o.nombre || o.titular}
                                  </span>
                                </div>

                                {/* Monto */}
                                <p className="text-xs text-slate-400 mb-1">
                                  {o.montoWLD} WLD →{" "}
                                  <span className="font-semibold text-indigo-300">
                                    {Number(o.montoCOP || 0).toLocaleString(
                                      "es-CO"
                                    )}{" "}
                                    COP
                                  </span>
                                </p>

                                {/* BLOQUE BANCO + CUENTA (GRANDE) */}
                                <div className="mt-2 bg-slate-950/60 border border-indigo-500/50 rounded-xl px-3 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                  <div className="text-xs text-slate-200">
                                    <p className="font-semibold text-indigo-300 text-[11px] uppercase tracking-wide">
                                      {o.banco || "Banco / Billetera"}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      Titular:{" "}
                                      <span className="text-slate-100">
                                        {o.titular}
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      Número:{" "}
                                      <span className="font-mono text-slate-50 text-[11px]">
                                        {o.numero}
                                      </span>
                                    </p>
                                  </div>

                                  <div className="flex flex-row md:flex-col gap-2 md:items-end mt-1 md:mt-0">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          o.numero,
                                          "Número de cuenta copiado"
                                        )
                                      }
                                      className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
                                    >
                                      📋 Copiar número
                                    </button>
                                  </div>
                                </div>

                                {/* FECHAS + WORLD ID + TX */}
                                <div className="mt-2 space-y-0.5">
                                  <p className="text-[11px] text-slate-500">
                                    Creada: {formatDateTime(o.creada_en)}{" "}
                                    {o.actualizada_en &&
                                      o.actualizada_en !== o.creada_en && (
                                        <>
                                          • Actualizada:{" "}
                                          {formatDateTime(o.actualizada_en)}
                                        </>
                                      )}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    World ID:{" "}
                                    {o.verified ? (
                                      <span className="text-emerald-400 font-semibold">
                                        ✔ Verificado
                                      </span>
                                    ) : (
                                      <span className="text-red-400 font-semibold">
                                        ✖ Sin verificación
                                      </span>
                                    )}
                                  </p>
                                  {o.wld_tx_id && (
                                    <p className="text-[11px] text-slate-500 break-all">
                                      Tx World App:{" "}
                                      <span className="font-mono">
                                        {o.wld_tx_id}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* ESTADO + ACCIONES */}
                              <div className="flex flex-col items-end gap-2 mt-1 md:mt-0 md:w-64">
                                {/* Badge de estado */}
                                <span
                                  className={`px-3 py-1 border text-[11px] rounded-full font-semibold ${
                                    STATUS_META[o.estado]?.colorBadge ||
                                    "bg-slate-200 text-slate-900 border-slate-300"
                                  }`}
                                >
                                  {STATUS_META[o.estado]?.short ||
                                    o.estado.toUpperCase()}
                                </span>

                                {/* Botones de siguiente estado (más grandes) */}
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {getNextStates(o.estado).map(
                                    (estadoSig) => {
                                      const m = STATUS_META[estadoSig];
                                      const labelBtn =
                                        m?.short ||
                                        estadoSig.toUpperCase();
                                      const base =
                                        estadoSig === "pagada"
                                          ? "bg-emerald-600 hover:bg-emerald-500"
                                          : estadoSig === "rechazada"
                                          ? "bg-red-600 hover:bg-red-500"
                                          : "bg-sky-600 hover:bg-sky-500";

                                      return (
                                        <button
                                          key={estadoSig}
                                          onClick={() =>
                                            handleChangeEstado(
                                              o.id,
                                              estadoSig
                                            )
                                          }
                                          className={`${base} text-white text-[11px] md:text-xs font-semibold px-3 md:px-4 py-1.5 rounded-lg transition-all`}
                                        >
                                          {labelBtn}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );

  // ===== LÓGICA DE SIGUIENTES ESTADOS =====
  function getNextStates(estado) {
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
  }
}

export default AdminPage;
