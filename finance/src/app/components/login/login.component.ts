import { Component } from '@angular/core';

type AuthMode = 'signIn' | 'createAccount';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  authMode: AuthMode = 'signIn';

  setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
  }

}
