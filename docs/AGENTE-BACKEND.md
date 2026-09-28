# Guía del agente de BACKEND — MhWildsBuildier

> Léela entera al empezar cada sesión. Resume todo lo decidido con el usuario el 27/09/2026.
> La sesión del backend trabaja desde otra carpeta (worktree) y **no ve la memoria** de la
> sesión principal: este documento y `CLAUDE.md` son tu fuente de verdad.
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
- El catálogo (armas, armaduras, habilidades, monstruos) sigue llegando de mhdb directamente al front. Más adelante, opcionalmente, Django tendrá su propia copia sincronizada.
- Los sets se guardan **solo con IDs de mhdb**, nunca nombres: el front los resuelve en el idioma activo (es, en, ja).

### 1.3 Estructura del repositorio (tras la reestructuración)

```
MhWildsBuildier/
├── frontend/              ← Angular (lo que antes estaba en la raíz)
├── backend/               ← Django
│   ├── config/            ← settings.py, urls.py, wsgi/asgi
│   ├── cuentas/           ← usuario, registro, login, contraseña
│   ├── builds/            ← sets guardados y sets compartidos
│   ├── openapi.yaml       ← CONTRATO COMÚN con el front (generado)
│   ├── manage.py
│   ├── requirements.txt / requirements-dev.txt
│   └── .env.example
├── docs/                  ← estas guías y documentación
├── .vscode/
├── docker-compose.yml     ← PostgreSQL local (lo mantiene el back)
├── CLAUDE.md
└── README.md
```

### 1.4 Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Backend | Django 5.2 LTS + Django REST Framework, Python 3.12/3.13, `venv` + `pip` |
| Autenticación | JWT con `djangorestframework-simplejwt`, cabecera `Authorization: Bearer` (vale para web y Capacitor). Acceso 15 min, refresco 7 días rotado, lista negra al cerrar sesión |
| Usuario | Modelo propio con email como identificador, creado **antes de la primera migración** |
| Verificación de email | **Opcional en la v1**. El campo `email_verificado` queda preparado |
| Base de datos | PostgreSQL 16. En local, **Docker Desktop** con `docker-compose.yml` en la raíz |
| Compartir | **Copia congelada**: modelo `SetCompartido` separado de `Build` |
| Modo invitado | **No hay**: guardar exige cuenta |
| Contrato API | OpenAPI con `drf-spectacular` → `backend/openapi.yaml` → tipos TypeScript generados en el front |
| API | Versionada bajo `/api/v1/` |
| Presupuesto | **0 €** de momento (planes gratuitos); se revisará más adelante |
| Móvil | PWA y después Capacitor, reutilizando el mismo Angular |

### 1.5 Flujo de ramas (OBLIGATORIO)

```
front/<tarea> → frontpru ─(permiso)→ frontdes ─┐
                                               ├─(permiso)→ desarrollo ─(orden)→ master
back/<tarea>  → backpru  ─(permiso)→ backdes  ─┘
```

1. **Se vive en pru.** Toda tarea del back sale de `backpru` en una rama `back/<nombre>`, y toda tarea del front sale de `frontpru` en una rama `front/<nombre>`.
2. **Al terminar una tarea, sin pedir confirmación:** fusionar en `backpru`, subir a origin, actualizar la carpeta donde el usuario prueba `backpru` (`git pull`), y borrar la rama local y el worktree temporal.
3. **`backpru` → `backdes`: solo con permiso explícito** del usuario, después de que lo haya probado en pru.
4. **`backdes` → `desarrollo`: solo con permiso explícito.** En `desarrollo` se juntan front y back, y el usuario prueba la integración en su **URL de pruebas desplegada**.
5. **`desarrollo` → `master`: solo con orden explícita.** `master` es producción y no se toca nunca sin esa orden.
6. Tras subir a `master`, proponer sincronizar master hacia `desarrollo`, des y pru.
7. **Las ramas del back solo modifican `backend/`** (y `docker-compose.yml`). Las del front solo `frontend/`. Así las dos cadenas no chocan al juntarse.

### 1.6 Entornos

| Entorno | Rama | Front | API | Base de datos |
| --- | --- | --- | --- | --- |
| Local | pru / des | `localhost:4200` | `localhost:8000` | PostgreSQL en Docker |
| Pruebas | `desarrollo` | URL fija de Vercel para la rama | Servicio desplegado desde `desarrollo` | **Propia**, nunca la de producción |
| Producción | `master` | Dominio actual (Vercel, proyecto `mh-wilds-buildier`) | Servicio desplegado desde `master` | Producción |

