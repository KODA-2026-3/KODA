import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-radiografias',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="page-heading"><a routerLink="/dashboard/inicio">Volver al inicio</a><p class="eyebrow">Nuevo estudio</p><h1>Cargar radiografia</h1><p>Selecciona una imagen de rodilla en formato JPG o PNG.</p></section><label class="upload"><span>Arrastra tu archivo aqui</span><small>o selecciona un archivo desde tu equipo</small><input type="file" accept="image/jpeg,image/png" /></label>`,
  styles: [`:host { display:block; } a { color:#b35b3d; font-weight:700; text-decoration:none; } .eyebrow { color:#b35b3d; font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-top:42px; } h1 { font:700 clamp(2rem,4vw,3.4rem)/1.1 Georgia,serif; margin:10px 0; } .page-heading p:last-child { color:#527075; } .upload { display:grid; place-items:center; gap:8px; min-height:260px; margin-top:42px; border:2px dashed #9db4aa; border-radius:4px; background:#f5f7f4; cursor:pointer; text-align:center; } .upload span { font-weight:700; } .upload small { color:#527075; } input { position:absolute; width:1px; height:1px; opacity:0; }`]
})
export class RadiografiasComponent {}
