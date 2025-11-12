// 🔗 Configuración base de la API — producción + desarrollo
export const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://changewld-backend-1.onrender.com";