### 1.7 Trabajo en paralelo: dos agentes

| | Agente del front | Agente del back (tú) |
| --- | --- | --- |
| Carpeta de pruebas del usuario | `...\mh\MhWildsBuildier` | `...\mh\MhWildsBuildier-back` (worktree) |
| Rama de esa carpeta | `frontpru` | `backpru` |
| Qué ejecuta el usuario ahí | `ng serve` desde `frontend/` | `docker compose up -d` y `runserver` desde `backend/` |

- Cada tarea se hace en un **worktree temporal propio**, nunca en la carpeta de pruebas del usuario, para no cambiarle el código mientras prueba.
- Para probar todo junto, el usuario corre el back de `backpru` en el puerto 8000 y el front de `frontpru` en el 4200 (el proxy de Angular envía `/api` a `localhost:8000`).
- Los agentes no comparten memoria. **El usuario hace de enlace**, y el contrato común (1.8) es el punto de encuentro. Si la otra sesión está accesible (sesiones locales de Claude Code), también se pueden enviar mensajes directamente.

### 1.8 Contrato común entre front y back

- **El back es la fuente de verdad.** `backend/openapi.yaml` se genera con `drf-spectacular` y se sube **en el mismo commit** que cualquier cambio de modelos, serializadores o endpoints.
- El front **nunca escribe a mano** los tipos de la API. Los genera desde ese fichero leyendo `origin/backpru`.
- Todo cambio de contrato se comunica: qué endpoint o campo cambió, y si rompe algo. Un cambio incompatible va a `/api/v2/` o se coordina antes.

### 1.9 Estado y siguiente paso

- A 27/09/2026, `master` contiene todo lo de `desarrollo`. El Angular sigue en la raíz.
- **Primer paso común (una sola sesión, antes del trabajo en paralelo):** sacar una rama de `master`, mover el Angular a `frontend/`, crear `backend/`, actualizar `CLAUDE.md` con el flujo de ramas y el contrato, y crear `frontpru`, `backpru`, `frontdes` y `backdes` desde ahí. Después se prepara el worktree `MhWildsBuildier-back` y arrancan las dos sesiones.

### 1.10 Preguntas abiertas

- Dominio propio y configuración de la URL de pruebas de `desarrollo` en Vercel (lo hace el usuario con guía, o reconecta Vercel con acceso al equipo `kyeleks-projects`).
- Remitente de los emails de recuperación.
- ¿Nombre visible obligatorio? ¿Único?
- Límite de sets por usuario (propuesta: 50).
- Móvil: ¿basta con la PWA o también las tiendas? ¿Hay un Mac para iOS?

---

## Parte 2 — Tu papel: agente del backend

### 2.1 Ámbito

- Trabajas **solo en `backend/`** y en `docker-compose.yml`. No toques `frontend/`.
- Los ficheros comunes de la raíz (`CLAUDE.md`, `.gitignore`, `docs/`, `.vscode/`) solo se cambian si el usuario lo pide, y avisando de que afecta a las dos cadenas.
- Idioma: habla con el usuario en español. Comentarios, mensajes de commit, nombres de apps y modelos en español (`cuentas`, `builds`, `Usuario`, `SetCompartido`, `nombre_visible`…). Los términos propios de Django y DRF se quedan como son.
- Commits: terminan con la línea de coautoría que indique el sistema.

### 2.2 Stack y convenciones

- Django 5.2 LTS, DRF, `djangorestframework-simplejwt`, `django-cors-headers`, `django-environ`, `psycopg[binary]`, `drf-spectacular`.
- Desarrollo: `pytest`, `pytest-django`, `ruff` (lint y formato).
- Configuración por `.env` (nunca en git). Mantén `.env.example` actualizado y sin secretos.
- `LANGUAGE_CODE = 'es-es'`, `TIME_ZONE = 'Europe/Madrid'`.
- DRF: `JWTAuthentication` por defecto, `IsAuthenticated` por defecto, paginación de 20.
- Todo bajo `/api/v1/`. Documentación en `/api/schema/` y `/api/docs/`.
- Cada funcionalidad lleva pruebas con pytest. No se fusiona en pru con pruebas en rojo.

### 2.3 PostgreSQL local con Docker

`docker-compose.yml` en la raíz:

```yaml
services:
  db:
    image: postgres:16
    container_name: mhwilds-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: mhwilds
      POSTGRES_USER: mhwilds
      POSTGRES_PASSWORD: mhwilds_local
    ports:
      - "5432:5432"
    volumes:
      - mhwilds-pgdata:/var/lib/postgresql/data

volumes:
  mhwilds-pgdata:
```

