# Guía del agente de FRONTEND — MhWildsBuildier

> Léela entera al empezar cada sesión. Resume todo lo decidido con el usuario el 27/09/2026.
> Este documento y `CLAUDE.md` son tu fuente de verdad (la sesión del back trabaja desde otra
> carpeta y no comparte memoria contigo).
>
> Plan completo y vivo (con diagramas): https://claude.ai/code/artifact/1d389276-4f0d-4516-94d6-7ef5a4c23b73

---

## Parte 1 — Resumen del proyecto en conjunto

### 1.1 Qué estamos construyendo

MhWildsBuildier es un builder de sets para Monster Hunter Wilds. Hasta ahora era una SPA Angular 19 que consumía directamente la API pública `https://wilds.mhdb.io`. Le añadimos un backend propio para:

- **Login de usuarios** con email y contraseña (registro, login, logout, recuperación de contraseña).
- **Guardar varios sets de armadura** por usuario (crear, listar, editar, duplicar, borrar).
- **Compartir sets** mediante un enlace público con una **copia congelada** del set.
- Todo guardado en **PostgreSQL**.
- Pensado desde el principio para convertir la web en **app móvil** (PWA y después Capacitor).

El diseño permite ir añadiendo funcionalidades después (galería pública, favoritos, comentarios, catálogo propio…) sin rehacer nada.

### 1.2 Arquitectura

```
frontend/ (Angular) ──JWT──▶ backend/ (Django + DRF) ──ORM──▶ PostgreSQL
      │
      └──── catálogo del juego ────▶ wilds.mhdb.io (directo, como hasta ahora)
```

- El front solo habla con Django para los datos del usuario; **solo Django toca PostgreSQL**.
- El catálogo (armas, armaduras, habilidades, monstruos) sigue llegando de mhdb directamente al front, con la caché de `localStorage` actual. Más adelante, opcionalmente, Django tendrá su propia copia sincronizada.
- Los sets se guardan **solo con IDs de mhdb**, nunca nombres: el front los resuelve en el idioma activo (es, en, ja).

### 1.3 Estructura del repositorio (tras la reestructuración)

```
MhWildsBuildier/
├── frontend/              ← Angular (lo que antes estaba en la raíz)
│   ├── src/
│   ├── public/            ← i18n (es, en, jp) e imágenes
│   ├── angular.json, package.json, tsconfig*.json
│   └── proxy.conf.json    ← /api → localhost:8000 en desarrollo
├── backend/               ← Django
│   └── openapi.yaml       ← CONTRATO COMÚN con el back (generado por el back)
├── docs/                  ← estas guías y documentación
├── .vscode/
├── docker-compose.yml     ← PostgreSQL local (lo mantiene el back)
├── CLAUDE.md
└── README.md
```

### 1.4 Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Backend | Django 5.2 LTS + Django REST Framework |
| Autenticación | JWT en la cabecera `Authorization: Bearer` (vale para web y Capacitor). Acceso 15 min, refresco 7 días rotado |
| Verificación de email | **Opcional en la v1** |
| Base de datos | PostgreSQL 16. En local, **Docker Desktop** |
| Compartir | **Copia congelada**: el enlace muestra el set tal como estaba al compartirlo |
| Modo invitado | **No hay**: guardar exige cuenta |
| Contrato API | OpenAPI (`backend/openapi.yaml`) → tipos TypeScript **generados** en el front |
| API | Versionada bajo `/api/v1/` |
| Presupuesto | **0 €** de momento (planes gratuitos); se revisará más adelante |
| Móvil | PWA y después Capacitor, reutilizando este mismo Angular |

### 1.5 Flujo de ramas (OBLIGATORIO)

```
front/<tarea> → frontpru ─(permiso)→ frontdes ─┐
                                               ├─(permiso)→ desarrollo ─(orden)→ master
back/<tarea>  → backpru  ─(permiso)→ backdes  ─┘
```

