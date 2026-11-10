import type { jsPDF } from 'jspdf';

import { Analisis, DESCRIPCION_KL, ETIQUETAS_KL, GradoKL } from '../../../core/models/analisis.model';

/** Datos del reporte que no estan en el analisis. */
export interface DatosReporte {
  analisis: Analisis;
  /** Nombre del medico dueno del analisis (cada medico solo ve los suyos). */
  medico: string;
  /** Nombre del usuario que genera el reporte; se imprime en el pie de pagina. */
  generadoPor: string;
  /** Intensidad (0-100) de la barra del visor al pulsar el boton: el PDF muestra lo mismo que la pantalla. */
  intensidadHeatmap: number;
  /** Contraste (%) de la radiografia en el visor; 100 = sin modificar. */
  contraste: number;
  /** "Confianza alta / media / baja", segun los umbrales de la configuracion. */
  textoConfianza: string;
  sinValidezClinica: boolean;
}

type Rgb = [number, number, number];

const NAVY_950: Rgb = [13, 27, 46];
const NAVY_700: Rgb = [30, 58, 95];
const NAVY_50: Rgb = [242, 246, 251];
const SLATE_600: Rgb = [71, 85, 105];
const SLATE_400: Rgb = [148, 163, 184];
const SLATE_200: Rgb = [226, 232, 240];
const AMBAR_50: Rgb = [255, 251, 235];
const AMBAR_900: Rgb = [120, 53, 15];

/** Mismos colores que la escala Kellgren-Lawrence de la aplicacion (tailwind kl.0-4). */
const COLOR_KL: Record<GradoKL, Rgb> = {
  0: [22, 163, 74],
  1: [101, 163, 13],
  2: [217, 119, 6],
  3: [234, 88, 12],
  4: [220, 38, 38]
};

const ANCHO_PAGINA = 210; // A4, mm
const ALTO_PAGINA = 297;
const MARGEN = 16;
const ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN;
const ALTO_PIE = 18;
/** Lado maximo, en pixeles, de las imagenes incrustadas: nitidas al imprimir sin pesar varios MB. */
const LADO_MAXIMO_IMAGEN_PX = 1400;

/**
 * Genera el reporte del analisis en PDF y lo descarga. jsPDF se carga solo al
 * pulsar el boton, para no sumar su peso a la carga inicial de la aplicacion.
 */
export async function descargarReportePdf(datos: DatosReporte): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const { analisis } = datos;
  const generadoEn = new Date();

  doc.setProperties({
    title: `Reporte de análisis ${analisis.id}`,
    subject: 'Clasificación Kellgren-Lawrence de radiografía de rodilla',
    creator: 'KODA'
  });

  let y = encabezado(doc, analisis);

  if (datos.sinValidezClinica) {
    y = avisoSinValidez(doc, y);
  }

  y = seccionDatos(doc, datos, y);
  y = await seccionImagenes(doc, datos, y);
  y = asegurarEspacio(doc, y, 9 + 24);
  y = seccionResultado(doc, datos, y);
  y = asegurarEspacio(doc, y, 9 + 5 * 8);
  seccionDistribucion(doc, analisis, y);

  pieDePagina(doc, datos.generadoPor, generadoEn);
  doc.save(`reporte-${analisis.id}-${analisis.fecha}.pdf`);
}

// --- Secciones ---------------------------------------------------------------

function encabezado(doc: jsPDF, analisis: Analisis): number {
  doc.setFillColor(...NAVY_700);
  doc.rect(0, 0, ANCHO_PAGINA, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('KODA', MARGEN, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Reporte de análisis de radiografía de rodilla', MARGEN, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`ID: #${analisis.id}`, ANCHO_PAGINA - MARGEN, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Clasificación Kellgren-Lawrence', ANCHO_PAGINA - MARGEN, 20, { align: 'right' });

  return 36;
}

function avisoSinValidez(doc: jsPDF, y: number): number {
  // La fuente se fija antes de partir el texto: el ancho de cada linea depende de ella.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const lineas = doc.splitTextToSize(
    'Resultado sin validez diagnóstica: estos valores los generó un clasificador simulado para ' +
      'probar la plataforma, no el modelo de IA.',
    ANCHO_UTIL - 10
  ) as string[];
  const alto = 6 + lineas.length * 4.6;

  doc.setFillColor(...AMBAR_50);
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 2, 2, 'FD');
  doc.setTextColor(...AMBAR_900);
  doc.text(lineas, MARGEN + 5, y + 6.5);

  return y + alto + 6;
}

