# 📖 Bestiario de bolsillo — Requisitos (archivo TEMPORAL)

> ⚠️ Este archivo es temporal: se borrará antes de subir a producción (`master`), cuando se dé el aprobado.
> Rama: `feature/bestiario-bolsillo` (sale de `desarrollo`).
>
> Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `❓` pendiente de confirmar por el usuario

---

## 🎨 Diseño general
- [x] Estética de **libro antiguo** integrada con el tema oscuro/dorado: tapa de cuero con filete dorado, lomo cosido, página de pergamino oscuro, marcapáginas de tela, letra capitular y animación de "pasar página".
- [x] Sin librerías de UI nuevas; se reutilizan variables, mixins (`responsive`) y componentes existentes (`app-selector-buscable`, `app-en-desarrollo`).
- [x] Textos traducidos con ngx-translate (es / en / jp).
- [x] Datos de la API en el idioma actual y recargados al cambiar de idioma (sin perder el monstruo elegido).
- [x] Iconos: los emojis que ya usa la app para elementos y estados (`ICONOS_ELEMENTO` / `ICONOS_ESTADO`), ampliados para efectos y plagas.

## 🖥️ Escritorio / tablet
- [x] Estado inicial: todos los monstruos **centrados** (medallón + nombre).
- [x] Corrección: todas las fichas del índice con el mismo alto y ancho (el de la más grande, Anjanath Fulgúreo Guardián).
- [x] Al seleccionar un monstruo: la lista pasa a la **izquierda** (columna fija con scroll propio) y se abre la **tarjeta** a la derecha.
- [x] Se puede cambiar de monstruo desde la lista y cerrar la tarjeta (×).

## 📱 Móvil
- [x] Desplegable con buscador (el mismo que el de armas del Constructor), con la imagen de cada monstruo.
- [x] Al elegir monstruo, la tarjeta se rellena **debajo**.
- [x] Sin scroll horizontal de página (la tabla de zonas de daño se desplaza dentro de su caja).

## 🃏 Tarjeta (común a todas las pantallas)
- [x] Nombre del monstruo centrado arriba.
- [x] Foto del monstruo centrada debajo del nombre (34/34 imágenes).
- [x] Navegación entre las 4 pantallas: marcapáginas arriba + flechas ‹ › con folio (I / IV) abajo.

### Pantalla 1 — Crónica
- [x] Especie (traducida).
- [x] Hábitat, con número de zonas.
- [x] Estados/plagas que aplica ("No aplica" si no aplica). Tabla manual: la API los trae vacíos en los 34 monstruos.
- [x] Corrección: los estados se nombran por el elemento a secas (Fuego, Agua, Rayo, Hielo, Draco) y Nitro aparte. Solo Ajarakan aplica Fuego + Nitro; Gogmazios solo Fuego.
- [x] Variantes (curtido, archicurtido...).
- [x] Descripción, Ecología (`features`) y Consejos de caza (`tips`).
- ❓ Revisar los estados de los que no estoy 100 % seguro: **Zoh Shia** (nitro de draco), **Lala Barina** (parálisis), **Gogmazios** (fuego), y los que he dejado en "No aplica": **Balahara, Xu Wu, Omega Planetes, Chatacabra, Doshaguma (y Guardián)**. Se editan en `ESTADOS_QUE_APLICA` (`bestiario.datos.ts`).

### Pantalla 2 — Debilidades
- [x] Tabla con TODOS los elementos, estados y efectos (nombre + icono) y notas de condición de la API debajo.
- [x] Corrección: sin debilidad = ★ de base, y una estrella más por cada nivel de la API (hasta ★★★★); "✕ Resiste" se mantiene.
- [x] Zonas de daño (multiplicadores de cada parte) con las zonas débiles resaltadas.

### Pantalla 3 — Partes
- [x] Tabla de partes: rompible / cortable / esencia de kinsecto (sin vida de partes).
- [x] Rompibles = partes con recompensa de rotura; cortable = la cola (o tentáculos si no hay cola) cuando hay recompensas de corte.
- [x] Materiales con interruptor **Rango bajo / Rango alto** (alto por defecto).
- [x] Corrección: "Vientre" → "Pecho"; sin formas de obtener de zonas podridas; "Tallar" → "Desollar".

### ~~Pantalla 4 — Especial~~
- [x] Corrección: eliminada; Armas y armaduras pasa a ser la pantalla 4.

### Pantalla 4 — Armas y armaduras
- [x] Dos columnas: armas (agrupadas por tipo, orden del juego) | armaduras (agrupadas por conjunto). Solo descriptivo.
- [x] Todas las que usan algún material del monstruo.

## 🌐 Datos / API
- [x] Sin caché en localStorage.
- [x] Llamadas bajo demanda: lista ligera (~3 KB) → ficha al seleccionar → armas + armaduras solo al abrir la pantalla 4 (no se repiten al volver a ella).
- [x] Modelos tipados en `src/app/core/models/monster.models.ts`.
- [x] Tests de la lógica en `bestiario.datos.spec.ts`.

## ✅ Antes de subir a producción
- [ ] Aprobado del usuario tras probar en `desarrollo`.
- [ ] Borrar este archivo.
