import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface CreateTransactionRequest {
  description: string;
  category: string;
  amount: number;
  type: 'Credit' | 'Debit' | 'Income';
  status: 'Paying' | 'Paid';
  date: string;
  installments?: number;
}

interface TransactionResponse {
  message: string;
  transaction: any;
  transactions?: any[];
}

interface TransactionsListResponse {
  count: number;
  transactions: any[];
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = `${environment.apiUrl}/transactions`;
  // Emits the latest transactions array when transactions change
  transactionsChanged: Subject<any[]> = new Subject<any[]>();
  // Emits a single transaction when an installment is paid early
  installmentPaid: Subject<any> = new Subject<any>();

  private refreshTransactions(): void {
    this.getTransactions().subscribe({
      next: (res) => this.transactionsChanged.next(res.transactions || []),
      error: () => this.transactionsChanged.next([])
    });
  }

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createTransaction(data: CreateTransactionRequest): Observable<TransactionResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<TransactionResponse>(`${this.apiUrl}/create`, data, { headers }).pipe(
      tap(() => this.refreshTransactions())
    );
  }

  getTransactions(filters?: {
    type?: string;
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<TransactionsListResponse> {
    const headers = this.getAuthHeaders();
    let url = `${this.apiUrl}/list`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.http.get<TransactionsListResponse>(url, { headers });
  }

  updateTransaction(id: string, data: Partial<CreateTransactionRequest>): Observable<TransactionResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<TransactionResponse>(`${this.apiUrl}/${id}`, data, { headers }).pipe(
      tap(() => this.refreshTransactions())
    );
  }

  payInstallmentEarly(id: string, markPrevious: boolean = false): Observable<TransactionResponse> {
    const headers = this.getAuthHeaders();
    const body = { markPrevious };
    return this.http.patch<TransactionResponse>(`${this.apiUrl}/${id}/pay-early`, body, { headers }).pipe(
      tap((res) => {
        this.refreshTransactions();
        try { if (res && res.transaction) this.installmentPaid.next(res.transaction); } catch {}
      })
    );
  }

  deleteTransaction(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers }).pipe(
      tap(() => this.refreshTransactions())
    );
  }

  deleteTransactionGroup(id: string, deleteGroup: boolean): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = deleteGroup ? `${this.apiUrl}/${id}?deleteGroup=true` : `${this.apiUrl}/${id}`;
    return this.http.delete<any>(url, { headers }).pipe(
      tap(() => this.refreshTransactions())
    );
  }
}
