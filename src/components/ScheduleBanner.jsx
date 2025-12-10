// src/components/ScheduleBanner.jsx
import React, { useMemo } from "react";

// 🇨🇴 Calcula la hora actual de Colombia (UTC-5)
function getColombiaNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const COLOMBIA_OFFSET_MIN = -5 * 60;
  return new Date(utcMs + COLOMBIA_OFFSET_MIN * 60000);
}

function getScheduleStatus() {
  const nowCo = getColombiaNow();
  const day = nowCo.getDay();     // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const hour = nowCo.getHours();
  const minute = nowCo.getMinutes();

  const inRange = (h, m, startH, startM, endH, endM) => {
    const t = h * 60 + m;
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    return t >= start && t < end;
  };

  let abierto = false;
  let detalleHoy = "";

  if (day >= 1 && day <= 5) {
    // Lunes a viernes: 9:00–17:00
    abierto = inRange(hour, minute, 9, 0, 17, 0);
    detalleHoy =
      "Hoy el horario es de 9:00 a. m. a 5:00 p. m. (hora Colombia).";
  } else if (day === 6) {
    // Sábado: 9:00–15:00
    abierto = inRange(hour, minute, 9, 0, 15, 0);
    detalleHoy =
      "Hoy el horario es de 9:00 a. m. a 3:00 p. m. (hora Colombia).";
  } else {
    // Domingo
    abierto = false;
    detalleHoy = "Hoy no prestamos servicio (domingo).";
  }

  return { abierto, detalleHoy };
}

export default function ScheduleBanner() {
  const { abierto, detalleHoy } = useMemo(() => getScheduleStatus(), []);

  return (
    <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              abierto
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/60"
                : "bg-red-600/10 text-red-300 border border-red-500/60"
            }`}
          >
            <span className={abierto ? "animate-pulse" : ""}>●</span>
            {abierto ? "Ahora mismo: abierto" : "Ahora mismo: cerrado"}
          </span>
          <span className="text-xs text-slate-300">{detalleHoy}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 leading-snug">
        Horario general:{" "}
        <strong>Lunes a viernes de 9:00 a. m. a 5:00 p. m.</strong>,{" "}
        <strong>sábados de 9:00 a. m. a 3:00 p. m.</strong>, domingos sin
        servicio. Las órdenes realizadas fuera de ese horario se contabilizan
        para el siguiente día hábil. Las órdenes después de las{" "}
        <strong>5:00 p. m. del viernes</strong> se suman al inventario del
        sábado, y las hechas después de las{" "}
        <strong>3:00 p. m. del sábado</strong> pasan al inventario del lunes.
      </p>
    </div>
  );
}