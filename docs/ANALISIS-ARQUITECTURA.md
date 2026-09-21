# Análisis de arquitectura — Monster Hunter Wilds Builder

> Documento generado tras una revisión completa del código fuente actual (`src/app`).
> Objetivo: dejar constancia de cómo está montado el proyecto hoy, qué tan preparado
> está para crecer, y qué cambios concretos propongo para reforzar esa escalabilidad.

## 0. Estado de implementación

Cada mejora de la §5 se aplica en un commit independiente, verificando antes de
cada uno que el proyecto compila (`ng build`) y que los tests pasan (`ng test`).

| # | Mejora | Estado |
|---|--------|--------|
| 1 | Unificar el modelo `Weapon` | ✅ Hecho |
| 2 | Crear `environments/` | ✅ Hecho |
| 3 | Manejo de errores HTTP en `WildsApiService` | ✅ Hecho |
| 4 | Componente compartido de selección con buscador | ✅ Hecho |
| 5 | Activar el Router real | ✅ Hecho |
| 6 | Tests de la lógica de cálculo | ✅ Hecho |
| 7 | Convención única de idioma en nombres | ⏳ Pendiente |

> 🔧 **Hallazgo adicional durante la verificación del punto 1**: el arnés de tests
> (`*.spec.ts`) no compilaba ni corría — `app.component.spec.ts` era el boilerplate
> de `ng new` sin adaptar (referenciaba una propiedad `title` que ya no existe) y
> ninguno de los `TestBed.configureTestingModule` de `AppComponent`, `BuilderComponent`
> ni `SkillForgeComponent` proveía `HttpClient`/`TranslateService`, con lo que
> fallaban con `NullInjectorError` en cuanto se ejecutaban de verdad (antes de este
> cambio nunca se habían corrido en CI ni a mano). Se ha corregido como parte del
> punto 1, ya que sin una base de tests que arranque no hay forma fiable de verificar
> ningún cambio posterior. La cobertura real de la lógica de negocio se añade en el
> punto 6.

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
├── app.component.ts/html/scss     # Shell de la app: <app-navbar /> + <router-outlet />
├── app.config.ts                  # Providers globales (router, http, i18n, animations)
├── app.routes.ts                  # 3 rutas reales, las 3 con loadComponent perezoso
├── core/
│   ├── components/navbar/         # Navbar real: routerLink/routerLinkActive + idioma
│   ├── models/wilds.models.ts     # Modelos de dominio: ArmorPiece, ArmorSet, Weapon...
│   └── services/wilds-api.service.ts
├── shared/
│   └── components/selector-buscable/  # mat-select + buscador + filtrado, reutilizable
└── features/
    ├── home/                      # Pantalla de inicio (antes vivía dentro de AppComponent)
    ├── builder/                   # Constructor de equipo (arma + 5 piezas de armadura)
    └── skill-forge/               # Calculadora de habilidades acumuladas + bonif. de set
