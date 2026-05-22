import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../services/transaction.service';

interface BudgetCategory {
  name: string;
  spent: number;
  percentage: number;
  colorStart: string;
  colorEnd: string;
}

@Component({
  selector: 'app-budget',
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss'
})
export class BudgetComponent implements OnInit, OnDestroy {
  userInitials = 'AA';
  userName = 'User';
  // Modern color picker palette
  paletteColors: string[] = ['#45e0a1', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#10b981', '#8b5cf6', '#f43f5e'];
  openPaletteFor: string | null = null;

  public changeCategoryColor(category: BudgetCategory, color: string): void {
    if (!category) return;
    category.colorStart = color;
    category.colorEnd = color;
    // persist into app_categories in localStorage
    try {
      const raw = localStorage.getItem('app_categories');
      const parsed = raw ? JSON.parse(raw) : [];
      const nameKey = category.name;
      const existing = parsed.find((c: any) => c.name === nameKey);
      if (existing) {
        existing.colorStart = color;
        existing.colorEnd = color;
      } else {
        parsed.push({ name: nameKey, percentage: category.percentage || 0, colorStart: color, colorEnd: color });
      }
      localStorage.setItem('app_categories', JSON.stringify(parsed));
    } catch (e) {
      // ignore storage errors
    }
    // close palette if open
    this.openPaletteFor = null;
  }

  togglePalette(category: BudgetCategory): void {
    if (!category) return;
    this.openPaletteFor = this.openPaletteFor === category.name ? null : category.name;
  }
  isUserMenuOpen = false;
  isSidebarOpen = false;
  currentMonth = '';
  daysRemaining = 0;
  isEditFormOpen = false;
  monthlyBudget = 0;
  formBudget: number | string = '';
  categories: BudgetCategory[] = [];
  editCategories: BudgetCategory[] = [];
  totalSpent = 0;
  totalIncome = 0;
  remaining = 0;
  onTrackCount = 0;
  private transactionsSub?: Subscription;
  private installmentSub?: Subscription;

  constructor(private readonly router: Router, private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadSidebarState();
    this.loadBudgetData();
    this.calculateMonthInfo();
    this.loadTransactionsForBudget();
    // subscribe to transaction changes for real-time sync
    this.transactionsSub = this.transactionService.transactionsChanged.subscribe((txs) => {
      if (Array.isArray(txs)) {
        try {
          // Filter incoming transactions to the current budget month
          const today = new Date();
          const year = today.getFullYear();
          const monthIndex = today.getMonth();
          const monthTxs = (txs as any[]).filter((t) => {
            const dateStr = t?.date || t?.rawDate;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return false;
            return d.getFullYear() === year && d.getMonth() === monthIndex;
          });
          this.updateBudgetFromTransactions(monthTxs);
        } catch {
          this.updateBudgetFromTransactions(txs as any[]);
        }
      } else {
        this.loadTransactionsForBudget();
      }
    });
    // listen for installment-paid events and update budget for the month the installment was actually paid
    this.installmentSub = this.transactionService.installmentPaid.subscribe((tx) => {
      try {
        const paidDateIso = tx?.date || tx?.paidDate || new Date().toISOString().split('T')[0];
        const d = new Date(paidDateIso);
        if (Number.isNaN(d.getTime())) return;
        const year = d.getFullYear();
        const monthIndex = d.getMonth();
        const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
        const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
        const filters = { startDate, endDate };
        this.transactionService.getTransactions(filters).subscribe({
          next: (response) => {
            const txs = response.transactions || [];
            this.updateBudgetFromTransactions(txs);
          },
          error: () => {
            // ignore errors
          }
        });
      } catch {
        // ignore
      }
    });
  }

  ngOnDestroy(): void {
    if (this.transactionsSub) this.transactionsSub.unsubscribe();
    if (this.installmentSub) this.installmentSub.unsubscribe();
  }

  private loadTransactionsForBudget(): void {
    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
    const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

    const filters = { startDate, endDate };

    this.transactionService.getTransactions(filters).subscribe({
      next: (response) => {
        const txs = response.transactions || [];
        this.updateBudgetFromTransactions(txs);
      },
      error: () => {
        // If API fails, keep existing hardcoded/spent values
      }
    });
  }

  private updateBudgetFromTransactions(transactions: any[]): void {
    const expenseTypes = ['Credit', 'Debit'];
    const incomeTypes = ['Income'];
    const isExpenseType = (t: any) => expenseTypes.includes(t?.type);

    const existingColors = new Set<string>();
    this.categories.forEach(c => { if (c.colorStart) existingColors.add(c.colorStart.toLowerCase()); });

    const generateUniqueColor = () => {
      let attempts = 0;
      let color = '';
      do {
        color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        attempts++;
      } while (existingColors.has(color.toLowerCase()) && attempts < 64);
      existingColors.add(color.toLowerCase());
      return color;
    };

    const normalizeKey = (s: any) => String(s === undefined || s === null ? 'Uncategorized' : String(s)).trim().toLowerCase().replace(/\s+/g, ' ');
    const displayName = (s: any) => (s === undefined || s === null) ? 'Uncategorized' : String(s).trim();

    // compute total spent and income
    this.totalSpent = transactions.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      return acc + (isExpenseType(t) ? Math.abs(amt) : 0);
    }, 0);

