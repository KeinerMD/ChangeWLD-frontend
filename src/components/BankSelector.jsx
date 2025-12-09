import React, { useState } from "react";
import nequi from "../assets/nequi.webp";
import breb from "../assets/breb.webp";

const banks = [
  {
    id: "Nequi",
    name: "Nequi",
    logo: nequi,
  },
  {
    id: "Llave Bre-B",
    name: "Llave Bre-B",
    logo: breb,
  },
];

export default function BankSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const selected = banks.find((b) => b.id === value);

  return (
    <div className="relative w-full">
      {/* Caja principal */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full border border-neutral-700 rounded-xl px-4 py-3 flex items-center justify-between bg-neutral-900 text-gray-200"
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <img
              src={selected.logo}
              className="w-7 h-7 rounded-full border border-yellow-400/60 bg-white object-contain"
              alt={selected.name}
            />
            <span className="font-medium text-gray-100">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-500">Selecciona un banco...</span>
        )}

        <span className="text-yellow-400 text-xs">▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-neutral-900 shadow-2xl rounded-xl border border-neutral-700">
          {banks.map((bank) => {
            const isActive = bank.id === value;
            return (
              <button
                key={bank.id}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm ${
                  isActive
                    ? "bg-yellow-500/15 border border-yellow-500/60"
                    : "border border-transparent hover:bg-neutral-800"
                }`}
                onClick={() => {
                  onChange(bank.id);
                  setOpen(false);
                }}
              >
                <img
                  src={bank.logo}
                  className="w-8 h-8 rounded-full border border-yellow-400/60 bg-white object-contain"
                  alt={bank.name}
                />
                <span className="text-gray-100">{bank.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
