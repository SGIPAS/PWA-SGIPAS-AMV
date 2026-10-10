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
