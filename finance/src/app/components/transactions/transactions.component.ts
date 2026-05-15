import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Transaction {
  id: number;
  description: string;
  category: string;
  date: string;
  amount: number;
  status: 'Confirmed' | 'Pending';
  type: 'Credit' | 'Debit';
  categoryColor?: string;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
    userInitials: string = 'AA';
    userName: string = 'User';
    isUserMenuOpen = false;
    isSidebarOpen = false;
    showAddForm = false;
    searchQuery = '';
    selectedCategory = 'All categories';
    selectedType: 'Credit' | 'Debit' = 'Credit';
    isAnimating = false;
    transactionForm: FormGroup;

    transactions: Transaction[] = [
      { id: 1, description: 'Salary', category: 'Income', date: 'May 1', amount: 5000, status: 'Confirmed', type: 'Credit', categoryColor: '#45e0a1' },
      { id: 2, description: 'Rent', category: 'Housing', date: 'May 1', amount: -1200, status: 'Confirmed', type: 'Debit', categoryColor: '#a855f7' },
      { id: 3, description: 'Mercadão', category: 'Food', date: 'May 3', amount: -887, status: 'Confirmed', type: 'Debit', categoryColor: '#3b82f6' },
      { id: 4, description: 'IFood', category: 'Food', date: 'May 4', amount: -842, status: 'Confirmed', type: 'Debit', categoryColor: '#3b82f6' },
      { id: 5, description: 'Uber', category: 'Transport', date: 'May 5', amount: -918, status: 'Confirmed', type: 'Debit', categoryColor: '#f59e0b' },
      { id: 6, description: 'Netflix', category: 'Entertainment', date: 'May 5', amount: -339, status: 'Pending', type: 'Debit', categoryColor: '#ef4444' },
      { id: 7, description: 'Farmácia', category: 'Health', date: 'May 6', amount: -455, status: 'Confirmed', type: 'Debit', categoryColor: '#06b6d4' }
    ];

    categories = ['All categories', 'Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Health'];
  
    constructor(private readonly router: Router, private fb: FormBuilder) {
      this.transactionForm = this.fb.group({
        description: ['', [Validators.required, Validators.minLength(3)]],
        category: ['', Validators.required],
        date: ['', Validators.required],
        amount: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d{1,2})?$/)]],
        type: ['Credit', Validators.required],
        status: ['Confirmed', Validators.required]
      });
    }
  
    ngOnInit(): void {
      this.loadUserData();
      this.loadSidebarState();
  }

  openAddForm(): void {
    this.showAddForm = true;
    document.body.style.overflow = 'hidden';
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.transactionForm.reset({ status: 'Confirmed', type: 'Credit' });
    document.body.style.overflow = 'auto';
  }

  addTransaction(): void {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      const newTransaction: Transaction = {
        id: Math.max(...this.transactions.map(t => t.id), 0) + 1,
        ...formValue,
        amount: parseFloat(formValue.amount),
        categoryColor: this.getCategoryColor(formValue.category)
      };
      this.transactions.unshift(newTransaction);
      this.closeAddForm();
    }
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Income': '#45e0a1',
      'Housing': '#a855f7',
      'Food': '#3b82f6',
      'Transport': '#f59e0b',
      'Entertainment': '#ef4444',
      'Health': '#06b6d4'
    };
    return colors[category] || '#808080';
  }

  get filteredTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'All categories' || t.category === this.selectedCategory;
      const matchesType = t.type === this.selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }

  switchType(type: 'Credit' | 'Debit'): void {
    if (this.selectedType !== type) {
      this.isAnimating = true;
      setTimeout(() => {
        this.selectedType = type;
        this.isAnimating = false;
      }, 150);
    }
  }

  trackByTransactionId(index: number, transaction: Transaction): number {
    return transaction.id;
  }
  
    toggleUserMenu(): void {
      this.isUserMenuOpen = !this.isUserMenuOpen;
    }
  
    closeUserMenu(): void {
      this.isUserMenuOpen = false;
    }
  
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-avatar') && !target.closest('.user-menu')) {
        this.closeUserMenu();
      }
    }
  
    navigateTo(route: string): void {
      this.router.navigate([route]);
      this.closeUserMenu();
    }
  
    toggleSidebar(): void {
      this.isSidebarOpen = !this.isSidebarOpen;
      localStorage.setItem(
      'sidebar_open',
      JSON.stringify(this.isSidebarOpen)
      );
    }
  
    private loadSidebarState(): void {
    const savedState = localStorage.getItem('sidebar_open');
  
    if (savedState !== null) {
      this.isSidebarOpen = JSON.parse(savedState);
    }
  }
  
    logout(): void {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      this.router.navigate(['/']);
    }
  
     private loadUserData(): void {
      const userJson = localStorage.getItem('auth_user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          const firstName = user.firstName?.charAt(0)?.toUpperCase() || 'U';
          const lastName = user.lastName?.charAt(0)?.toUpperCase() || 'S';
          this.userInitials = firstName + lastName;
          this.userName = user.firstName || 'User';
        } catch {
          this.userInitials = 'US';
          this.userName = 'User';
        }
      }
    }
}
