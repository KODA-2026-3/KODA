import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-heading"><p class="eyebrow">Resumen de actividad</p><h1>Buenos dias, especialista</h1><p>Continua el seguimiento de tus estudios recientes.</p></section>
    <section class="stats"><article><strong>12</strong><span>Estudios pendientes</span></article><article><strong>28</strong><span>Reportes este mes</span></article><article><strong>96%</strong><span>Procesamiento disponible</span></article></section>
    <section class="next-step"><div><p class="eyebrow">Siguiente paso</p><h2>Analiza una nueva radiografia</h2><p>Carga una imagen para iniciar el flujo de diagnostico asistido.</p></div><a routerLink="/radiografias/carga">Cargar estudio</a></section>
  `,
  styles: [`
    :host { display: block; } .eyebrow { color: #b35b3d; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; } h1, h2 { font-family: Georgia, serif; } h1 { font-size: clamp(2rem, 4vw, 3.4rem); margin: 10px 0; } .page-heading > p:last-child { color: #527075; } .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 42px 0; } article { border-top: 3px solid #b35b3d; padding: 20px 0; } article strong, article span { display: block; } article strong { font: 2.5rem Georgia, serif; } article span { color: #527075; margin-top: 8px; } .next-step { display: flex; justify-content: space-between; align-items: end; gap: 24px; padding: 28px; background: #e7efea; border-radius: 4px; } .next-step h2 { font-size: 1.8rem; margin: 8px 0; } .next-step p:not(.eyebrow) { color: #527075; } a { background: #173b3f; color: white; padding: 13px 18px; border-radius: 4px; text-decoration: none; font-weight: 700; white-space: nowrap; } @media (max-width: 650px) { .stats { grid-template-columns: 1fr; margin: 28px 0; } .next-step { display: block; } a { display: inline-block; margin-top: 18px; } }
  `]
})
export class DashboardComponent {}
