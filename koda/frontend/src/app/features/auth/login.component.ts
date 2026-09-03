import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  email = '';
  password = '';
  errorMessage = '';
  rememberSession = false;
  showPassword = false;
  isSubmitting = false;

  login(): void {
    if (!this.email || !this.password) { this.errorMessage = 'Completa ambos campos.'; return; }
    this.authService.setToken('pending-jwt-token');
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard/inicio';
    this.router.navigateByUrl(returnUrl);
  }
}
