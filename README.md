# Sistema de Clinica Veterinaria — Corte 3

**Curso:** Bases de Datos Avanzadas | **Semestre:** 2026-1

## Levantamiento rapido

```bash
cp .env.example .env
docker compose up --build
```

API disponible en `http://localhost:3001` | Frontend en `http://localhost:3000`

---

## Preguntas de sustentacion

### 1. ¿Que politica RLS aplicaste a la tabla mascotas?

Se definen dos politicas sobre `mascotas`:

- **Rol `rol_veterinario`:** `USING (id IN (SELECT mascota_id FROM vet_atiende_mascota WHERE vet_id = current_setting('app.current_vet_id')::uuid AND activa = true))`. Un veterinario solo puede leer las mascotas en las que figura como atencion activa.
- **Roles `rol_admin` y `rol_recepcion`:** `USING (true)`. Acceso irrestricto a todas las filas.

El backend establece `SET LOCAL app.current_vet_id = '<id>'` al inicio de cada transaccion. RLS filtra automaticamente sin ninguna clausula `WHERE` adicional en el codigo de aplicacion.

---

### 2. ¿Cual es el vector de ataque de tu mecanismo RLS y como lo previniste?

**Vector principal — suplantacion de identidad via header:** Si el backend toma el `vet_id` directamente de un header HTTP sin validarlo, un usuario malicioso podria pasar el UUID de otro veterinario y ver sus mascotas.

**Prevencion:** El middleware de autenticacion valida el token JWT antes de extraer el `vet_id`. Ademas, antes de ejecutar `SET LOCAL app.current_vet_id`, el backend verifica que el id exista en la tabla `veterinarios` con una query separada como `postgres` (no como `app_api`). Si el id no existe, la peticion es rechazada con 403.

**Vector secundario — falla al establecer la variable:** Si el backend omitiera el `SET LOCAL`, `current_setting('app.current_vet_id')` lanzaria una excepcion, devolviendo 0 filas al veterinario (fallo seguro — no expone datos de otros). La politica falla cerrada, no abierta.

---

### 3. ¿Usaste privilegios elevados en algun procedure?

No. Todos los stored procedures utilizan `SECURITY INVOKER` (comportamiento por defecto en PostgreSQL). El procedimiento `sp_agendar_cita` es invocado por el rol `app_api`, que ya posee permisos `INSERT` sobre la tabla `citas` gracias a los `GRANT` definidos en `04_roles_y_permisos.sql`.

No fue necesario `SECURITY DEFINER` porque ningun procedimiento requiere acceder a tablas o ejecutar operaciones que esten fuera del alcance del rol invocador. Usar `SECURITY DEFINER` sin necesidad introduciria escalada de privilegios innecesaria.

---

### 4. ¿Que TTL le pusiste al cache Redis y por que?

**TTL: 300 segundos (5 minutos)**

Las vacunaciones pendientes cambian unicamente cuando un veterinario aplica una vacuna — evento poco frecuente en comparacion con las lecturas del dashboard. Un TTL de 5 minutos ofrece beneficio real de rendimiento (hasta cientos de consultas evitadas entre escrituras) sin exponer datos obsoletos por periodos criticos.

Valores descartados:
- **10s:** El ratio MISS/HIT seria casi 1:1; el cache no aportaria valor practico.
- **1h:** Un registro de vacuna aplicada seguiria apareciendo como pendiente durante 60 minutos, generando inconsistencias operativas.

El TTL actua como capa de seguridad secundaria. La estrategia principal es **eager invalidation**: cada `POST /api/vacunaciones` exitoso ejecuta `DEL vacunacion:pendiente:all` en Redis de forma sincrona antes de retornar la respuesta.

---

### 5. Elige un endpoint critico y explica como maneja el input del usuario

**Endpoint:** `GET /api/mascotas?nombre=<input>`

El parametro `nombre` proviene directamente del usuario via query string. El backend lo procesa asi:

```js
const { nombre } = req.query;
const result = await pool.query(
  'SELECT id, nombre, especie, dueno_id FROM mascotas WHERE nombre ILIKE $1',
  [`%${nombre}%`]
);
```

El driver `pg` usa el **protocolo extendido de PostgreSQL**: el texto de la query y el valor del parametro se envian en mensajes separados al servidor. PostgreSQL compila el plan de ejecucion con `$1` como marcador de posicion y luego sustituye el valor como dato, nunca como codigo SQL.

Esto neutraliza: inyecciones de comillas simples (Quote-Escape), sentencias apiladas (Stacked Queries) y ataques UNION-based. El motor trata cualquier contenido de `$1` como un string literal, independientemente de su contenido.

---

### 6. Si se revocan todos los permisos del rol veterinario excepto SELECT en mascotas, ¿que deja de funcionar?

| Funcionalidad | Motivo del fallo |
|---|---|
| **Agendar citas** (`POST /api/citas`) | Se revoca `INSERT` en `citas` → el rol no puede insertar nuevas citas; el endpoint retorna error 403/42501 de PostgreSQL. |
| **Aplicar vacunas** (`POST /api/vacunaciones`) | Se revoca `INSERT` en `vacunas_aplicadas` → el veterinario no puede registrar vacunaciones; el endpoint falla con error de permisos. |
| **Consultar agenda propia** (`GET /api/citas`) | Se revoca `SELECT` en `citas` → el veterinario no puede leer sus propias citas programadas; el endpoint retorna error o arreglo vacio segun el manejo de errores. |

Solo quedaria funcional la busqueda de mascotas (`GET /api/mascotas`), que es el unico permiso conservado. El sistema quedaria practicamente inutilizable para el rol veterinario.
# corte3-bda-243472