1. **Se vive en pru.** Toda tarea del front sale de `frontpru` en una rama `front/<nombre>`, y toda tarea del back sale de `backpru` en una rama `back/<nombre>`.
2. **Al terminar una tarea, sin pedir confirmación:** fusionar en `frontpru`, subir a origin, actualizar la carpeta donde el usuario prueba `frontpru` (`git pull`, resolviendo bloqueos como archivos sin seguimiento duplicados), y borrar la rama local y el worktree temporal.
3. **`frontpru` → `frontdes`: solo con permiso explícito** del usuario, después de que lo haya probado en pru.
4. **`frontdes` → `desarrollo`: solo con permiso explícito.** En `desarrollo` se juntan front y back, y el usuario prueba la integración en su **URL de pruebas desplegada**.
5. **`desarrollo` → `master`: solo con orden explícita.** `master` es producción y no se toca nunca sin esa orden.
6. Tras subir a `master`, proponer sincronizar master hacia `desarrollo`, des y pru.
7. **Las ramas del front solo modifican `frontend/`.** Las del back solo `backend/` y `docker-compose.yml`. Así las dos cadenas no chocan al juntarse.

### 1.6 Entornos

| Entorno | Rama | Front | API | Base de datos |
| --- | --- | --- | --- | --- |
| Local | pru / des | `localhost:4200` | `localhost:8000` | PostgreSQL en Docker |
| Pruebas | `desarrollo` | URL fija de Vercel para la rama | Servicio desplegado desde `desarrollo` | Propia, nunca la de producción |
| Producción | `master` | Dominio actual (Vercel, proyecto `mh-wilds-buildier`) | Servicio desplegado desde `master` | Producción |

### 1.7 Trabajo en paralelo: dos agentes

| | Agente del front (tú) | Agente del back |
| --- | --- | --- |
| Carpeta de pruebas del usuario | `...\mh\MhWildsBuildier` | `...\mh\MhWildsBuildier-back` (worktree) |
| Rama de esa carpeta | `frontpru` | `backpru` |
| Qué ejecuta el usuario ahí | `ng serve` desde `frontend/` | `docker compose up -d` y `runserver` desde `backend/` |

- Cada tarea se hace en un **worktree temporal propio**, nunca en la carpeta de pruebas del usuario, para no cambiarle el código mientras prueba.
- Para probar todo junto, el usuario corre el back de `backpru` en el puerto 8000 y el front de `frontpru` en el 4200. El proxy de Angular envía `/api` a `localhost:8000`.
- Los agentes no comparten memoria. **El usuario hace de enlace**, y el contrato común (1.8) es el punto de encuentro. Si la otra sesión está accesible (sesiones locales de Claude Code), también se pueden enviar mensajes directamente.

### 1.8 Contrato común entre front y back

- **El back es la fuente de verdad.** `backend/openapi.yaml` se genera con `drf-spectacular` y se sube junto con cada cambio de la API.
- El front **nunca escribe a mano** los tipos de la API. Los genera desde ese fichero leyendo `origin/backpru`.
- Todo cambio de contrato se comunica. Un cambio incompatible va a `/api/v2/` o se coordina antes.

### 1.9 Estado y siguiente paso

- A 27/09/2026, `master` contiene todo lo de `desarrollo`. El Angular sigue en la raíz.
- **Primer paso común (una sola sesión, antes del trabajo en paralelo):** sacar una rama de `master`, mover el Angular a `frontend/` con `git mv`, crear `backend/`, actualizar `CLAUDE.md` con el flujo de ramas y el contrato, y crear `frontpru`, `backpru`, `frontdes` y `backdes` desde ahí. Después se prepara el worktree `MhWildsBuildier-back` y arrancan las dos sesiones.

### 1.10 Preguntas abiertas

- Dominio propio y configuración de la URL de pruebas de `desarrollo` en Vercel (lo hace el usuario con guía, o reconecta Vercel con acceso al equipo `kyeleks-projects`).
- Remitente de los emails de recuperación.
- ¿Nombre visible obligatorio? ¿Único?
- Límite de sets por usuario (propuesta: 50).
- Móvil: ¿basta con la PWA o también las tiendas? ¿Hay un Mac para iOS?

---

## Parte 2 — Tu papel: agente del frontend

### 2.1 Ámbito

