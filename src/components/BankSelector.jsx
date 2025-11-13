import React, { useState } from "react";
import nequi from "../assets/nequi.png";
import breb from "../assets/breb.png";

const banks = [
  {
    id: "Nequi",
    name: "Nequi",
    logo: nequi,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "Llave Bre-B",
    name: "Llave Bre-B",
    logo: breb,
    color: "from-blue-500 to-cyan-500",
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
        className="w-full border border-gray-300 rounded-xl px-4 py-3 flex items-center justify-between bg-white shadow-sm"
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <img src={selected.logo} className="w-7 h-7 rounded-full" />
            <span className="font-medium text-gray-800">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Selecciona un banco...</span>
        )}

        <span className="text-gray-500">▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white shadow-xl rounded-xl border border-gray-200">
          {banks.map((bank) => (
            <button
              key={bank.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition rounded-xl"
              onClick={() => {
                onChange(bank.id);
                setOpen(false);
              }}
            >
              <img src={bank.logo} className="w-8 h-8 rounded-full" />
              <span className="text-gray-800">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
