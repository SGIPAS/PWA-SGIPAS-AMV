# SGIPAS — Sistema de Gestión Integral Planta de Ácido Sulfúrico

Sistema integral desarrollado internamente por la Coordinación de Planta de Ácido 
de Ácidos y Minerales de Venezuela C.A. (AMV). Unifica en un solo entorno los 
módulos operativos, de mantenimiento, seguridad, laboratorio, inventario y 
gestión documental de la planta.

> **Propiedad de AMV C.A.** — El código fuente es un activo de la empresa.
> Tecnologías estándar abiertas. Sin licencias propietarias.

---

## 📋 Índice

- [Descripción general](#descripción-general)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles y permisos](#roles-y-permisos)
- [Módulos funcionales](#módulos-funcionales)
- [Seguridad de la información](#seguridad-de-la-información)
- [Impresión y formatos](#impresión-y-formatos)
- [Entorno de desarrollo](#entorno-de-desarrollo)
- [Despliegue](#despliegue)
- [Estándares de referencia](#estándares-de-referencia)

---

## Descripción general

SGIPAS (Sistema de Gestión Integral Planta de Ácido Sulfúrico) es una 
aplicación web progresiva (PWA) que integra los procesos operativos, de 
mantenimiento, seguridad industrial, laboratorio, inventario y gestión 
documental de la planta de ácido sulfúrico de AMV C.A.

**Filosofía del sistema:** digitalizar los procesos existentes sin 
modificarlos. Los formularios, procedimientos y flujos de trabajo son los 
mismos que ya se ejecutan en papel. La diferencia es el medio: de papel a 
pantalla.

**Características principales:**
- PWA instalable en celulares, tablets y computadoras.
- Notificaciones push en tiempo real.
- Trazabilidad completa de cada acción (quién, cuándo, qué).
- Roles y permisos granulares por departamento y función.
- Funciona en red interna (intranet) con o sin acceso a internet.
- Impresión de formatos con cintillo corporativo.

---

## Arquitectura del sistema

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | HTML5, TailwindCSS, JavaScript ES6 | Interfaz de usuario |
| **Arquitectura cliente** | ES6 Modules nativos (sin bundler) | Código modular, sin compilación |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) | Base de datos, autenticación, archivos |
| **Notificaciones** | OneSignal Web Push SDK v16 | Push a dispositivos móviles |
| **Gráficos** | Chart.js + date-fns adapter | Gráficos de tendencias |
| **Impresión** | CSS `@media print` + cintillo | Formatos físicos ISO |
| **Deploy actual** | Vercel (frontend estático) | Hosting actual |
| **Deploy objetivo** | Ubuntu Server + Nginx (intranet) | Hosting interno |
| **Containerización** | Docker + Docker Compose | Supabase self-hosted |

---

## Estructura del proyecto

---

## Roles y permisos

El sistema define 8 roles con permisos granulares:

| Rol | Descripción | Módulos visibles |
|---|---|---|
| `admin` | Control total del sistema | Todos |
| `planificador` | Planificación de mantenimiento | Todos menos usuarios |
| `supervisor` | Supervisión de turno | Dashboard, Biblioteca, OT, Mantenimiento, Operaciones, Bitácora, Reportes, Inventario, Disposición, Rutinas |
| `operador` | Operación de campo | Dashboard, Biblioteca, Operaciones, Inventario, Disposición, Rutinas |
| `ejecutor` | Ejecución de trabajos | Dashboard, Biblioteca, OT, Mantenimiento |
| `inspector_ssl` | Seguridad industrial | Dashboard, Biblioteca, SSL |
| `analista` | Laboratorio | Dashboard, Biblioteca, Laboratorio |
| `directivos` | Dirección | Dashboard, Biblioteca, Reportes |

**Modelo de autorización:**
- Cada usuario tiene un rol asignado en la tabla `perfiles`.
- El rol **NO** se lee del navegador (`user_metadata`), sino desde la base de datos.
- Cada consulta y mutación es validada por políticas RLS en PostgreSQL.
- Funciones RPC con `SECURITY DEFINER` validan el rol del invocante.

---

## Módulos funcionales

### Dashboard y KPIs
- Panel de indicadores con semáforos (verde/amarillo/rojo).
- Gráficos históricos de tendencias (ácido, pH, emisiones, motores).
- Resumen gerencial con KPIs mensuales.

### Control Operacional
- Reporte de novedades con evidencia fotográfica.
- Análisis de ácido (concentración, NTU, Fe).
- pH de aguas y consumo.
- Emisiones SO₂.
- Temperaturas de motores.
- Diferenciales de presión.
- Paradas de planta.

### Órdenes de Trabajo (OT)
- Correlativos anuales (`OT-PA-0001`, `OT-PA-P-0001`).
- Estados: pendiente → aprobada_ssl → en_ejecucion → finalizada_ejecutor → cerrada.
- Avances con historial completo.
- Cierre con checklist y descuento automático de repuestos.
- Vinculación con novedades (cierre automático en paradas).

### Seguridad Industrial (SSL)
- Emisión de Permisos de Trabajo Seguro (PTS) con correlativo `FOR-SSL-0001`.
- Análisis de Riesgo del Trabajo (ART) con checklist.
- Registro de trabajadores con cédula y cargo.
- Revalidaciones por turno.
- Impresión en formato oficial FOR-SSL-005.

### Laboratorio
- Certificaciones de ácido (TQ-3101 a TQ-3104, Línea 1201).
- Certificaciones de azufre (TQ-4302A-D, Horno).
- Certificaciones de agua (5 puntos de muestreo).
- Disposición de ácido.

### Mantenimiento y Activos (SGI-PAS / ISO 55001)
- Catálogo de equipos con criticidad A/B/C.
- Eventos por equipo (fallas, reparaciones, preventivos, inspecciones).
- Inventario de repuestos con stock mínimo/máximo.
- Kardex inmutable de movimientos (entradas, salidas, ajustes).
- Vinculación de repuestos consumidos con OT y equipo.
- Mediciones predictivas (en desarrollo).
- Análisis de causa raíz (en desarrollo).

### Bitácora de Turno
- Entrega de turno diurna/nocturna.
- Inclusión de porcentaje de cumplimiento de rutinas.
- Confirmación por supervisor entrante.

### Rutinas Diarias
- Checklist basado en PROPA-P-7910 (52 actividades).
- Progreso en tiempo real.
- Auditoría cruzada (admin + supervisor) con motivo de incumplimiento.

### Inventario y Producción
- Recepción de azufre sólido/líquido.
- Despacho a sulfato y cisterna.
- Fundición diaria (big bags).
- Producción por tanque.
- Certificación automática al despachar.

### Biblioteca Documental
- Carga de manuales, procedimientos, formularios, videos.
- Versionado automático.
- URLs firmadas con expiración.
- Categorización jerárquica.

### Reportes
- Informe de Gestión Operacional (parametrizable).
- Informe de Emisiones SO₂.
- Reportes mensuales (OT y PTS).
- Exportación a Excel/CSV.

### Disposición Final
- Ácido retenido / devuelto.
- Agua recuperada / vertida.
- Residuos sólidos (coque, azufre contaminado, catalizador, etc.).

### Gestión de Personal
- CRUD de usuarios.
- Asignación de roles y departamentos.
- Activación/desactivación.

---

## Seguridad de la información

El sistema implementa seguridad por capas (defensa en profundidad):

| Capa | Mecanismo |
|---|---|
| **Perímetro de red** | Intranet controlada, firewall, servidor aislado |
| **Autenticación** | Supabase Auth con JWT y contraseñas robustas |
| **Autorización** | Row Level Security (RLS) en todas las tablas |
| **Autorización (backend)** | Funciones RPC con validación de rol |
| **Transporte** | HTTPS en todas las comunicaciones |
| **Auditoría** | Tabla `audit_log` con trigger en tablas críticas |
| **Storage** | Buckets privados con URLs firmadas (expiración 1h) |
| **Auditoría de usuarios** | Registro de accesos y cambios de estado |
| **Bloqueo de intrusos** | Rate limiting, fail2ban en servidor |
| **Escapado de HTML** | Prevención de XSS en todas las interpolaciones |

### Estados de usuario
- `estado = true` → usuario activo con acceso completo
- `estado = false` → usuario inactivo, no puede autenticarse

### Trazabilidad
Cada operación de escritura registra:
- **Quién**: usuario autenticado (`auth.uid()`)
- **Qué**: campos modificados (antes y después)
- **Cuándo**: timestamp con zona horaria
- **Dónde**: tabla afectada y registro

---

## Impresión y formatos

Todos los formatos incluyen:
- **Cintillo superior** corporativo (imagen).
- **@page letter portrait**, margen 0.5cm.
- **Firmas manuales** sobre papel (cumplimiento ISO 9001/45001).
- **Selector `[id$="-print"]`** para aislar el contenido imprimible.

**Formatos vigentes:**

| Formato | Código | Módulo |
|---|---|---|
| Orden de Trabajo | PRO-MTTO-F-8903 | Órdenes |
| Permiso de Trabajo Seguro | FOR-SSL-005 | SSL |
| Bitácora de Turno | — | Bitácora |
| Informe de Gestión | — | Reportes |
| Reporte Mensual OT | — | Reportes |
| Reporte Mensual PTS | — | Reportes |
| Auditoría de Rutinas | — | Rutinas |
| Informe de Emisiones | — | Reportes |

---

## Entorno de desarrollo

### Requisitos

- **Node.js** 18+ (solo para Tailwind CLI si se migra a compilado).
- **Python** 3.8+ (servidor local para pruebas).
- **Google Chrome** (recomendado para desarrollo).
- **PostgreSQL Client** (opcional, para consultas directas).
- Acceso al proyecto Supabase.

### Levantar el entorno local

**Windows:**

```batch
# Doble clic en arrancar_pwa.bat
# O desde CMD:
python -m http.server 8000