`backend/.env`: `DATABASE_URL=postgres://mhwilds:mhwilds_local@localhost:5432/mhwilds`

| Comando | Para qué |
| --- | --- |
| `docker compose up -d` | Arrancar PostgreSQL |
| `docker compose stop` | Pararlo sin perder datos |
| `docker compose logs -f db` | Ver logs |
| `docker compose exec db psql -U mhwilds` | Consola SQL |
| `docker compose down -v` | Borrar todo y empezar de cero (luego `migrate`) |

Si el 5432 está ocupado, usar `"5433:5432"` y el puerto 5433 en la URL.

### 2.4 Fases del backend

#### Fase B1 — Esqueleto (`back/esqueleto`)

1. `python -m venv .venv` en `backend/` y seleccionarlo como intérprete en VS Code.
2. Instalar dependencias y fijarlas en `requirements.txt` y `requirements-dev.txt`.
3. `django-admin startproject config .` y las apps `cuentas` y `builds`.
4. **Antes de migrar nada:** `cuentas.Usuario` (basado en `AbstractUser`, sin `username`, con `email` único como `USERNAME_FIELD`) y `AUTH_USER_MODEL = 'cuentas.Usuario'`.
5. Settings con `django-environ`, CORS (`localhost:4200` en local), DRF, simplejwt y drf-spectacular.
6. Rutas: `/api/v1/`, `/api/schema/` y `/api/docs/`. `GET /api/v1/salud/` → `{"estado": "ok"}` con su prueba.
7. `makemigrations`, `migrate`, `createsuperuser` y comprobar `/admin/`.
8. Generar el primer `backend/openapi.yaml` (`python manage.py spectacular --file openapi.yaml`).
9. Tareas de VS Code para `runserver` y depuración de Django (coordinar con el usuario, porque `.vscode/` es común).

#### Fase B2 — Autenticación (`back/auth`)

Modelo `Usuario`:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `email` | EmailField único | Identificador del login, guardado en minúsculas |
| `nombre_visible` | CharField (40) | Lo que ven otros en un set compartido |
| `email_verificado` | BooleanField | `False` por defecto; la verificación es opcional en la v1 |
| heredados | `date_joined`, `is_active`, `is_staff` | Para Django Admin |

| Método y ruta | Qué hace | Sesión |
| --- | --- | --- |
| `POST /api/v1/auth/registro/` | Crea la cuenta (email, contraseña, nombre visible) | No |
| `POST /api/v1/auth/login/` | Devuelve `access` y `refresh` | No |
| `POST /api/v1/auth/refresh/` | Renueva los tokens | No |
| `POST /api/v1/auth/logout/` | Invalida el `refresh` (lista negra) | Sí |
| `GET` / `PATCH /api/v1/auth/yo/` | Ver y editar el perfil | Sí |
| `DELETE /api/v1/auth/yo/` | Borrar la cuenta y sus datos (RGPD) | Sí |
| `POST /api/v1/auth/password/cambiar/` | Cambiar la contraseña conociendo la actual | Sí |
| `POST /api/v1/auth/password/recuperar/` | Enviar el email de recuperación | No |
| `POST /api/v1/auth/password/restablecer/` | Nueva contraseña con `uid` y token | No |

- Validadores de contraseña de Django. Recuperación con `PasswordResetTokenGenerator`. En local, emails a consola.
- *Throttling*: por ejemplo 5 logins por minuto por IP y 3 recuperaciones por hora.
- Pruebas: registro correcto, email repetido, contraseña débil, login bueno y malo, refresh, logout que invalida y recuperación completa.

#### Fase B3 — Sets guardados (`back/builds`)

El JSON de un set (versión 1), solo con IDs de mhdb:

```json
{
  "arma": 123,
  "armadura": { "cabeza": 10, "pecho": 11, "brazos": null, "cintura": 13, "piernas": 14 }
}
```

Cuando el builder tenga adornos y talismán, se añaden claves y se sube `version_esquema` a 2.