```

Es la separación `core` / `features` recomendada en Angular y coincide con lo que
pide `CLAUDE.md`. Todas las inconsistencias detectadas en la revisión inicial
(§3) ya están resueltas — ver el estado de implementación en §0.

## 3. Inconsistencias detectadas

Esto no es una lista de "bugs" visibles para el usuario final — la app funciona —
sino de deuda estructural que, si el proyecto crece (más pantallas, más catálogos,
guardado de builds...), se va a notar cada vez más.

### 3.1 ✅ [Resuelto] El Router estaba configurado pero no se usaba

`app.routes.ts` definía una ruta lazy (`loadComponent` hacia `BuilderComponent`) y
`app.config.ts` llamaba a `provideRouter(routes)`. Pero `app.component.html` no
tenía `<router-outlet>`: la navegación real era un `@switch (currentScreen())`
sobre un `signal` en `AppComponent`, que importaba `BuilderComponent` y
`SkillForgeComponent` de forma directa y *eager* (no perezosa).

Consecuencia: el *lazy loading* declarado en las rutas no ocurría nunca (ambos
componentes se cargaban siempre, estuvieran o no en pantalla), no había URLs
navegables (`/builder`, `/skill-forge`), no funcionaba el botón "atrás" del
navegador, y no se podía compartir un enlace directo a una pantalla.

**Solución aplicada:** `app.routes.ts` ahora tiene tres rutas reales, las tres
con `loadComponent` perezoso: `''` → `HomeComponent` (nuevo, ver §3.2), `builder`
→ `BuilderComponent`, `skill-forge` → `SkillForgeComponent`, y `**` redirige a
`''`. `AppComponent` quedó reducido a `<app-navbar />` + `<router-outlet />`, sin
ningún signal de navegación ni import directo de los *features*.

Efecto medible: el bundle inicial de desarrollo bajó de ~2.45 MB a ~1.51 MB, y en
producción de 534.90 kB (con **aviso de presupuesto superado**) a 296.19 kB —
`builder-component`, `skill-forge-component` y `home-component` son ahora chunks
lazy reales, cada uno con solo los módulos de Angular Material que usa.
Verificado en navegador: la URL cambia al navegar (`/builder`, `/skill-forge`),
cargar directamente `http://localhost:4300/skill-forge` funciona, y el botón
"atrás" del navegador vuelve a la pantalla anterior.

### 3.2 ✅ [Resuelto] `NavbarComponent` era un componente fantasma

`core/components/navbar/navbar.component.html` todavía tenía el contenido por
defecto de `ng generate component` (`<p>navbar works!</p>`) y no se importaba en
ningún sitio. El navbar real (logo, enlaces, selector de idioma) estaba escrito
directamente dentro de `app.component.html`.

**Solución aplicada:** el navbar real ahora vive en
`core/components/navbar/navbar.component.ts`, con lógica propia: los enlaces de
pantalla son `routerLink` + `routerLinkActive` (en vez de comparar un signal
`currentScreen` a mano) y el cambio de idioma (`useLanguage`) se movió aquí desde
`AppComponent`, ya que es el propio Navbar quien dispara esa acción. El mapeo
"idioma de la UI → locale de la API" (`jp` de la interfaz es `ja` para
`wilds.mhdb.io`) se centralizó como método público en `WildsApiService`
(`setLocaleFromUiLanguage`) en vez de vivir duplicado como constante suelta en
cada componente que lo necesite.

### 3.3 ✅ [Resuelto] El modelo `Weapon` estaba duplicado (y uno de los dos usaba `any`)

Existía `Weapon` en `core/models/wilds.models.ts` (el modelo "oficial") y una
**segunda copia**, casi idéntica, declarada dentro de
`features/builder/builder.component.ts` — con la diferencia de que esta usaba
`slots: any[]`. Eso obligaba a castear con `as unknown as Weapon[]` en varios
puntos del componente para reconciliar ambos tipos. `CLAUDE.md` pide TypeScript
estricto sin `any` y modelos centralizados en `core/models` — este archivo
incumplía ambas reglas a la vez, y era fácil que los dos tipos divergieran sin
que nadie se diera cuenta.

**Solución aplicada:** se eliminó la interfaz `Weapon` duplicada de
`builder.component.ts` (ahora importa la de `core/models/wilds.models.ts`), se
tipó `slots: number[]` (igual que en `ArmorPiece`, en vez de `any[]`) y se
quitaron los tres `as unknown as Weapon[]` que existían para "engañar" al
compilador entre ambos tipos.

### 3.4 ✅ [Resuelto] No había `environments/`

La URL base de la API (`https://wilds.mhdb.io`) estaba *hardcodeada* dentro de
`WildsApiService`. Sin `environment.ts` / `environment.production.ts` no había
forma limpia de apuntar a un mock, a un proxy propio, o a una versión de
pre-producción de la API sin tocar código fuente.

