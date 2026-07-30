// ocp Utilidades para reportes – sparklines, colores, promedios, exportación Excel
export function colorSemaforo(valor, umbral) {
  if (!umbral || valor === undefined || valor === null) return 'gray';
  const { verde, amarillo } = umbral;
  if (Array.isArray(verde) && valor >= verde[0] && valor <= verde[1]) return 'green';
  if (amarillo) {
    if (Array.isArray(amarillo[0])) {
      for (const [min, max] of amarillo) if (valor >= min && valor <= max) return 'yellow';
    } else if (Array.isArray(amarillo)) {
      if (valor >= amarillo[0] && valor <= amarillo[1]) return 'yellow';
    }
  }
  return 'red';
}

export function colorClase(semaforo) {
  return { green: '#22c55e', yellow: '#eab308', red: '#ef4444', gray: '#6b7280' }[semaforo] || '#6b7280';
}

export function generarSparkline(datos, width = 120, height = 30, color = '#38bdf8') {
  if (!datos.length) return '';
  const max = Math.max(...datos);
  const min = Math.min(...datos);
  const rango = max - min || 1;
  const puntos = datos.map((v, i) => `${(i / (datos.length - 1)) * width},${height - ((v - min) / rango) * height}`).join(' ');
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

// ocp Exporta un array de objetos a un archivo Excel y lo descarga
export function exportarAExcel(datos, nombreHoja = 'Datos', nombreArchivo = 'export.xlsx') {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, nombreArchivo);
}