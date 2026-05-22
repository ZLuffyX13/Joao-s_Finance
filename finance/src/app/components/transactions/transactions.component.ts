import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';

interface Transaction {
  id: string;
  description: string;
  category: string;
  date: string;
  rawDate?: string;
  amount: number;
  status: 'Paying' | 'Paid';
  type: 'Credit' | 'Debit' | 'Income';
  installments?: number;
  installmentNumber?: number;
  installmentGroupId?: string;
  categoryColor?: string;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  // today's date reference for month picker highlighting
  today: Date = new Date();
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
    selectedType: 'Credit' | 'Debit' | 'Income' = 'Credit';
    selectedMonth: string = '';
    showMonthPicker: boolean = false;
    months: string[] = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    isAnimating = false;
    transactionForm: FormGroup;
    editTransactionForm: FormGroup;

    transactions: Transaction[] = [];
    showPayModal: boolean = false;
    payModalTransaction: Transaction | null = null;
    payModalFutureInstallments: Transaction[] = [];
    showDeleteModal: boolean = false;
    deleteModalTransaction: Transaction | null = null;
    deleteModalCount: number = 0;

    categoryColorMap: { [key: string]: string } = {};

    categories: string[] = ['All categories', 'Income'];
  
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
        status: ['Paid', Validators.required],
        installments: [1, [Validators.required, Validators.min(1), Validators.max(60)]]
      });

      this.editTransactionForm = this.fb.group({
        description: ['', [Validators.required, Validators.minLength(3)]],
        category: ['', Validators.required],
        date: ['', Validators.required],
        amount: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d{1,2})?$/)]],
        type: ['Credit', Validators.required],
        status: ['Paid', Validators.required]
      });
      // Keep status in sync with type for both forms
      const syncStatus = (form: FormGroup) => {
        form.get('type')?.valueChanges.subscribe((newType) => {
          if (newType === 'Income') {
            form.get('status')?.setValue('Received');
          } else if (form.get('status')?.value === 'Received') {
            form.get('status')?.setValue('Paid');
          }
        });
      };
      syncStatus(this.transactionForm);
      syncStatus(this.editTransactionForm);
    }
  
    ngOnInit(): void {
      this.loadUserData();
      this.loadSidebarState();
      this.loadCategoriesFromStorage();
        // default to current month
        const now = new Date();
        this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.loadTransactions();
  }

  private loadCategoriesFromStorage(): void {
    try {
      const raw = localStorage.getItem('app_categories');
      if (raw) {
        const parsed = JSON.parse(raw) as Array<any>;
        const names = parsed.map(p => p.name).filter(Boolean);
        // keep 'All categories' and 'Income' at start
        this.categories = ['All categories', 'Income', ...names.filter(n => n !== 'Income')];
        parsed.forEach(p => {
          if (p.name) this.categoryColorMap[p.name] = p.colorStart || ('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        });
      } else {
        // default categories
        this.categories = ['All categories', 'Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Health'];
        this.categoryColorMap = {
          'Income': '#45e0a1',
          'Housing': '#a855f7',
          'Food': '#3b82f6',
          'Transport': '#f59e0b',
          'Entertainment': '#ef4444',
          'Health': '#06b6d4'
        };
      }
    } catch {
      this.categories = ['All categories', 'Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Health'];
    }
  }

  openAddForm(): void {
    this.showAddForm = true;
    // prefill type/status based on current selectedType (e.g., Income -> Received)
    this.transactionForm.patchValue({ type: this.selectedType, status: this.selectedType === 'Income' ? 'Received' : 'Paid' });
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
      date: this.toDateInputValue(transaction.rawDate || transaction.date),
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
        date: dateValue,
        installments: formValue.status === 'Paying' ? Number(formValue.installments || 1) : 1
      };

      this.transactionService.createTransaction(transactionData).subscribe({
        next: () => { this.loadTransactions(); this.closeAddForm(); },
        error: (error) => { alert(`Error: ${error.error?.message || 'Failed to create transaction'}`); }
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
        next: () => { this.loadTransactions(); this.closeEditForm(); },
        error: (error) => { alert(`Error: ${error.error?.message || 'Failed to update transaction'}`); }
      });
    }
  }

  deleteTransaction(transactionId: string): void {
    this.transactionService.deleteTransactionGroup(transactionId.toString(), false).subscribe({
      next: () => { this.transactions = this.transactions.filter(t => t.id !== transactionId); },
      error: (error) => { alert(`Error: ${error.error?.message || 'Failed to delete transaction'}`); }
    });
  }

  openDeleteModal(transaction: Transaction): void {
    this.deleteModalTransaction = transaction;
    // compute how many parcels are in the same group
    if (transaction.installmentGroupId) {
      // Prefer the `installments` number present on the transaction (total group size)
      if (transaction.installments && transaction.installments > 1) {
        this.deleteModalCount = transaction.installments;
      } else {
        this.deleteModalCount = this.transactions.filter(t => t.installmentGroupId === transaction.installmentGroupId).length || 1;
      }
    } else {
      this.deleteModalCount = 1;
    }
    this.showDeleteModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteModalTransaction = null;
    document.body.style.overflow = 'auto';
  }

  confirmDelete(): void {
    if (!this.deleteModalTransaction) return;
    const id = this.deleteModalTransaction.id;
    // If this parcel belongs to an installment group, delete the whole group
    const deleteGroup = !!this.deleteModalTransaction.installmentGroupId;
    this.transactionService.deleteTransactionGroup(id, deleteGroup).subscribe({
      next: (res) => {
        if (deleteGroup) {
          const gid = this.deleteModalTransaction?.installmentGroupId;
          if (gid) this.transactions = this.transactions.filter(t => t.installmentGroupId !== gid);
        } else {
          this.transactions = this.transactions.filter(t => t.id !== id);
        }
        this.closeDeleteModal();
        this.loadTransactions();
      },
      error: (error) => { this.closeDeleteModal(); alert(`Error: ${error.error?.message || 'Failed to delete transaction(s)'}`); }
    });
  }

  openPayModal(transaction: Transaction): void {
    this.payModalTransaction = transaction;
    // collect future installments (same installmentGroupId and installmentNumber > current)
    if (transaction.installmentGroupId) {
      this.payModalFutureInstallments = this.transactions
        .filter(t => t.installmentGroupId === transaction.installmentGroupId && (t.installmentNumber || 0) > (transaction.installmentNumber || 0))
        .sort((a,b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
    } else {
      this.payModalFutureInstallments = [];
    }

    this.showPayModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePayModal(): void {
    this.showPayModal = false;
    this.payModalTransaction = null;
    document.body.style.overflow = 'auto';
  }

  confirmPay(markPrevious: boolean): void {
    if (!this.payModalTransaction) return;
    const id = this.payModalTransaction.id;
    this.transactionService.payInstallmentEarly(id, markPrevious).subscribe({
      next: () => { this.closePayModal(); this.loadTransactions(); },
      error: (error) => { this.closePayModal(); alert(`Error: ${error.error?.message || 'Failed to pay installment early'}`); }
    });
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
      // month filter (t.rawDate expected as ISO date string)
      let matchesMonth = true;
      if (this.selectedMonth) {
        try {
          const [y, m] = this.selectedMonth.split('-').map(Number);
          const td = new Date(t.rawDate || t.date);
          matchesMonth = td.getFullYear() === y && (td.getMonth() + 1) === m;
        } catch {
          matchesMonth = true;
        }
      }
      return matchesSearch && matchesCategory && matchesType && matchesMonth;
    });
  }

  switchType(type: 'Credit' | 'Debit' | 'Income'): void {
    if (this.selectedType === type) return;
    this.selectedType = type;
    this.loadTransactions();
  }

  onMonthChange(): void {
    // reload transactions for the new month (server may ignore month filter; client filters too)
    this.loadTransactions();
  }

  openMonthPicker(): void {
    this.showMonthPicker = true;
  }

  closeMonthPicker(): void {
    this.showMonthPicker = false;
  }

  selectMonthIndex(monthIndex: number): void {
    // monthIndex is 0-based
    const year = this.selectedMonth ? Number(this.selectedMonth.split('-')[0]) : new Date().getFullYear();
    const mm = String(monthIndex + 1).padStart(2, '0');
    this.selectedMonth = `${year}-${mm}`;
    this.showMonthPicker = false;
    this.onMonthChange();
  }

  getSelectedMonthLabel(): string {
    if (!this.selectedMonth) return '';
    const [y, m] = this.selectedMonth.split('-').map(Number);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${monthNames[m - 1]} ${y}`;
  }

  getPickerYear(): number {
    if (this.selectedMonth) return Number(this.selectedMonth.split('-')[0]);
    return new Date().getFullYear();
  }

  isSelectedMonthIndex(i: number): boolean {
    if (!this.selectedMonth) return false;
    const [y, m] = this.selectedMonth.split('-').map(Number);
    return y === this.getPickerYear() && m === (i + 1);
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
            rawDate: t.date,
            amount: t.amount,
            status: t.status,
            type: t.type,
            installments: t.installments,
            installmentNumber: t.installmentNumber,
            installmentGroupId: t.installmentGroupId,
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

    private toDateInputValue(dateValue: string): string {
      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return '';
      }

      return date.toISOString().split('T')[0];
    }
}
