import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService, AuthResponse } from '../../services/auth.service';

type AuthMode = 'signIn' | 'createAccount';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  authMode: AuthMode = 'signIn';
  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly signInForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly signUpForm = this.formBuilder.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(private readonly authService: AuthService) {}

  setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.signInForm.reset();
    this.signUpForm.reset();
  }

  submitSignIn(): void {
    if (this.signInForm.invalid || this.loading) {
      this.signInForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      email: this.signInForm.value.email ?? '',
      password: this.signInForm.value.password ?? ''
    };

    this.authService
      .signIn(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => this.handleAuthSuccess(response, 'Login realizado com sucesso.'),
        error: () => {
          this.errorMessage = 'Não foi possível entrar. Verifique suas credenciais e tente novamente.';
        }
      });
  }

  submitSignUp(): void {
    if (this.signUpForm.invalid || this.loading) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword, ...payload } = this.signUpForm.value;
    if (password !== confirmPassword) {
      this.errorMessage = 'As senhas precisam ser iguais.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .signUp({
        firstName: payload.firstName ?? '',
        lastName: payload.lastName ?? '',
        email: payload.email ?? '',
        password: password ?? ''
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => this.handleAuthSuccess(response, 'Conta criada com sucesso.'),
        error: () => {
          this.errorMessage = 'Não foi possível criar a conta. Tente novamente.';
        }
      });
  }

  loginWithGoogle(): void {
    console.log('Google login initiated');
    this.errorMessage = '';
    this.successMessage = '';
    // TODO: Implementar autenticação com Google OAuth
  }

  get signInControls() {
    return this.signInForm.controls;
  }

  get signUpControls() {
    return this.signUpForm.controls;
  }

  private handleAuthSuccess(response: AuthResponse, fallbackMessage: string): void {
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }

    if (response.user) {
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }

    this.successMessage = response.message ?? fallbackMessage;
    this.errorMessage = '';
    this.signInForm.reset();
    this.signUpForm.reset();

    // Navega para dashboard após login bem-sucedido
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 500);
  }

}