| Campo de `Build` | Tipo | Notas |
| --- | --- | --- |
| `id` | UUID | No adivinable |
| `propietario` | FK a `Usuario` | CASCADE |
| `nombre` | CharField (80) | Obligatorio |
| `descripcion` | TextField (500) | Opcional |
| `tipo_arma` | CharField | Copiado del arma, para filtrar |
| `datos` | JSONField | El JSON de arriba |
| `version_esquema` | PositiveSmallInteger | Empieza en 1 |
| `creado`, `actualizado` | DateTimeField | Automáticos |

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/v1/builds/` | Sets propios, paginados; `?tipo_arma=` y `?ordenar=-actualizado` |
| `POST /api/v1/builds/` | Crear |
| `GET /api/v1/builds/{id}/` | Detalle |
| `PUT` / `PATCH /api/v1/builds/{id}/` | Editar |
| `DELETE /api/v1/builds/{id}/` | Borrar |
| `POST /api/v1/builds/{id}/duplicar/` | Copia «Nombre (copia)» |

- El serializador valida la forma de `datos` (claves conocidas, IDs enteros o `null`).
- El *queryset* siempre se filtra por `request.user`: el set de otro usuario devuelve **404**, no 403.
- Límite de sets por usuario (pendiente de confirmar; propuesta 50).
- Pruebas: CRUD, aislamiento entre dos usuarios, JSON inválido y límite.

#### Fase B4 — Compartir con copia congelada (`back/compartir`)

| Campo de `SetCompartido` | Tipo | Notas |
| --- | --- | --- |
| `codigo` | CharField (10) único | Aleatorio con `secrets`, reintenta si choca |
| `autor` | FK a `Usuario` | CASCADE |
| `build_origen` | FK a `Build`, nula | SET_NULL: el enlace sobrevive si se borra el set |
| `nombre`, `descripcion`, `tipo_arma` | copiados | Congelados al compartir |
| `datos`, `version_esquema` | copiados | Congelados |
| `activo` | BooleanField | `False` = revocado (404) |
| `vistas` | PositiveInteger | Contador |
| `creado` | DateTimeField | Fecha de la instantánea |

| Método y ruta | Qué hace | Sesión |
| --- | --- | --- |
| `POST /api/v1/builds/{id}/compartir/` | Crea la instantánea y devuelve código y URL | Dueño |
| `GET /api/v1/builds/{id}/compartidos/` | Enlaces generados desde ese set | Dueño |
| `GET /api/v1/compartidos/mios/` | Todos los enlaces del usuario, con vistas | Sí |
| `DELETE /api/v1/compartidos/{codigo}/` | Revocar (`activo=False`) | Autor |
| `GET /api/v1/compartidos/{codigo}/` | Datos públicos del set y `nombre_visible` del autor. **Nunca el email** | No |
| `POST /api/v1/compartidos/{codigo}/copiar/` | Crea un `Build` en los sets de quien lo pide | Sí |

- Volver a compartir tras editar genera **un enlace nuevo**. Los anteriores siguen mostrando la versión antigua.
- *Throttling* en la vista pública (por ejemplo 60 peticiones por minuto por IP).
- Pruebas: abrir sin sesión, editar el original sin que cambie el enlace, borrar el original con el enlace vivo, revocar y dar 404, copiar, y que no aparezca el email del autor.

#### Fase B5 — Despliegue (cuando algo del back vaya a `desarrollo`)

- Presupuesto 0 €: planes gratuitos (por ejemplo Render o Railway para la API y Neon para PostgreSQL). Comprobar los límites al elegir.
- **Dos servicios**: uno desde `desarrollo` (pruebas) y otro desde `master` (producción), con carpeta raíz `backend/`. **Dos bases de datos separadas.**
- `gunicorn` y `whitenoise`. `DEBUG=False`, HTTPS, HSTS, `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` exactos por entorno. `python manage.py check --deploy` sin avisos.
- `migrate` en cada despliegue. Copias de seguridad diarias en producción.
- En pruebas, emails a consola o a un buzón de prueba.

### 2.5 Obligaciones con el contrato común

1. Cada cambio de modelos, serializadores o endpoints → regenerar `backend/openapi.yaml` **en el mismo commit**.
2. Al fusionar en `backpru` un cambio de contrato, di al usuario qué endpoints o campos han cambiado, para que se lo pase al agente del front (o envíaselo directamente si la sesión del front está accesible).
3. Nunca rompas un endpoint que el front ya usa sin coordinarlo. Si es inevitable, `/api/v2/`.
4. Los nombres de campos del JSON, en español y `snake_case`, como en los modelos.

### 2.6 Lista de comprobación al terminar una tarea

- [ ] Pruebas en verde (`pytest`) y `ruff` sin errores.
- [ ] Migraciones creadas y aplicadas.
- [ ] `openapi.yaml` regenerado si cambió la API.
- [ ] Fusionado en `backpru` y subido a origin.
- [ ] Carpeta de pruebas del usuario (`MhWildsBuildier-back`) actualizada con `git pull`.
- [ ] Rama local y worktree temporal borrados.
- [ ] Resumen al usuario: qué hay nuevo, cómo probarlo y si hay cambios de contrato.
