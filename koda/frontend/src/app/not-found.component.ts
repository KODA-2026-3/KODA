import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: '<main><h1>Página no encontrada</h1><a routerLink="/login">Volver al inicio de sesión</a></main>',
  styles: ['main { padding: 3rem; text-align: center; } a { color: #b35b3d; font-weight: 700; }']
})
export class NotFoundComponent {}