**Solución aplicada:** se creó `src/environments/environment.ts` (desarrollo) y
`environment.production.ts`, ambos con `{ production, apiRoot }`. `angular.json`
sustituye el fichero de desarrollo por el de producción vía `fileReplacements`
en la configuración `production` del builder. `WildsApiService.apiRoot` ahora
lee `environment.apiRoot` en vez de tener la URL escrita en el propio servicio.

### 3.5 ✅ [Resuelto] UI repetida sin componente compartido

`BuilderComponent` y `SkillForgeComponent` reimplementaban, cada uno por su lado,
el mismo patrón: un `mat-select` con caja de búsqueda interna (`.select-search-box`,
resuelto además con overrides globales `!important` en `styles.scss` por cómo el
CDK monta el panel fuera del DOM del componente) y el mismo filtrado por
`kind`/texto. `CLAUDE.md` menciona reutilizar componentes de `src/app/shared/`,
pero esa carpeta no existía todavía.

**Solución aplicada:** se creó `shared/components/selector-buscable/` — un
`SelectorBuscableComponent<T>` genérico y *standalone* con:
- Caja de búsqueda interna que filtra por `item.name` (el consumidor solo pasa el
  catálogo ya acotado, p. ej. "solo piezas de la ranura `head`").
- `value = model<T | null>(null)` para *two-way binding* directo con un signal del
  consumidor (`[(value)]="selectedHead"`), sin escribir un `(selectionChange)` manual.
- Agrupación opcional por `mat-optgroup` vía la función `[agruparPor]` (usada por el
  selector de armas del Constructor, agrupando por `kind`; solo se muestran los
  grupos con resultados tras el filtro, igual que antes).
- Opción "vacío"/"sin equipar" opcional (`permitirVacio` + `etiquetaVacio`), usada
  por los 5 selectores de la Forja de Habilidades pero no por el Constructor.
- Texto de cada opción personalizable proyectando un `<ng-template let-item>` (p. ej.
  para mostrar "Nombre (Def Max: X)" o "Nombre (Atk: X)"); si no se proyecta nada,
  usa `item.name` por defecto — lo que usan los 5 selectores de la Forja.

`BuilderComponent` y `SkillForgeComponent` ya no declaran signals de texto de
búsqueda (`headSearch`, `weaponSearch`...) ni lógica de filtrado por texto —
ambos quedan notablemente más cortos, y el filtrado por ranura/tipo (lo único que
sigue siendo responsabilidad de cada feature) es un `computed` de una línea.
Verificado en navegador: catálogo, buscador, agrupado por tipo de arma, opción
"Sin equipar" y actualización reactiva de estadísticas/habilidades — todo
funciona igual que antes de la migración.

### 3.6 ✅ [Resuelto] No había manejo de errores HTTP

`WildsApiService` no aplicaba `catchError` ni exponía un estado de error. Si
`wilds.mhdb.io` caía o devolvía un 5xx, el `rxResource` quedaba en estado de error
internamente pero ningún componente lo leía ni lo mostraba — el usuario solo veía
que el spinner (`cargando`) no llegaba a completarse, sin ningún mensaje.

**Solución aplicada:** los 4 métodos de `WildsApiService` aplican
`catchError` → `manejarError(endpoint, error)`, que registra el fallo en consola
(con el endpoint y el `HttpErrorResponse` original para depurar) y relanza un
`Error` legible, en vez de un `HttpErrorResponse` crudo que la UI tendría que
saber interpretar. `BuilderComponent` y `SkillForgeComponent` exponen un
`computed error` (el primer error entre sus `rxResource`) y un método
`reintentar()` que llama a `.reload()` en cada catálogo. Las plantillas muestran
un aviso (`common.errors.catalogLoad`, ya traducido a ES/EN/JP) con un botón
"Reintentar" cuando hay error y no está cargando. Verificado en navegador
bloqueando de verdad las peticiones a `wilds.mhdb.io` (ver captura del aviso) y
comprobando que "Reintentar" recupera los datos.

### 3.7 ✅ [Resuelto] Los tests eran solo boilerplate