function seccionDatos(doc: jsPDF, datos: DatosReporte, y: number): number {
  const { analisis } = datos;
  y = tituloSeccion(doc, 'Datos del análisis', y);

  const filas: [string, string][] = [
    ['Médico', datos.medico],
    ['Fecha de procesamiento', formatearFechaHora(analisis.fechaProcesamiento)],
    ['Archivo', analisis.archivo],
    ['Modelo', analisis.modelo]
  ];

  // Dos columnas de pares etiqueta / valor.
  const anchoColumna = ANCHO_UTIL / 2;
  const altoFila = 10;
  filas.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + (i % 2) * anchoColumna;
    const yFila = y + Math.floor(i / 2) * altoFila;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    doc.text(etiqueta.toUpperCase(), x, yFila);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY_950);
    const texto = doc.splitTextToSize(valor, anchoColumna - 6) as string[];
    doc.text(texto[0] + (texto.length > 1 ? '…' : ''), x, yFila + 5);
  });

  return y + Math.ceil(filas.length / 2) * altoFila + 3;
}

async function seccionImagenes(doc: jsPDF, datos: DatosReporte, y: number): Promise<number> {
  const { analisis } = datos;
  y = tituloSeccion(doc, 'Imágenes', y);

  if (!analisis.imagenDisponible || !analisis.imagenOriginal || !analisis.heatmap) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_600);
    doc.text(
      doc.splitTextToSize(
        'La radiografía y su mapa de calor ya no se conservan en KODA (plazo de retención vencido o ' +
          'eliminadas por el médico). El resultado del análisis se incluye a continuación.',
        ANCHO_UTIL
      ),
      MARGEN,
      y + 2
    );
    return y + 16;
  }

  const [original, heatmap] = await Promise.all([
    cargarImagen(analisis.imagenOriginal),
    cargarImagen(analisis.heatmap)
  ]);
  const imagenOriginal = aJpeg(original, datos.contraste, null, 0);
  const imagenHeatmap = aJpeg(original, datos.contraste, heatmap, datos.intensidadHeatmap / 100);

  const separacion = 8;
  const anchoCaja = (ANCHO_UTIL - separacion) / 2;
  const altoCaja = 88;
  const proporcion = original.naturalWidth / original.naturalHeight;
  const ancho = Math.min(anchoCaja, altoCaja * proporcion);
  const alto = ancho / proporcion;

  const cajas: { x: number; imagen: string; titulo: string; detalle: string }[] = [
    {
      x: MARGEN,
      imagen: imagenOriginal,
      titulo: 'Radiografía original',
      detalle: `Contraste ${Math.round(datos.contraste)}%`
    },
    {
      x: MARGEN + anchoCaja + separacion,
      imagen: imagenHeatmap,
      titulo: 'Mapa de calor (Grad-CAM)',
      detalle: `Intensidad ${Math.round(datos.intensidadHeatmap)}%`
    }
  ];

  for (const caja of cajas) {
    doc.setFillColor(...NAVY_950);
    doc.rect(caja.x, y, anchoCaja, alto + 2, 'F');
    doc.addImage(caja.imagen, 'JPEG', caja.x + (anchoCaja - ancho) / 2, y + 1, ancho, alto);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY_950);
    doc.text(caja.titulo, caja.x, y + alto + 7);
    if (caja.detalle) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE_600);
      doc.text(caja.detalle, caja.x + anchoCaja, y + alto + 7, { align: 'right' });
    }
  }

  return y + alto + 15;
}

function seccionResultado(doc: jsPDF, datos: DatosReporte, y: number): number {
  const { analisis } = datos;
  const grado = analisis.grado;
  y = tituloSeccion(doc, 'Resultado', y);

  const alto = 24;
  doc.setFillColor(...NAVY_50);
  doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 2, 2, 'F');

  // Grado predicho con el color de su nivel en la escala.
  doc.setFillColor(...COLOR_KL[grado]);
  doc.roundedRect(MARGEN + 5, y + 4, 16, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(String(grado), MARGEN + 13, y + 14.6, { align: 'center' });

  doc.setTextColor(...NAVY_950);
  doc.setFontSize(13);
  doc.text(`Grado KL ${grado} - ${ETIQUETAS_KL[grado]}`, MARGEN + 27, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_600);
  doc.text(DESCRIPCION_KL[grado], MARGEN + 27, y + 16.5);

  const xDerecha = MARGEN + ANCHO_UTIL - 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY_950);
  doc.text(`${analisis.confianza}%`, xDerecha, y + 11.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_600);
  doc.text(`Probabilidad - ${datos.textoConfianza}`, xDerecha, y + 17.5, { align: 'right' });

  return y + alto + 9;
}

