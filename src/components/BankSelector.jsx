import React from "react";
import nequiLogo from "../assets/nequi.png";
import brebLogo from "../assets/breb.png";

export default function BankSelector({ value, onChange }) {
  const banks = [
    {
      id: "Nequi",
      name: "Nequi",
      logo: nequiLogo,
      bg: "from-pink-500 to-purple-600",
    },
    {
      id: "BRE-B",
      name: "Llave BRE-B",
      logo: brebLogo,
      bg: "from-blue-600 to-cyan-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {banks.map((bank) => (
        <button
          key={bank.id}
          onClick={() => onChange(bank.id)}
          className={`
            flex flex-col items-center justify-center gap-2 p-4 rounded-2xl shadow-md 
            bg-gradient-to-br ${bank.bg} text-white transition transform hover:scale-105
            ${value === bank.id ? "ring-4 ring-yellow-300" : ""}
          `}
        >
          <img src={bank.logo} alt={bank.name} className="w-14 h-14 object-contain" />
          <span className="font-semibold text-sm">{bank.name}</span>
        </button>
      ))}
    </div>
  );
}
