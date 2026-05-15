import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface CreateTransactionRequest {
  description: string;
  category: string;
  amount: number;
  type: 'Credit' | 'Debit';
  status: 'Paying' | 'Paid';
  date: string;
}

interface TransactionResponse {
  message: string;
  transaction: any;
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
    return this.http.post<TransactionResponse>(`${this.apiUrl}/create`, data, { headers });
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
    return this.http.put<TransactionResponse>(`${this.apiUrl}/${id}`, data, { headers });
  }

  deleteTransaction(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }
}