Los `.spec.ts` existentes eran los que genera `ng generate` por defecto
(comprobaban que el componente "se crea"). La lógica de negocio real más
delicada del proyecto — `totalDefense`/`totalResistances` en el *builder*, y
sobre todo el cálculo de `habilidadesActivas` y `bonificacionesSet` en
*skill-forge* (acumulación de niveles, detección de bonificaciones de varios
sets a la vez) — no tenía ni un solo test.

**Solución aplicada:** se añadieron tests con `HttpTestingController` (mockeando
la respuesta de `WildsApiService` en vez de golpear la API real) que cubren:
- `BuilderComponent`: `totalDefense` y `totalResistances` sumando varias piezas
  (incluyendo resistencias negativas), y `totalAttack`/`totalAffinity` con y sin
  arma equipada.
- `SkillForgeComponent`: acumulación de nivel de una misma habilidad entre dos
  piezas distintas, y — el caso más delicado — **dos bonificaciones de set
  activas a la vez** (2 piezas de un set + 3 de otro), verificando que cada una
  activa el rango más alto que alcanza sus piezas (no el primero que encuentra)
  y que se ordenan por piezas equipadas.

Detalle técnico registrado para el futuro: `rxResource` actualiza su signal
`value()` en un microtask tras `HttpTestingController.flush()`, así que un test
que dependa de leer ese valor justo después de un flush necesita
`await fixture.whenStable()` antes de continuar (afectó al test de
bonificaciones de set, que sí lee `armorSetsResource`; no hizo falta en los que
solo dependen de signals locales como los de `totalDefense`).

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

1. ✅ **Unificar el modelo `Weapon`**: eliminada la copia duplicada en
   `builder.component.ts`, ahora usa solo `core/models/wilds.models.ts`, con
   `slots: number[]` bien tipado y sin los `as unknown as Weapon[]`. De paso se
   reparó el arnés de tests (ver §0) para poder verificar este y los siguientes
   cambios con `ng build` + `ng test`.
2. ✅ **Crear `environments/environment.ts`**: `apiRoot` ahora vive en
   `src/environments/environment.ts` / `environment.production.ts`, intercambiados
   por `fileReplacements` en `angular.json` según la configuración de build.
3. ✅ **Añadir manejo de errores en `WildsApiService`** (`catchError`): estado de
   error expuesto y mostrado en ambos features, con botón de reintentar.
4. ✅ **Extraer un componente compartido** (`shared/components/selector-buscable/`):
   encapsula el `mat-select` + caja de búsqueda + filtrado (+ agrupado opcional
   por `mat-optgroup` y opción "vacío" opcional), sustituyendo toda la lógica
   duplicada de *builder* y *skill-forge*.
5. ✅ **Activar el Router de verdad**: `AppComponent` es ahora
   `<app-navbar /> + <router-outlet />`, con tres rutas lazy reales (`''`,
   `builder`, `skill-forge`) y el navbar real movido a `core/components/navbar`.
   Efecto colateral medido: bundle inicial de producción 534.90 kB → 296.19 kB.
6. ✅ **Tests de la lógica de cálculo**: `totalDefense`/`totalResistances`/
   `totalAttack`/`totalAffinity` en el *builder*, y `habilidadesActivas`/
   `bonificacionesSet` en *skill-forge* (con el caso de dos sets activos a la
   vez), usando `HttpTestingController` para no depender de la API real.
7. **Fijar y documentar un criterio único de idioma** para nombres de variables y
   métodos en el código nuevo (recomendación: castellano, ya que es el idioma
   principal del proyecto según `CLAUDE.md`), y homogeneizar poco a poco el código
   existente.

Ninguno de estos cambios es urgente para que la app funcione hoy — son ajustes
de fondo para que el proyecto aguante bien el crecimiento que se plantea
(más pantallas, más catálogos, guardado de builds). Dime cuáles quieres que
aborde y en qué orden, y voy directo a por ellos.
