import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Components
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BudgetComponent } from './components/budget/budget.component';
import { GoalsComponent } from './components/goals/goals.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { ReportsComponent } from './components/reports/reports.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { SettingsComponent } from './components/settings/settings.component';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    BudgetComponent,
    GoalsComponent,
    TransactionsComponent,
    ReportsComponent,
    NotificationsComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
