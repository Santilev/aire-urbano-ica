# Aire Urbano — Simulación del ICA

Simulador interactivo del Índice de Calidad del Aire para cuatro zonas urbanas durante 24 horas. Está desarrollado con Next.js, React, TypeScript y Chart.js, y queda preparado para desplegarse directamente en Vercel.

## Cómo funciona

La simulación combina una línea base propia de cada zona con:

- picos de actividad urbana alrededor de las 08:00 y las 18:00;
- una oscilación horaria que representa cambios de ventilación;
- ruido normal para fluctuaciones regulares;
- ruido exponencial para eventos menos frecuentes y más abruptos;
- persistencia temporal, de modo que cada hora conserva parte del valor anterior.

El modo **Mixto** aplica distribución exponencial a Centro y Sur, y distribución normal a Norte y Este. También es posible aplicar una única distribución a todas las zonas.

## Funciones

- 24 mediciones por zona y 96 observaciones totales.
- Gráfico comparativo y cuatro gráficos individuales.
- Reproducción, pausa y selección manual de la hora.
- Nuevas simulaciones aleatorias.
- Detección del máximo diario, promedio actual y horas de alerta.
- Diseño adaptable para escritorio y dispositivos móviles.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Luego abrir [http://localhost:3000](http://localhost:3000).

## Validar la versión de producción

```bash
npm run build
npm run start
```

## Desplegar en Vercel

1. Importar este repositorio desde el panel de Vercel.
2. Mantener **Next.js** como framework detectado.
3. No es necesario configurar variables de entorno.
4. Presionar **Deploy**.

Vercel utilizará automáticamente `npm run build` y publicará la aplicación.
