import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';

interface Transaction {
  id: string;
  description: string;
  category: string;
  date: string;
  amount: number;
  status: 'Paying' | 'Paid';
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
    userCurrency: string = 'BRL';
    isUserMenuOpen = false;
    isSidebarOpen = false;
    showAddForm = false;
    showEditForm = false;
    editingTransactionId: string | null = null;
    searchQuery = '';
    selectedCategory = 'All categories';
    selectedType: 'Credit' | 'Debit' = 'Credit';
    isAnimating = false;
    transactionForm: FormGroup;
    editTransactionForm: FormGroup;

    transactions: Transaction[] = [];

    categoryColorMap: { [key: string]: string } = {
      'Income': '#45e0a1',
      'Housing': '#a855f7',
      'Food': '#3b82f6',
      'Transport': '#f59e0b',
      'Entertainment': '#ef4444',
      'Health': '#06b6d4'
    };

    categories = ['All categories', 'Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Health'];
  
    constructor(
      private readonly router: Router, 
      private fb: FormBuilder,
      private transactionService: TransactionService
    ) {
      this.transactionForm = this.fb.group({
        description: ['', [Validators.required, Validators.minLength(3)]],
        category: ['', Validators.required],
        date: ['', Validators.required],
        amount: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d{1,2})?$/)]],
        type: ['Credit', Validators.required],
        status: ['Paid', Validators.required]
      });

      this.editTransactionForm = this.fb.group({
        description: ['', [Validators.required, Validators.minLength(3)]],
        category: ['', Validators.required],
        date: ['', Validators.required],
        amount: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d{1,2})?$/)]],
        type: ['Credit', Validators.required],
        status: ['Paid', Validators.required]
      });
    }
  
    ngOnInit(): void {
      this.loadUserData();
      this.loadSidebarState();
      this.loadTransactions();
  }

  openAddForm(): void {
    this.showAddForm = true;
    document.body.style.overflow = 'hidden';
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.transactionForm.reset({ status: 'Paid', type: 'Credit' });
    document.body.style.overflow = 'auto';
  }

  openEditForm(transaction: Transaction): void {
    this.editingTransactionId = transaction.id;
    this.editTransactionForm.patchValue({
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status
    });
    this.showEditForm = true;
    document.body.style.overflow = 'hidden';
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editingTransactionId = null;
    this.editTransactionForm.reset({ status: 'Paid', type: 'Credit' });
    document.body.style.overflow = 'auto';
  }

  addTransaction(): void {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      
      // Format date to ISO string if needed
      const dateValue = formValue.date instanceof Date 
        ? formValue.date.toISOString().split('T')[0] 
        : formValue.date;

      const transactionData = {
        description: formValue.description,
        category: formValue.category,
        amount: parseFloat(formValue.amount),
        type: formValue.type,
        status: formValue.status,
        date: dateValue
      };

      this.transactionService.createTransaction(transactionData).subscribe({
        next: (response) => {
          console.log('Transaction created successfully:', response);
          const newTransaction: Transaction = {
            id: response.transaction._id,
            ...transactionData,
            categoryColor: this.getCategoryColor(transactionData.category)
          };
          this.transactions.unshift(newTransaction);
          this.closeAddForm();
        },
        error: (error) => {
          console.error('Error creating transaction:', error);
          alert(`Error: ${error.error?.message || 'Failed to create transaction'}`);
        }
      });
    }
  }

  editTransaction(): void {
    if (this.editTransactionForm.valid && this.editingTransactionId) {
      const formValue = this.editTransactionForm.value;
      
      const dateValue = formValue.date instanceof Date 
        ? formValue.date.toISOString().split('T')[0] 
        : formValue.date;

      const transactionData = {
        description: formValue.description,
        category: formValue.category,
        amount: parseFloat(formValue.amount),
        type: formValue.type,
        status: formValue.status,
        date: dateValue
      };

      this.transactionService.updateTransaction(this.editingTransactionId, transactionData).subscribe({
        next: (response) => {
          console.log('Transaction updated successfully:', response);
          const index = this.transactions.findIndex(t => t.id.toString() === this.editingTransactionId);
          if (index > -1) {
            this.transactions[index] = {
              id: this.editingTransactionId as any,
              ...transactionData,
              date: new Date(transactionData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              categoryColor: this.getCategoryColor(transactionData.category)
            };
          }
          this.closeEditForm();
        },
        error: (error) => {
          console.error('Error updating transaction:', error);
          alert(`Error: ${error.error?.message || 'Failed to update transaction'}`);
        }
      });
    }
  }

  deleteTransaction(transactionId: string): void {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.transactionService.deleteTransaction(transactionId.toString()).subscribe({
        next: (response) => {
          console.log('Transaction deleted successfully:', response);
          this.transactions = this.transactions.filter(t => t.id !== transactionId);
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
          alert(`Error: ${error.error?.message || 'Failed to delete transaction'}`);
        }
      });
    }
  }

  getCategoryColor(category: string): string {
    if (!this.categoryColorMap[category]) {
      // Generate random color for new categories
      const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      this.categoryColorMap[category] = randomColor;
    }
    return this.categoryColorMap[category];
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
        this.loadTransactions(); // Reload transactions for the new type
        this.isAnimating = false;
      }, 150);
    }
  }

  trackByTransactionId(index: number, transaction: Transaction): string {
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

    private loadTransactions(): void {
      const filters = {
        type: this.selectedType
      };
      this.transactionService.getTransactions(filters).subscribe({
        next: (response) => {
          this.transactions = response.transactions.map((t: any) => ({
            id: t._id,
            description: t.description,
            category: t.category,
            date: new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            amount: t.amount,
            status: t.status,
            type: t.type,
            categoryColor: this.getCategoryColor(t.category)
          }));
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
          console.log('Using sample data for now...');
        }
      });
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
          this.userCurrency = user.currency || 'BRL';
        } catch {
          this.userInitials = 'US';
          this.userName = 'User';
          this.userCurrency = 'BRL';
        }
      }
    }
}
