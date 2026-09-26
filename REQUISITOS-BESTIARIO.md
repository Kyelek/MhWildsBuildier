# 📖 Bestiario de bolsillo — Requisitos (archivo TEMPORAL)

> ⚠️ Este archivo es temporal: se borrará antes de subir a producción (`master`), cuando se dé el aprobado.
> Rama: `feature/bestiario-bolsillo` (sale de `desarrollo`).
>
> Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `❓` pendiente de decisión

---

## 🎨 Diseño general
- [ ] Estética de **libro antiguo** (pergamino, tapas, lomo, páginas) integrada con el tema oscuro/dorado de la app (Cinzel/Montserrat, dorado `#c5a059`).
- [ ] Sin librerías de UI nuevas; reutilizar variables y mixins (`responsive`, etc.).
- [ ] Textos traducidos con ngx-translate (es / en / jp).
- [ ] Datos de la API pedidos en el idioma actual (`locale`) y recargados al cambiar de idioma.

## 🖥️ Escritorio / tablet
- [ ] Estado inicial: todos los monstruos **centrados** en pantalla (retrato + nombre).
- [ ] Al seleccionar un monstruo: la lista pasa a la **izquierda** y se abre la **tarjeta** a la derecha (con transición).
- [ ] Se puede cambiar de monstruo desde la lista de la izquierda y cerrar la tarjeta.

## 📱 Móvil
- [ ] Desplegable de monstruos al estilo del selector de armas (buscable).
- [ ] Al elegir monstruo, la tarjeta se rellena **debajo** del desplegable.

## 🃏 Tarjeta (común a todas las pantallas)
- [ ] Nombre del monstruo centrado arriba.
- [ ] Foto del monstruo centrada debajo del nombre (`public/images/monsters`).
- [ ] Navegación entre las 5 pantallas (pestañas / "pasar página").

### Pantalla 1 — Datos generales
- [ ] Especie (API `species`, traducida).
- [ ] Hábitat (API `locations`).
- [ ] Estados/plagas que aplica (si no aplica → "No aplica"). ❓ *La API los devuelve vacíos para los 34 monstruos (ver preguntas).*
- [ ] Breve descripción (API `description`).

### Pantalla 2 — Debilidades elementales / estados
- [ ] Título centrado "Debilidades elementales / estados".
- [ ] Tabla con TODOS los elementos y estados, con nombre + icono. ❓ *No hay iconos en el proyecto (ver preguntas).*

### Pantalla 3 — Partes cortables / rompibles
- [ ] Título centrado "Partes cortables / rompibles".
- [ ] Tabla de partes.

### Pantalla 4 — Especial
- [ ] Componente "En construcción" (reutilizar `app-en-desarrollo`).

### Pantalla 5 — Armaduras y armas
- [ ] Dos columnas: armas | armaduras relacionadas con el monstruo según los materiales que suelta.

## 🌐 Datos / API
- [ ] Sin caché en localStorage (esta vez no se guarda nada).
- [ ] Llamadas bajo demanda:
  - Lista de monstruos: 1 llamada ligera (solo `id` + `name`, con proyección `p`).
  - Detalle del monstruo: 1 llamada al seleccionarlo (`/monsters/{id}`).
  - Armas y armaduras: 2 llamadas filtradas en la propia API por los materiales del monstruo, solo al abrir la pantalla 5.
- [ ] Modelos tipados en `src/app/core/models/`.

## ❓ Preguntas abiertas
1. Estados/plagas que aplica: la API no los trae. ¿Tabla manual en el código, o quitar el apartado?
2. Iconos de elementos/estados: no existen en el proyecto. ¿Los aportas tú o los dibujo en SVG?
3. Partes rompibles/cortables: la API no las marca explícitamente; se deducen de las recompensas.
4. Armas/armaduras relacionadas: ¿todas las que usan algún material del monstruo, o solo las de su "serie"?
5. Faltan imágenes de **Gore Magala** y **Rathalos**.
6. Datos extra que trae la API y no están en el listado (ver respuesta en el chat).