function seccionDistribucion(doc: jsPDF, analisis: Analisis, y: number): number {
  y = tituloSeccion(doc, 'Distribución de probabilidades por grado', y);

  if (analisis.distribucion.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_600);
    doc.text('No disponible: el análisis es anterior al registro de las probabilidades.', MARGEN, y + 2);
    return y + 10;
  }

  const xBarra = MARGEN + 46;
  const anchoBarra = ANCHO_UTIL - 46 - 18;
  const altoFila = 8;

  for (const { grado, probabilidad } of analisis.distribucion) {
    const predicho = grado === analisis.grado;
    const yTexto = y + 3.6;

    doc.setFont('helvetica', predicho ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(predicho ? NAVY_950 : SLATE_600));
    doc.text(`G${grado}  ${ETIQUETAS_KL[grado]}`, MARGEN, yTexto);

    doc.setFillColor(...SLATE_200);
    doc.roundedRect(xBarra, y, anchoBarra, 4.5, 2.25, 2.25, 'F');
    if (probabilidad > 0) {
      doc.setFillColor(...COLOR_KL[grado]);
      doc.roundedRect(xBarra, y, Math.max(4.5, (anchoBarra * probabilidad) / 100), 4.5, 2.25, 2.25, 'F');
    }

    doc.text(`${probabilidad}%`, MARGEN + ANCHO_UTIL, yTexto, { align: 'right' });
    y += altoFila;
  }

  return y;
}

function pieDePagina(doc: jsPDF, generadoPor: string, generadoEn: Date): void {
  const paginas = doc.getNumberOfPages();
  const aviso =
    'Esta herramienta es de apoyo diagnóstico y no reemplaza el criterio clínico del profesional médico.';

  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    const y = ALTO_PAGINA - ALTO_PIE + 4;
    doc.setDrawColor(...SLATE_200);
    doc.line(MARGEN, y, ANCHO_PAGINA - MARGEN, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    doc.text(aviso, MARGEN, y + 5);
    doc.setTextColor(...SLATE_400);
    doc.text(`Generado por ${generadoPor} el ${formatearFecha(generadoEn)} con KODA`, MARGEN, y + 9.5);
    doc.text(`Página ${pagina} de ${paginas}`, ANCHO_PAGINA - MARGEN, y + 9.5, { align: 'right' });
  }
}

// --- Utilidades --------------------------------------------------------------

function tituloSeccion(doc: jsPDF, titulo: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY_700);
  doc.text(titulo, MARGEN, y);
  doc.setDrawColor(...SLATE_200);
  doc.line(MARGEN, y + 2, ANCHO_PAGINA - MARGEN, y + 2);
  return y + 9;
}

/** Pasa a una pagina nueva si lo que sigue no cabe antes del pie. */
function asegurarEspacio(doc: jsPDF, y: number, alto: number): number {
  if (y + alto <= ALTO_PAGINA - ALTO_PIE) {
    return y;
  }
  doc.addPage();
  return MARGEN + 4;
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error('No se pudo leer una de las imágenes del análisis.'));
    imagen.src = src;
  });
}

/**
 * Dibuja la radiografia con el contraste del visor (y, si se indica, el mapa de
 * calor encima con la opacidad elegida, igual que el visor) y la devuelve como JPEG.
 */
function aJpeg(
  base: HTMLImageElement,
  contraste: number,
  encima: HTMLImageElement | null,
  opacidad: number
): string {
  const escala = Math.min(1, LADO_MAXIMO_IMAGEN_PX / Math.max(base.naturalWidth, base.naturalHeight));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(base.naturalWidth * escala);
  lienzo.height = Math.round(base.naturalHeight * escala);

  const ctx = lienzo.getContext('2d');
  if (!ctx) {
    throw new Error('El navegador no permite generar el reporte.');
  }
  ctx.drawImage(base, 0, 0, lienzo.width, lienzo.height);
  // Solo la radiografia lleva el contraste; el mapa de calor se dibuja despues sin el.
  aplicarContraste(ctx, lienzo.width, lienzo.height, contraste);
  if (encima && opacidad > 0) {
    ctx.globalAlpha = Math.min(1, opacidad);
    ctx.drawImage(encima, 0, 0, lienzo.width, lienzo.height);
  }
  return lienzo.toDataURL('image/jpeg', 0.92);
}

/**
 * Misma formula que el filtro CSS contrast() del visor: c' = (c - 0.5) * k + 0.5.
 * Se hace a mano porque ctx.filter no esta disponible en todos los navegadores.
 */
function aplicarContraste(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  contraste: number
): void {
  const k = contraste / 100;
  if (k === 1) {
    return;
  }
  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = (px[i] - 127.5) * k + 127.5;
    px[i + 1] = (px[i + 1] - 127.5) * k + 127.5;
    px[i + 2] = (px[i + 2] - 127.5) * k + 127.5;
  }
  ctx.putImageData(datos, 0, 0);
}

/** "2026-10-11T22:40:12.5" -> "11/10/2026 22:40". Sin pasar por Date: es la hora del servidor, sin zona. */
function formatearFechaHora(iso: string): string {
  const [fecha, hora = ''] = iso.split('T');
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}${hora ? ' ' + hora.slice(0, 5) : ''}`;
}

function formatearFecha(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return (
    `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  );
}