// 🌐 Configuración de entorno para producción (`ng build --configuration production`).
// Hoy apunta a la misma API pública que desarrollo, pero al vivir en un fichero
// aparte se puede cambiar (proxy propio, otra URL, feature flags...) sin tocar
// código de la aplicación.
export const environment = {
  production: true,
  apiRoot: 'https://wilds.mhdb.io'
};
