import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="page-heading"><p class="eyebrow">Historial clinico</p><h1>Resultados y reportes</h1><p>Consulta los estudios procesados y su documentacion asociada.</p></section><div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody><tr><td>Estudio de ejemplo</td><td>03 sep 2026</td><td><span class="status">Listo para revision</span></td><td><a routerLink="/resultados/reportes">Ver reporte</a></td></tr></tbody></table></div>`,
  styles: [`:host { display:block; } .eyebrow { color:#b35b3d; font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; } h1 { font:700 clamp(2rem,4vw,3.4rem)/1.1 Georgia,serif; margin:10px 0; } .page-heading p:last-child { color:#527075; } .table-wrap { overflow-x:auto; margin-top:42px; } table { width:100%; min-width:620px; border-collapse:collapse; background:white; } th,td { padding:18px 16px; border-bottom:1px solid #dbe4df; text-align:left; } th { color:#527075; font-size:.8rem; text-transform:uppercase; } .status { color:#277052; font-weight:700; } a { color:#b35b3d; font-weight:700; text-decoration:none; }`]
})
export class ResultadosComponent {}
