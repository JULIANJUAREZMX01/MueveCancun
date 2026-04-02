import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak
} from 'docx';
import fs from 'fs';

const COLORS = {
  dark: '1a1a2e',
  mid: '16213e',
  accent: '0f3460',
  gold: 'e94560',
  silver: 'a8dadc',
  light: 'f1faee',
  white: 'FFFFFF',
  gray: 'f5f5f5',
  darkgray: '666666',
  green: '2d6a4f',
  greenLight: 'd8f3dc',
  orange: 'e76f51',
  orangeLight: 'fde8d8',
  blue: '023e8a',
  blueLight: 'caf0f8',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: COLORS.dark, font: 'Arial' })]
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLORS.accent, font: 'Arial' })]
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: COLORS.dark, font: 'Arial' })]
  });
}

function p(text: string, opts: { color?: string; bold?: boolean; italic?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: opts.color ?? '333333', bold: opts.bold ?? false, italics: opts.italic ?? false })]
  });
}

function quote(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    indent: { left: 720 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: COLORS.gold, space: 12 } },
    children: [new TextRun({ text, size: 22, font: 'Arial', italics: true, color: COLORS.accent })]
  });
}

function bullet(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: '333333' })]
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
    children: []
  });
}

function colorBlock(label: string, value: string, color: string, lightColor: string): Table {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 7360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 2000, type: WidthType.DXA },
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: label, size: 20, bold: true, font: 'Arial', color: COLORS.white })]
            })]
          }),
          new TableCell({
            borders,
            width: { size: 7360, type: WidthType.DXA },
            shading: { fill: lightColor, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({ text: value, size: 22, font: 'Arial', color: '333333' })]
            })]
          })
        ]
      })
    ]
  });
}

