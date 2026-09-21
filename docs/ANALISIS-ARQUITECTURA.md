# Análisis de arquitectura — Monster Hunter Wilds Builder

> Documento generado tras una revisión completa del código fuente actual (`src/app`).
> Objetivo: dejar constancia de cómo está montado el proyecto hoy, qué tan preparado
> está para crecer, y qué cambios concretos propongo para reforzar esa escalabilidad.

## 1. Resumen del stack

- **Angular 19**, componentes *standalone* (sin `NgModule`), con
  `provideExperimentalZonelessChangeDetection()` activado → el estado reactivo se
  apoya en **Signals** (`signal`, `computed`, `effect`) y en `rxResource` para las
  llamadas HTTP, en vez de en `zone.js`.
- **Angular Material** (`MatCard`, `MatSelect`, `MatFormField`, `MatProgressSpinner`,
  `MatDivider`) + `@angular/cdk`, ya integrados y re-estilizados a mano en
  `styles.scss` para encajar con el tema oscuro de Monster Hunter.
- **`@ngx-translate`** (`core` + `http-loader`) para i18n, con diccionarios en
  `public/i18n/{en,es,jp}.json`.
- **`WildsApiService`** como único punto de acceso a `https://wilds.mhdb.io`,
  con un `signal` de idioma (`locale`) que los componentes consumidores usan como
  `request` de su `rxResource` para que los catálogos se recarguen al cambiar idioma.
- No hay librería de estado externa (NgRx, Akita...) — todo el estado vive en
  signals locales de cada componente. Correcto para el tamaño actual.

## 2. Estructura de carpetas actual

```
src/app/
├── app.component.ts/html/scss     # Shell de la app: navbar + switch de "pantallas"
├── app.config.ts                  # Providers globales (router, http, i18n, animations)
├── app.routes.ts                  # Rutas declaradas... pero no usadas realmente (ver §3.1)
├── core/
│   ├── components/navbar/         # Componente scaffold, generado y NUNCA usado
│   ├── models/wilds.models.ts     # Modelos de dominio: ArmorPiece, ArmorSet, Weapon...
│   └── services/wilds-api.service.ts
└── features/
    ├── builder/                   # Constructor de equipo (arma + 5 piezas de armadura)
    └── skill-forge/               # Calculadora de habilidades acumuladas + bonif. de set
```

Es la separación `core` / `features` recomendada en Angular y coincide con lo que
pide `CLAUDE.md`. Con solo dos *features*, hoy es simple y legible. El problema no
es la carpeta en sí, sino varias piezas que quedaron a medio montar dentro de ella
(detalladas abajo).

## 3. Inconsistencias detectadas

Esto no es una lista de "bugs" visibles para el usuario final — la app funciona —
sino de deuda estructural que, si el proyecto crece (más pantallas, más catálogos,
guardado de builds...), se va a notar cada vez más.

### 3.1 El Router está configurado pero no se usa

`app.routes.ts` define una ruta lazy (`loadComponent` hacia `BuilderComponent`) y
`app.config.ts` llama a `provideRouter(routes)`. Pero `app.component.html` **no
tiene `<router-outlet>`**: la navegación real es un `@switch (currentScreen())`
sobre un `signal` en `AppComponent`, que importa `BuilderComponent` y
`SkillForgeComponent` **de forma directa y eager** (no perezosa).

Consecuencia: el *lazy loading* declarado en las rutas no ocurre nunca (ambos
componentes se cargan siempre, estén o no en pantalla), no hay URLs navegables
(`/builder`, `/skill-forge`), no funciona el botón "atrás" del navegador, y no se
puede compartir un enlace directo a una pantalla. Son dos sistemas de navegación
en paralelo, y solo uno de los dos hace algo.

### 3.2 `NavbarComponent` es un componente fantasma

`core/components/navbar/navbar.component.html` todavía tiene el contenido por
defecto de `ng generate component` (`<p>navbar works!</p>`) y no se importa en
ningún sitio. El navbar real (logo, enlaces, selector de idioma) está escrito
directamente dentro de `app.component.html`. Es código muerto que puede confundir
a quien llegue nuevo al proyecto, y además una oportunidad perdida: ese navbar
"real" debería vivir precisamente ahí.

### 3.3 El modelo `Weapon` está duplicado (y uno de los dos usa `any`)

Existe `Weapon` en `core/models/wilds.models.ts` (el modelo "oficial") y una
**segunda copia**, casi idéntica, declarada dentro de
`features/builder/builder.component.ts` — con la diferencia de que esta usa
`slots: any[]`. Eso obliga a castear con `as unknown as Weapon[]` en varios
puntos del componente para reconciliar ambos tipos. `CLAUDE.md` pide TypeScript
estricto sin `any` y modelos centralizados en `core/models` — este archivo
incumple ambas reglas al mismo tiempo, y es fácil que los dos tipos diverjan sin
que nadie se dé cuenta.

### 3.4 No hay `environments/`

La URL base de la API (`https://wilds.mhdb.io`) está *hardcodeada* dentro de
`WildsApiService`. Sin `environment.ts` / `environment.production.ts` no hay
forma limpia de apuntar a un mock, a un proxy propio, o a una versión de
pre-producción de la API sin tocar código fuente.

### 3.5 UI repetida sin componente compartido

`BuilderComponent` y `SkillForgeComponent` reimplementan, cada uno por su lado,
el mismo patrón: un `mat-select` con caja de búsqueda interna (`.select-search-box`,
resuelto además con overrides globales `!important` en `styles.scss` por cómo el
CDK monta el panel fuera del DOM del componente) y el mismo filtrado por
`kind`/texto. `CLAUDE.md` menciona reutilizar componentes de `src/app/shared/`,
pero esa carpeta **no existe todavía**: cada nueva pantalla que necesite "elegir
un ítem de un catálogo con buscador" va a copiar y pegar este patrón de nuevo.

