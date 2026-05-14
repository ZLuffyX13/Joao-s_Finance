import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recuperar-senha',
  templateUrl: './recuperar-senha.component.html',
  styleUrl: './recuperar-senha.component.scss'
})
export class RecuperarSenhaComponent {
  email: string = '';
  emailTouched: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private router: Router) {}

  validateEmail(): void {
    this.emailTouched = true;
  }

  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  submitRecovery(): void {
    if (!this.isValidEmail() || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Simular envio de email de recuperação
    setTimeout(() => {
      this.loading = false;
      this.successMessage = `Recovery email sent to ${this.email}. Check your inbox for instructions.`;
      this.errorMessage = '';
      this.email = '';
      this.emailTouched = false;

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    }, 1500);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
