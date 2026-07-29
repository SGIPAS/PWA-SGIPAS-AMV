// ocp Utilidades del Panel de Indicadores – umbrales, semáforos, colores
export const UMBRALES = {
  acido: { verde: [98.0, 98.55], amarillo: [[97.5, 98.0], [98.55, 99.0]] },
  ph_caldera_acido: { verde: [10.5, 11.25], amarillo: [[10.0, 10.5], [11.25, 11.5]] },
  ph_calderin: { verde: [10.0, 10.5], amarillo: [[9.5, 10.0], [10.5, 11.0]] },
  ph_torre_enfriamiento: { verde: [6.5, 7.5], amarillo: [[6.0, 6.5], [7.5, 8.0]] },
  so2: { verde: [0, 800], amarillo: [800, 1200], rojo: 1200 }
};

export function colorSemaforo(valor, umbral) {
  // Si no hay umbral definido, retornar gris
  if (!umbral || !umbral.verde) return 'gray';
  
  const { verde, amarillo } = umbral;
  
  if (Array.isArray(verde) && valor >= verde[0] && valor <= verde[1]) return 'green';
  
  if (amarillo) {
    if (Array.isArray(amarillo[0])) {
      for (const [min, max] of amarillo) {
        if (valor >= min && valor <= max) return 'yellow';
      }
    } else if (Array.isArray(amarillo)) {
      if (valor >= amarillo[0] && valor <= amarillo[1]) return 'yellow';
    }
  }
  
  return 'red';
}

export function colorClase(semaforo) {
  return {
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-black',
    red: 'bg-red-500 text-white',
    gray: 'bg-gray-500 text-white'
  }[semaforo] || 'bg-gray-500 text-white';
}