- Trabajas **solo en `frontend/`**. No toques `backend/` ni `docker-compose.yml`.
- Los ficheros comunes de la raíz (`CLAUDE.md`, `.gitignore`, `docs/`, `.vscode/`) solo se cambian si el usuario lo pide, y avisando de que afecta a las dos cadenas.
- El usuario quiere **seguir añadiendo cosas al front mientras avanza el back**: todo lo que no dependa de la API (mejoras del builder, Skill Forge, Bestiario, PWA…) se puede hacer en cualquier momento.
- Idioma: habla con el usuario en español. Comentarios, commits e interfaz en español; nombres de variables y métodos coherentes con el código existente.

### 2.2 Convenciones del proyecto (de `CLAUDE.md`)

- Componentes **standalone**, control de flujo moderno (`@if`, `@for`, `@switch`), **signals** o RxJS para el estado.
- TypeScript estricto, **sin `any`**. Modelos tipados en `core/models/` o `shared/models/`. Los tipos de la API propia van **generados** en `src/app/core/api/`.
- Lógica y HTTP en servicios `providedIn: 'root'`.
- Estilo oscuro inspirado en el juego: reutilizar las variables de `styles.scss` y los componentes de `shared/`. **No añadir librerías de UI** (Material, Bootstrap, Tailwind…) sin permiso.
- Responsive en escritorio, tablet y móvil (pensando ya en la app).
- Toda cadena nueva de interfaz lleva su clave en `public/i18n/es.json`, `en.json` y `jp.json`.
- Comandos desde `frontend/`: `ng serve`, `ng build`, `ng test`.

### 2.3 Fases del frontend

#### Fase F0 — Reestructuración (paso común, antes de separar)

1. Mover con `git mv` a `frontend/`: `src/`, `public/`, `angular.json`, `package.json`, `package-lock.json`, `tsconfig*.json`, `.editorconfig`. `node_modules/`, `dist/` y `.angular/` se regeneran.
2. En la raíz se quedan `README.md`, `CLAUDE.md`, `docs/`, `SESSION-SUMMARY.md` y `.gitignore` (con lo de Python añadido).
3. Comprobar desde `frontend/`: `npm install`, `ng serve`, `ng build` y `ng test`, todo igual que antes.
4. En Vercel, poner `frontend` como carpeta raíz del proyecto `mh-wilds-buildier`.

#### Fase F1 — Infraestructura de conexión con el back (`front/infra-api`)

1. `frontend/proxy.conf.json`: `/api` → `http://localhost:8000`, y enlazarlo en `angular.json` para `ng serve`.
2. Añadir `apiBackend` a `src/environments/environment.ts` y `environment.production.ts`, junto al `apiRoot` de mhdb.
3. Nueva configuración **`staging`** (`environment.staging.ts`) para la URL de pruebas de `desarrollo`, que apunta a la API de pruebas.
4. Script `npm run generar:api`: lee `backend/openapi.yaml` de `origin/backpru` (`git show origin/backpru:backend/openapi.yaml`) y genera los tipos con `openapi-typescript` en `src/app/core/api/`. Esos ficheros no se editan a mano.
5. `AlmacenTokensService`: guarda y lee los tokens (en web, `localStorage`). Más adelante se cambiará por almacenamiento seguro de Capacitor sin tocar nada más.
6. `AuthService` con signals: `usuario`, `estaAutenticado`, y los métodos `login`, `registro`, `logout`, `recuperar` y `restablecer`.
7. Interceptor funcional: añade `Authorization: Bearer` **solo** a las peticiones hacia `apiBackend`, **nunca a mhdb**. Ante un 401, renueva el token una vez y repite la petición; si falla, cierra la sesión.
8. `authGuard` para las rutas privadas.

#### Fase F2 — Pantallas de cuenta (`front/auth`)

| Ruta | Qué muestra | Privada |
| --- | --- | --- |
| `/login` | Email y contraseña, enlaces a registro y recuperación | No |
| `/registro` | Email, nombre visible, contraseña y repetición | No |
| `/recuperar` | Pedir el enlace de recuperación | No |
| `/restablecer/:uid/:token` | Fijar contraseña nueva | No |
| `/perfil` | Nombre visible, cambiar contraseña, borrar cuenta | Sí |