    this.totalIncome = transactions.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      return acc + (incomeTypes.includes(t.type) ? Math.abs(amt) : 0);
    }, 0);

    this.remaining = this.totalIncome - this.totalSpent;

    // If the user hasn't set a custom monthly budget, use total income as the default
    try {
      const savedBudget = localStorage.getItem('monthly_budget');
      if (savedBudget === null) {
        this.monthlyBudget = this.totalIncome;
      }
    } catch {}

    // update per-category spent values
    // build a map of spent per normalized category name from transactions
    const spentMap: Record<string, number> = {};
    const txNames: Set<string> = new Set();
    const displayMap: Record<string, string> = {};
    transactions.forEach((t) => {
      const rawName = t.category;
      const key = normalizeKey(rawName);
      const disp = displayName(rawName);
      if (!displayMap[key]) displayMap[key] = disp;
      if (isExpenseType(t)) {
        txNames.add(key);
        spentMap[key] = (spentMap[key] || 0) + Math.abs(Number(t.amount) || 0);
      } else {
        if (key) txNames.add(key);
      }
    });

    // debug info removed

    // map existing categories by normalized name (existing colors already collected)
    const existingMap: Record<string, BudgetCategory> = {};
    this.categories.forEach((c) => {
      existingMap[normalizeKey(c.name)] = c;
    });

    // attempt to preserve color info from existingMap, else create defaults
    const merged: BudgetCategory[] = [];

    // include saved/existing categories first (preserve display name)
    Object.keys(existingMap).forEach((normName) => {
      const c = existingMap[normName];
      merged.push({ ...c, spent: spentMap[normName] || 0 });
    });

    // add any categories found in transactions that aren't present yet
    txNames.forEach((normName) => {
      if (!existingMap[normName]) {
        const colorStart = generateUniqueColor();
        const colorEnd = colorStart; // single solid color
        const disp = displayMap[normName] || normName;
        merged.push({ name: disp, spent: spentMap[normName] || 0, percentage: 0, colorStart, colorEnd });
      }
    });

    this.categories = merged;

    // persist merged categories so transactions page can read them
    try {
      const toSave = this.categories.map(c => ({ name: c.name, percentage: c.percentage, colorStart: c.colorStart, colorEnd: c.colorEnd }));
      localStorage.setItem('app_categories', JSON.stringify(toSave));
    } catch {}

    // compute on-track count (categories not above their budget)
    this.onTrackCount = this.categories.filter((c) => c.spent <= this.getCategoryBudget(c)).length;
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
    // close any open palette when clicking outside
    if (!target.closest('.color-popover') && !target.closest('.swatch-wrapper')) {
      this.openPaletteFor = null;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeUserMenu();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    localStorage.setItem('sidebar_open', JSON.stringify(this.isSidebarOpen));
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

  getContrastColor(hex: string): string {
    if (!hex) return '#ffffff';
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
  }

  private calculateMonthInfo(): void {
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const year = today.getFullYear();
    const monthIndex = today.getMonth();

    this.currentMonth = monthNames[monthIndex];

    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    const currentDay = today.getDate();

    this.daysRemaining = lastDayOfMonth - currentDay + 1;
  }

  toggleEditForm(): void {
    this.isEditFormOpen = !this.isEditFormOpen;

    if (this.isEditFormOpen) {
      this.formBudget = this.monthlyBudget;
      this.editCategories = this.cloneCategories(this.categories);
    } else {
      this.formBudget = '';
      this.editCategories = [];
    }
  }

  saveBudget(): void {
    if (!this.formBudget || Number(this.formBudget) <= 0) {
      return;
    }

    this.monthlyBudget = Number(this.formBudget);
    this.categories = this.cloneCategories(this.editCategories);
    localStorage.setItem('monthly_budget', JSON.stringify(this.monthlyBudget));
    localStorage.setItem('monthly_budget_categories', JSON.stringify(this.serializeCategories(this.categories)));
    this.isEditFormOpen = false;
    this.formBudget = '';
    this.editCategories = [];
  }

  confirmChanges(): void {
    this.saveBudget();
  }

  cancelEdit(): void {
    this.isEditFormOpen = false;
    this.formBudget = '';
    this.editCategories = [];
  }

  getCategoryBudget(category: BudgetCategory): number {
    return (this.monthlyBudget * category.percentage) / 100;
  }

  getCategoryRemaining(category: BudgetCategory): number {
    return this.getCategoryBudget(category) - category.spent;
  }

  getCategoryProgress(category: BudgetCategory): number {
    const categoryBudget = this.getCategoryBudget(category);
    if (categoryBudget <= 0) {
      return 0;
    }

    return Math.min((category.spent / categoryBudget) * 100, 100);
  }

  getCategoryStatusLabel(category: BudgetCategory): string {
    const remaining = this.getCategoryRemaining(category);

    if (remaining >= 0) {
      return `R$${remaining.toFixed(0)} left`;
    }

    return `Over R$${Math.abs(remaining).toFixed(0)}`;
  }

  getTotalCategoryPercentage(categories: BudgetCategory[] = this.categories): number {
    return categories.reduce((total, category) => total + Number(category.percentage || 0), 0);
  }

  getAvailableBudget(): number {
    return this.monthlyBudget - this.categories.reduce((total, category) => total + this.getCategoryBudget(category), 0);
  }

  trackByCategoryName(index: number, category: BudgetCategory): string {
    return category.name;
  }

  private cloneCategories(categories: BudgetCategory[]): BudgetCategory[] {
    return categories.map((category) => ({ ...category }));
  }

  private serializeCategories(categories: BudgetCategory[]): Record<string, number> {
    return categories.reduce((accumulator, category) => {
      accumulator[category.name] = category.percentage;
      return accumulator;
    }, {} as Record<string, number>);
  }

  private loadBudgetData(): void {
    const savedBudget = localStorage.getItem('monthly_budget');
    if (savedBudget) {
      this.monthlyBudget = Number(JSON.parse(savedBudget));
    }

    const savedCategories = localStorage.getItem('monthly_budget_categories');
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories) as Record<string, number>;
        // load colors from app_categories if available
        const rawAppCats = localStorage.getItem('app_categories');
        let appCatMap: Record<string, any> = {};
        if (rawAppCats) {
          try { (JSON.parse(rawAppCats) as any[]).forEach(a => { if (a.name) appCatMap[a.name] = a; }); } catch {}
        }

        // Build categories array from saved categories (preserve colors when possible)
        const existingColors = new Set<string>();
        Object.keys(appCatMap).forEach(k => { if (appCatMap[k]?.colorStart) existingColors.add(appCatMap[k].colorStart.toLowerCase()); });
        const generateUniqueColor = () => {
          let attempts = 0;
          let color = '';
          do {
            color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            attempts++;
          } while (existingColors.has(color.toLowerCase()) && attempts < 64);
          existingColors.add(color.toLowerCase());
          return color;
        };

        this.categories = Object.keys(parsedCategories).map((name) => {
          const pct = parsedCategories[name];
          const app = appCatMap[name] || {};
          const colorStart = app.colorStart || generateUniqueColor();
          return {
            name,
            spent: 0,
            percentage: typeof pct === 'number' ? pct : 0,
            colorStart: colorStart,
            colorEnd: colorStart
          } as BudgetCategory;
        });
      } catch {
        this.categories = this.cloneCategories(this.categories);
      }
    }
  }
}