### 3.6 Sin manejo de errores HTTP

`WildsApiService` no aplica `catchError` ni expone un estado de error. Si
`wilds.mhdb.io` cae o devuelve un 5xx, el `rxResource` queda en estado de error
internamente pero ningún componente lo lee ni lo muestra — el usuario solo ve que
el spinner (`cargando`) no llega a completarse, sin ningún mensaje.

### 3.7 Tests solo boilerplate

Los `.spec.ts` existentes son los que genera `ng generate` por defecto (comprueban
que el componente "se crea"). La lógica de negocio real más delicada del proyecto
— `totalDefense`/`totalResistances` en el *builder*, y sobre todo el cálculo de
`habilidadesActivas` y `bonificacionesSet` en *skill-forge* (acumulación de
niveles, detección de bonificaciones de varios sets a la vez) — no tiene ni un
solo test. Es precisamente el tipo de cálculo donde un refactor futuro puede
romper algo sin que nadie lo note hasta producción.

### 3.8 Mezcla de idioma en nombres de código

`CLAUDE.md` pide consistencia en el idioma de nombres de variables/métodos. Hoy
conviven dos convenciones dentro del propio código: `builder.component.ts` nombra
todo en inglés (`selectedWeapon`, `totalDefense`, `filterArmorBySlot`), mientras
que `skill-forge.component.ts` nombra en castellano
(`habilidadesActivas`, `bonificacionesSet`, `filterArmorBySlot` es la excepción
mixta). No es un error funcional, pero si el proyecto sigue creciendo con más
gente tocando código, conviene fijar un único criterio.

## 4. ¿Qué tan preparado está para escalar?

**Lo que ya está bien pensado:**
- La separación `core`/`features` y el uso de Signals + `rxResource` es una base
  moderna y correcta; añadir una tercera *feature* (p. ej. un comparador de armas)
  encaja de forma natural en `features/`.
- Centralizar todas las llamadas HTTP en `WildsApiService` (en vez de que cada
  componente llame a `HttpClient` directamente) es la decisión correcta y ya
  facilita que el idioma se propague solo.
- El patrón de "persistir selección al cambiar idioma" (`effect` + búsqueda por
  `id` estable) está bien resuelto y es reutilizable como idea en features nuevas.

**Lo que va a doler si el proyecto crece sin tocarlo:**
- Cada pantalla nueva con lógica de navegación tendrá que decidir si sigue el
  patrón `@switch` de `AppComponent` (no escala: ese componente se convertiría en
  un "dios" que conoce todas las pantallas) o empieza a usar el Router — hoy
  conviven ambos enfoques a medias.
- Sin `shared/`, cada *feature* nueva con un selector de catálogo copiará y pegará
  el `mat-select` con buscador otra vez.
- En cuanto se quiera **guardar builds** (favoritos, compartir por URL, comparar
  dos sets), va a hacer falta algo de estado más allá del signal local de un
  componente — hoy no hay ningún sitio natural donde ponerlo (no hay
  `BuildStore`/servicio de persistencia).
- Sin tests de la lógica de cálculo, cada cambio en las reglas de negocio
  (por ejemplo, cómo se combinan las bonificaciones de set) es un cambio a ciegas.

## 5. Qué podría hacer yo para mejorar la estructura

Propuesta ordenada por impacto/riesgo (de menor a mayor), para decidir juntos por
dónde empezar — ninguno de estos cambios se ha aplicado todavía:

1. **Unificar el modelo `Weapon`**: eliminar la copia duplicada en
   `builder.component.ts`, usar solo `core/models/wilds.models.ts`, tipar bien
   `slots` (según lo que devuelva realmente la API) y quitar los
   `as unknown as Weapon[]`.
2. **Crear `environments/environment.ts`** y mover ahí `apiRoot`, para poder
   apuntar la app a otro backend sin tocar `WildsApiService`.
3. **Añadir manejo de errores en `WildsApiService`** (`catchError`) y exponer un
   estado de error que `BuilderComponent`/`SkillForgeComponent` puedan mostrar en
   vez de un spinner infinito.
4. **Extraer un componente compartido** (`shared/components/selector-buscable/` o
   similar) que encapsule el `mat-select` + caja de búsqueda + filtrado, y
   sustituir la lógica duplicada de *builder* y *skill-forge* por él.
5. **Activar el Router de verdad**: mover el navbar real a
   `core/components/navbar` (o borrarlo si se prefiere mantener el `@switch`,
   pero entonces borrando también `app.routes.ts` y el `provideRouter` para no
   dejar código muerto), añadir `<router-outlet>` y rutas reales para
   `/builder` y `/skill-forge`, recuperando lazy loading real y URLs navegables.
6. **Tests de la lógica de cálculo**: cubrir `totalDefense`/`totalResistances` en
   el *builder* y, sobre todo, `habilidadesActivas`/`bonificacionesSet` en
   *skill-forge* (incluyendo el caso de dos o más sets activos a la vez).
7. **Fijar y documentar un criterio único de idioma** para nombres de variables y
   métodos en el código nuevo (recomendación: castellano, ya que es el idioma
   principal del proyecto según `CLAUDE.md`), y homogeneizar poco a poco el código
   existente.

Ninguno de estos cambios es urgente para que la app funcione hoy — son ajustes
de fondo para que el proyecto aguante bien el crecimiento que se plantea
(más pantallas, más catálogos, guardado de builds). Dime cuáles quieres que
aborde y en qué orden, y voy directo a por ellos.