- Navbar: botón «Entrar» o menú de usuario con «Mis sets», «Perfil» y «Salir».
- Mientras el endpoint no exista en `backpru`, se puede maquetar y avanzar con datos simulados. Se conecta cuando el back lo tenga y el contrato esté generado.

#### Fase F3 — Mis sets (`front/mis-sets`)

- **Builder:** botón «Guardar set» (pide nombre; si el set ya estaba guardado, ofrece guardar cambios o guardar como nuevo).
- **Sin modo invitado:** sin sesión, «Guardar set» lleva a `/login` y el set a medio hacer se guarda temporalmente en `sessionStorage`, para recuperarlo al volver al builder.
- **Cargar un set:** `/builder?set=<id>`. Hay que escribir la función que, a partir de IDs, busca las piezas en el catálogo del idioma activo y rellena los signals del builder (`armaSeleccionada`, `piezaCabeza`, `piezaPecho`, `piezaBrazos`, `piezaCintura`, `piezaPiernas`).
- **`/mis-sets` (privada):** tarjetas con nombre, arma y piezas, con acciones abrir, renombrar, duplicar, compartir y borrar. Filtro por tipo de arma.
- JSON que se guarda (versión 1, solo IDs):

```json
{
  "arma": 123,
  "armadura": { "cabeza": 10, "pecho": 11, "brazos": null, "cintura": 13, "piernas": 14 }
}
```

El front debe saber leer cada `version_esquema`. Cuando haya adornos y talismán llegará la versión 2.

#### Fase F4 — Compartir (`front/compartir`)

- Botón «Compartir» en el builder y en «Mis sets»: crea el enlace y lo copia al portapapeles.
- Aviso claro: **el enlace es una foto del set en ese momento**. Si luego se edita, hay que volver a compartir para generar un enlace nuevo.
- Gestión de enlaces: lista de enlaces de un set y de todos los del usuario, con sus vistas y un botón para revocar.
- **`/s/:codigo` (pública):** el set en solo lectura, con el nombre visible del autor y la fecha, y el botón «Copiar a mis sets» (que pide login si no hay sesión).

#### Fase F5 — URL de pruebas de `desarrollo` (Vercel)

- URL fija para la rama `desarrollo` (por ejemplo `mh-wilds-buildier-des.vercel.app` o `des.<dominio>`), compilada con la configuración `staging`.
- Vercel solo debe compilar `master` y `desarrollo`, no las ramas pru/des ni las de tarea.
- Opcional: proteger la URL de pruebas con el login de Vercel.

#### Fase F6 — Móvil

1. **PWA** (se puede hacer en cualquier momento): `ng add @angular/pwa`, cachear el catálogo y las imágenes con el *service worker*, revisar todo a 360 px de ancho y objetivos táctiles de al menos 44 px.
2. **Capacitor** (cuando la web con cuentas esté estable): proyectos `android/` e `ios/` dentro de `frontend/`, almacenamiento seguro para los tokens, enlaces profundos para `/s/<codigo>` y la hoja de compartir nativa.

### 2.4 Obligaciones con el contrato común

1. Antes de conectar o tocar una llamada a la API propia, ejecuta `npm run generar:api` para tener el contrato al día.
2. No declares interfaces a mano para respuestas de la API propia: usa los tipos generados. Si necesitas un modelo interno distinto, crea un adaptador que lo transforme.
3. Si el contrato no tiene algo que necesitas (un campo, un filtro, un endpoint), **no lo inventes**: díselo al usuario para que se lo pida al agente del back (o envíaselo directamente si su sesión está accesible).
4. Los campos llegan en español y `snake_case`, tal como los define el back.

### 2.5 Lista de comprobación al terminar una tarea

- [ ] `ng build` y `ng test` en verde.
- [ ] Traducciones añadidas en es, en y jp.
- [ ] Probado en ancho de escritorio y de móvil.
- [ ] Tipos de la API regenerados si la tarea usa la API propia.
- [ ] Fusionado en `frontpru` y subido a origin.
- [ ] Carpeta de pruebas del usuario (`MhWildsBuildier`) actualizada con `git pull`.
- [ ] Rama local y worktree temporal borrados.
- [ ] Resumen al usuario: qué hay nuevo y cómo probarlo.