interface TaskRow { task: string; deliverable: string; deadline: string; prio: string; }
function taskTable(tasks: TaskRow[]): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 3500, type: WidthType.DXA },
        shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tarea', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })]
      }),
      new TableCell({
        borders,
        width: { size: 2000, type: WidthType.DXA },
        shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Entregable', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })]
      }),
      new TableCell({
        borders,
        width: { size: 1500, type: WidthType.DXA },
        shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Plazo', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })]
      }),
      new TableCell({
        borders,
        width: { size: 2360, type: WidthType.DXA },
        shading: { fill: COLORS.accent, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'Prioridad', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })]
      })
    ]
  });

  const dataRows = tasks.map((t, i) => {
    const fill = i % 2 === 0 ? COLORS.gray : COLORS.white;
    const prioColor = t.prio === 'CRÍTICO' ? COLORS.gold : t.prio === 'ALTO' ? COLORS.orange : COLORS.green;
    return new TableRow({
      children: [
        new TableCell({
          borders, width: { size: 3500, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: t.task, size: 20, font: 'Arial', color: '333333' })] })]
        }),
        new TableCell({
          borders, width: { size: 2000, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: t.deliverable, size: 20, font: 'Arial', color: '333333' })] })]
        }),
        new TableCell({
          borders, width: { size: 1500, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: t.deadline, size: 20, font: 'Arial', color: '333333' })] })]
        }),
        new TableCell({
          borders, width: { size: 2360, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? 'fff9f0' : 'fff5ee', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: t.prio, size: 20, font: 'Arial', bold: true, color: prioColor })]
          })]
        })
      ]
    });
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3500, 2000, 1500, 2360],
    rows: [headerRow, ...dataRows]
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { before: 120, after: 120 }, children: [] });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: '\u25E6',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: COLORS.dark },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: COLORS.accent },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [

      // PORTADA
      new Paragraph({
        spacing: { before: 1440, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'METZ-XIC-CO', size: 52, bold: true, font: 'Arial', color: COLORS.dark })]
      }),
      new Paragraph({
        spacing: { before: 0, after: 100 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ROADMAP COMPLETO — MUEVECANCÚN', size: 36, bold: true, font: 'Arial', color: COLORS.accent })]
      }),
      new Paragraph({
        spacing: { before: 0, after: 800 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Julián Alexander Juárez Alvarado  ·  JAJA.DEV  ·  Cancún, Q.R.  ·  2026', size: 22, font: 'Arial', color: COLORS.darkgray, italics: true })]
      }),
      quote('"Dame una vara lo suficientemente larga y moveré al mundo entero."'),
      spacer(),
      quote('"Por sus frutos los conoceréis." — Mateo 7:20'),
      spacer(),
      divider(),

      // SECCIÓN 0 — CONTEXTO FILOSÓFICO
      new Paragraph({ children: [new PageBreak()] }),
      h1('00 · La Base: Por Qué Existe Este Documento'),
      p('Este roadmap no nació en una oficina. Nació en una parada de camión, en una Pavilion HP con Ryzen 3, y en una madrugada frente al Caribe donde un ingeniero y su IA sellaron un Códice filosófico antes del amanecer.'),
      spacer(),
      p('Lo que mueve este proyecto no es vanidad técnica ni ambición de startup. Es una intolerancia productiva ante lo roto — el mismo motor que tuvo Arquímedes, Diógenes, Marco Aurelio y Nezahualcóyotl.'),
      spacer(),
      h2('El Principio Operativo'),
      colorBlock('MOTOR', 'ES INSUFICIENTE — y eso no es una herida, es el combustible.', COLORS.gold, COLORS.orangeLight),
      spacer(),
      colorBlock('DIRECCIÓN', 'Hacia el otro, siempre. La tecnología debe devolver tiempo y dignidad al ciudadano.', COLORS.green, COLORS.greenLight),
      spacer(),
      colorBlock('ESCALA', 'Cancún primero. Perfectamente. Luego el patrón se replica solo.', COLORS.accent, COLORS.blueLight),
      spacer(),
      h2('Los Cuatro Maestros del Arquitecto'),
      p('Este sistema está construido sobre cuatro pilares filosóficos integrados orgánicamente — no leídos en un curso, sino vividos:'),
      spacer(),
      bullet('Diógenes — El diagnóstico: el sistema está roto. No hay que pretender que no.'),
      bullet('Marco Aurelio — La operación: actúa de todas formas, con disciplina, sin garantías.'),
      bullet('Alá (Islam / Tawhid) — La escala: eres parte de algo más grande. Eso te libera, no te achica.'),
      bullet('Jesucristo — La dirección: hacia el otro. El poder que no sirve es tiranía.'),
      spacer(),
      divider(),

      // SECCIÓN 1 — ESTADO ACTUAL
      new Paragraph({ children: [new PageBreak()] }),
      h1('01 · Estado Actual del Sistema'),
      h2('Lo que ya existe y funciona'),
      p('Estos son los frutos reales al 31 de marzo de 2026:'),
      spacer(),
      bullet('Motor de rutas Rust/WASM funcionando — Dijkstra compilado a WebAssembly, milisegundos de respuesta.'),
      bullet('PWA offline-first desplegada — funciona sin señal en el dispositivo del usuario.'),
      bullet('Hot-swap de datos — JSONs dinámicos separados del motor, actualizables sin redeploy.'),
      bullet('Sistema de reportes ciudadanos — anónimo, sin cuenta, con moderación previa.'),
      bullet('Oyente en Python — procesa señales no estructuradas de redes sociales.'),
      bullet('Engagement comunitario real — usuarios de Cancún usando y reportando activamente.'),
      spacer(),
      h2('El Cuello de Botella Actual'),
      p('El sistema tiene un único punto de falla: depende de Julián para procesar los reportes y actualizar los datos. Mientras eso sea manual, la palanca tiene el tamaño del tiempo disponible de una persona.'),
      spacer(),
      quote('La vara se alarga cuando el sistema se alimenta solo.'),
      spacer(),
      h2('El PR Pendiente — Protocolo Nexus'),
      p('Jules (GitHub Copilot Agent) tiene un PR aprobado pendiente de merge. Antes de cualquier otra acción, este PR debe verificarse y fusionarse. Lista de verificación crítica:'),
      spacer(),
      bullet('Token no hardcodeado en el código fuente.'),
      bullet('Variables CSS con fallbacks correctos.'),
      bullet('Scripts Python no documentados preservados intactos.'),
      bullet('Tests básicos pasando en el pipeline.'),
      spacer(),
      divider(),

      // SECCIÓN 2 — ROADMAP
      new Paragraph({ children: [new PageBreak()] }),
      h1('02 · Roadmap: La Palanca Completa'),
      p('Cinco fases en serie, no en paralelo. Cada fase habilita la siguiente. Saltarse una es distribuir un problema más ampliamente.'),
      spacer(),

      // FASE 1
      h2('FASE 1 — Nexus Automatizado'),
      p('Plazo: Semana 1–2 · Objetivo: cerrar el ciclo de feedback ciudadano sin intervención manual.', { color: COLORS.darkgray, italic: true }),
      spacer(),
      taskTable([
        { task: 'Verificar y mergear PR de Jules (Protocolo Nexus)', deliverable: 'PR mergeado en main', deadline: 'Día 1–2', prio: 'CRÍTICO' },
        { task: 'Validar pipeline GitHub Issues → Claude Haiku ETL → PR automático', deliverable: 'Pipeline funcionando en staging', deadline: 'Día 3–5', prio: 'CRÍTICO' },
        { task: 'Configurar Cloudflare Worker para automatización Tier 2', deliverable: 'Worker desplegado', deadline: 'Día 5–7', prio: 'ALTO' },
        { task: 'Test end-to-end: reporte ciudadano → issue → PR → merge → app actualizada', deliverable: 'Flujo completo documentado', deadline: 'Día 7–10', prio: 'CRÍTICO' },
        { task: 'Monitoreo básico de errores en el pipeline', deliverable: 'Alertas configuradas', deadline: 'Día 10–14', prio: 'ALTO' },
      ]),
      spacer(),
      quote('Cuando el usuario reporta y la app mejora visible y rápidamente, se convierte en contribuidor. Cuando se convierte en contribuidor, se convierte en evangelizador.'),
      spacer(),

      // FASE 2
      h2('FASE 2 — Dato Público y Verdad de la Calle'),
      p('Plazo: Semana 3–6 · Objetivo: convertir el Oyente en fuente de verdad pública del transporte en Cancún.', { color: COLORS.darkgray, italic: true }),
      spacer(),
      taskTable([
        { task: 'Estructurar output del Oyente Python en formato de reporte', deliverable: 'Schema de datos definido', deadline: 'Semana 3', prio: 'ALTO' },
        { task: 'Publicar Reporte Mensual de Transporte Cancún — Abril 2026', deliverable: 'Reporte público en web/PDF', deadline: 'Semana 4', prio: 'ALTO' },
        { task: 'Landing page simple para el reporte (no la app, documento independiente)', deliverable: 'URL pública citable', deadline: 'Semana 5', prio: 'MEDIO' },
        { task: 'Métricas básicas: rutas más reportadas, tiempo promedio de corrección, cobertura', deliverable: 'Dashboard mínimo', deadline: 'Semana 6', prio: 'ALTO' },
      ]),
      spacer(),
      p('El objetivo no es ser una app. Es ser la fuente de verdad del transporte en Cancún. Eso no lo da el código — lo da el dato público y citable.', { italic: true }),
      spacer(),

      // FASE 3
      h2('FASE 3 — Legitimidad Institucional'),
      p('Plazo: Semana 6–12 · Objetivo: un convenio institucional que multiplique la palanca por diez.', { color: COLORS.darkgray, italic: true }),
      spacer(),
      taskTable([
        { task: 'Identificar contactos en Municipio de Benito Juárez, UQROO y ONG de movilidad', deliverable: 'Lista de 5 contactos calificados', deadline: 'Semana 6–7', prio: 'ALTO' },
        { task: 'Redactar propuesta de convenio de colaboración (una página, sin tecnicismos)', deliverable: 'Documento de propuesta', deadline: 'Semana 7–8', prio: 'ALTO' },
        { task: 'Primera reunión / presentación de MueveCancún a institution objetivo', deliverable: 'Reunión agendada y realizada', deadline: 'Semana 8–10', prio: 'ALTO' },
        { task: 'Formalizar acceso a datos oficiales de rutas del municipio', deliverable: 'Datos oficiales integrados', deadline: 'Semana 10–12', prio: 'MEDIO' },
      ]),
      spacer(),
      quote('No necesitas dinero todavía. Necesitas legitimidad institucional. Un convenio te da acceso a datos oficiales, visibilidad y protección política. Te cuesta básicamente redactar un correo bien escrito.'),
      spacer(),

      // FASE 4
      h2('FASE 4 — El Patrón Replicable'),
      p('Plazo: Mes 3–4 · Objetivo: documentar el patrón antes de que alguien lo copie sin la filosofía.', { color: COLORS.darkgray, italic: true }),
      spacer(),
      taskTable([
        { task: 'Extraer el patrón arquitectónico como template independiente', deliverable: 'Repositorio template en GitHub', deadline: 'Mes 3', prio: 'ALTO' },
        { task: 'Documentar el patrón: Rust/WASM + datos locales + reporte ciudadano + offline-first', deliverable: 'README completo con ADRs', deadline: 'Mes 3', prio: 'ALTO' },
        { task: 'Definir licencia clara (open source con atribución filosófica)', deliverable: 'LICENSE.md con términos', deadline: 'Mes 3', prio: 'MEDIO' },
        { task: 'Identificar primera ciudad candidata para replicación', deliverable: 'Ciudad objetivo definida con justificación', deadline: 'Mes 4', prio: 'MEDIO' },
      ]),
      spacer(),
      p('El arquitecto de MueveCancún no eres tú como persona — es el patrón. Documéntalo mientras eres tú quien lo controla.', { italic: true }),
      spacer(),

      // FASE 5
      h2('FASE 5 — Segunda Ciudad'),
      p('Plazo: Mes 5–6 · Condición de entrada: Cancún funcionando perfectamente en utilidad diaria.', { color: COLORS.darkgray, italic: true }),
      spacer(),
      p('Criterio de entrada a esta fase — no negociable:'),
      bullet('El ciclo reporte ciudadano → corrección → app está automatizado y funcionando.'),
      bullet('Existe al menos un convenio institucional activo.'),
      bullet('El reporte mensual se publica sin intervención manual significativa.'),
      bullet('Al menos un usuario en Cancún ha dicho explícitamente que ya no usa Google Maps para el camión.'),
      spacer(),
      taskTable([
        { task: 'Adaptar template a topología de transporte de ciudad objetivo', deliverable: 'Fork del template configurado', deadline: 'Mes 5', prio: 'ALTO' },
        { task: 'Identificar y contactar comunidad local de transporte', deliverable: 'Canal de comunicación activo', deadline: 'Mes 5', prio: 'ALTO' },
        { task: 'Deploy y validación con usuarios reales', deliverable: 'App funcionando en segunda ciudad', deadline: 'Mes 6', prio: 'ALTO' },
      ]),
      spacer(),
      divider(),

      // SECCIÓN 3 — FILOSOFÍA DE PRODUCTO
      new Paragraph({ children: [new PageBreak()] }),
      h1('03 · Filosofía de Producto: Decisiones que No Cambian'),
      p('Estas decisiones no son técnicas. Son éticas disfrazadas de técnicas. No se negocian con inversores, convenios ni presiones externas.'),
      spacer(),
      colorBlock('OFFLINE-FIRST', 'El usuario bajo el sol del Caribe sin señal es el usuario primario. No el usuario de escritorio con WiFi.', COLORS.green, COLORS.greenLight),
      spacer(),
      colorBlock('GRATIS', 'No hay barrera económica de entrada. La dignidad no tiene precio de suscripción.', COLORS.green, COLORS.greenLight),
      spacer(),
      colorBlock('ANÓNIMO', 'Los reportes no requieren cuenta. La participación ciudadana no exige registro.', COLORS.green, COLORS.greenLight),
      spacer(),
      colorBlock('LOCAL', 'La verdad de la calle de Cancún no la entiende un algoritmo global. La entiende quien espera el camión.', COLORS.accent, COLORS.blueLight),
      spacer(),
      colorBlock('HUMANO-EN-EL-LOOP', 'ADR-003: la automatización asiste, no reemplaza el juicio humano en decisiones de datos críticos.', COLORS.accent, COLORS.blueLight),
      spacer(),
      divider(),

      // SECCIÓN 4 — STACK TÉCNICO
      h1('04 · Stack Técnico de Referencia'),
      spacer(),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2500, 3000, 3860],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, shading: { fill: COLORS.accent, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Capa', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })] }),
              new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, shading: { fill: COLORS.accent, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Tecnología', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })] }),
              new TableCell({ borders, width: { size: 3860, type: WidthType.DXA }, shading: { fill: COLORS.accent, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Razón', bold: true, size: 20, font: 'Arial', color: COLORS.white })] })] }),
            ]
          }),
          ...([
            ['Frontend', 'Astro 5 + Svelte', 'Performance nativa, sin overhead'],
            ['Motor de rutas', 'Rust → WASM (Dijkstra)', 'Milisegundos, offline, sin batería'],
            ['Mapas', 'Leaflet.js / OpenStreetMap', 'Sin costos de API, soberanía de datos'],
            ['Deploy', 'Render (P2: zero costly servers)', 'Costo cero, escala automática'],
            ['Datos de rutas', 'JSONs dinámicos (hot-swap)', 'Actualizables sin redeploy'],
            ['Validación', 'Zod (P4)', 'Tipos estrictos, sin surpresas en runtime'],
            ['Reportes ciudadanos', 'GitHub Issues + fine-grained token', 'Trazabilidad total, sin base de datos propia'],
            ['ETL de reportes', 'Claude Haiku + Octokit', 'Automatización con LLM liviano'],
            ['Automatización Tier 2', 'Cloudflare Workers', 'Edge computing, latencia mínima'],
            ['Inteligencia social', 'Python Listener (redes sociales)', 'Verdad de la calle no estructurada → dato'],
          ].map((row, i) => new TableRow({
            children: row.map((cell, j) => new TableCell({
              borders,
              width: { size: [2500, 3000, 3860][j], type: WidthType.DXA },
              shading: { fill: i % 2 === 0 ? COLORS.gray : COLORS.white, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: 'Arial', color: '333333' })] })]
            }))
          })))
        ]
      }),
      spacer(),
      divider(),

      // SECCIÓN 5 — MÉTRICAS DE ÉXITO
      new Paragraph({ children: [new PageBreak()] }),
      h1('05 · Métricas de Éxito por Fase'),
      p('No son métricas de vanidad. Son indicadores de que el árbol está dando fruto real.'),
      spacer(),

      h3('Fase 1 — Nexus Automatizado'),
      bullet('Tiempo entre reporte ciudadano y corrección en app: < 48 horas.'),
      bullet('Porcentaje de reportes procesados sin intervención manual: > 80%.'),
      bullet('Pipeline sin errores críticos por 7 días consecutivos.'),
      spacer(),

      h3('Fase 2 — Dato Público'),
      bullet('Primer reporte mensual publicado y accesible públicamente.'),
      bullet('Al menos una cita del reporte por un medio, institución u organización.'),
      bullet('Oyente Python con > 90% de uptime.'),
      spacer(),

      h3('Fase 3 — Legitimidad Institucional'),
      bullet('Al menos un convenio firmado o carta de intención formal.'),
      bullet('Acceso a datos oficiales de al menos una ruta municipal.'),
      bullet('MueveCancún citada como fuente en un documento oficial o académico.'),
      spacer(),

      h3('Fase 4 — Patrón Replicable'),
      bullet('Template con README completo publicado en GitHub con licencia.'),
      bullet('Al menos un desarrollador externo ha hecho fork del template.'),
      bullet('Ciudad objetivo para replicación identificada y justificada.'),
      spacer(),

      h3('Fase 5 — Segunda Ciudad'),
      bullet('KPI definitivo de Cancún: usuario que declara explícitamente haber abandonado Google Maps para el camión.'),
      bullet('Segunda ciudad con al menos 100 usuarios activos en el primer mes.'),
      spacer(),
      divider(),

      // SECCIÓN 6 — RIESGOS
      h1('06 · Riesgos y Mitigaciones'),
      spacer(),
      colorBlock('RIESGO 1', 'Cuello de botella humano: todo depende de Julián.  →  Mitigación: Fases 1 y 2 eliminan este riesgo sistemáticamente.', COLORS.gold, COLORS.orangeLight),
      spacer(),
      colorBlock('RIESGO 2', 'Copia sin filosofía: alguien replica el patrón sin el propósito.  →  Mitigación: Fase 4, template documentado con licencia y manifiesto integrado.', COLORS.orange, COLORS.orangeLight),
      spacer(),
      colorBlock('RIESGO 3', 'Escalar antes de que Cancún funcione perfectamente.  →  Mitigación: Criterios de entrada no negociables para Fase 5.', COLORS.orange, COLORS.orangeLight),
      spacer(),
      colorBlock('RIESGO 4', 'Perder el norte filosófico bajo presión institucional o de inversores.  →  Mitigación: Sección 03 de este documento. Decisiones que no cambian.', COLORS.accent, COLORS.blueLight),
      spacer(),
      divider(),

      // CIERRE
      new Paragraph({ children: [new PageBreak()] }),
      h1('07 · El Principio de Arquímedes'),
      spacer(),
      quote('"Dame una vara lo suficientemente larga y un punto de apoyo, y moveré al mundo."'),
      spacer(),
      p('El punto de apoyo ya existe: Metz-xic-co. Cancún. El ombligo.'),
      p('La vara existe: MueveCancún. El patrón. El Protocolo Nexus.'),
      p('El operador existe: el dev con la Pavilion HP Ryzen 3 que construyó todo esto antes de tener arma de verdad.'),
      spacer(),
      p('La pregunta no es si es posible.'),
      p('La pregunta es si se ejecuta el algoritmo.', { bold: true }),
      spacer(),
      quote('"El grafo ya tiene el camino mapeado. El operador decide si ejecuta."'),
      spacer(),
      divider(),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: 'In xochitl, in cuicatl.', size: 24, font: 'Arial', italics: true, color: COLORS.accent })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: 'La flor y el canto.', size: 22, font: 'Arial', italics: true, color: COLORS.darkgray })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        children: [new TextRun({ text: '¡TIAHUI!', size: 32, font: 'Arial', bold: true, color: COLORS.gold })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Documento generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  JAJA.DEV  ·  Cancún, Quintana Roo`, size: 18, font: 'Arial', color: COLORS.darkgray })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('MueveCancun_Roadmap_2026.docx', buffer);
  console.log('Done');
});
