/**
 * @module tax-maroc
 * @description
 * BazNova — Moroccan Tax & Financial System
 *
 * Server-side only library for Moroccan tax calculations, invoice generation helpers,
 * revenue/expense tracking, tax declaration preparation, and financial reporting.
 *
 * Covers:
 *   - IS (Impôt sur les Sociétés) — Corporate Income Tax at 30 %
 *   - TVA (Taxe sur la Valeur Ajoutée) — VAT at 20 / 14 / 10 / 7 %
 *   - CNSS (Caisse Nationale de Sécurité Sociale) — Employer contributions ~25 %
 *   - IR (Impôt sur le Revenu) — Personal Income Tax brackets
 *   - Tax identification number (IF) helpers
 *   - Invoice generation types & helpers
 *   - Revenue / expense tracking types
 *   - Monthly & quarterly tax declaration helpers
 *   - Financial report types (P&L, balance sheet summary)
 *
 * All monetary amounts are stored in **centimes** (smallest MAD unit) to avoid
 * floating-point precision issues, unless a function explicitly documents otherwise.
 *
 * @since  2025
 * @version 1.0.0
 */

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

/**
 * Moroccan TVA (VAT) rate categories as defined by the General Tax Code (CGI).
 *
 * | Rate | Applicable goods / services                                  |
 * |------|--------------------------------------------------------------|
 * | 20 % | General rate — most goods & services, SaaS, software        |
 * | 14 % | Transport, hospitality, catering                            |
 * | 10 % | Banking, financial services, certain food products           |
 * |  7 % | Essential goods (water, electricity, basic foodstuffs)        |
 * |  0 % | Exports, specific exempt activities                          |
 */
export enum TvaRate {
  /** Standard rate for most goods and services including SaaS / software */
  STANDARD = 20,
  /** Transport, hospitality, and catering services */
  TRANSPORT_HOSPITALITY = 14,
  /** Banking and financial services */
  BANKING = 10,
  /** Essential goods (water, electricity, basic foodstuffs) */
  ESSENTIAL = 7,
  /** Exports and specific exempt activities */
  EXEMPT = 0,
}

/**
 * Maps a descriptive key to the TVA rate for look-up by product/service type.
 */
export const TVA_RATE_BY_CATEGORY: Record<string, TvaRate> = {
  saas: TvaRate.STANDARD,
  software: TvaRate.STANDARD,
  consulting: TvaRate.STANDARD,
  training: TvaRate.STANDARD,
  transport: TvaRate.TRANSPORT_HOSPITALITY,
  hospitality: TvaRate.TRANSPORT_HOSPITALITY,
  catering: TvaRate.TRANSPORT_HOSPITALITY,
  banking: TvaRate.BANKING,
  financial: TvaRate.BANKING,
  insurance: TvaRate.BANKING,
  water: TvaRate.ESSENTIAL,
  electricity: TvaRate.ESSENTIAL,
  food_basic: TvaRate.ESSENTIAL,
  export: TvaRate.EXEMPT,
}

/**
 * IS (Impôt sur les Sociétés) / Corporate Income Tax configuration.
 *
 * Standard rate is 30 % for most companies.
 * Reduced rates apply for specific sectors (agriculture, fishing, handicraft).
 */
export const IS_CONFIG = {
  /** Standard corporate tax rate in % */
  STANDARD_RATE: 30,
  /** Reduced rate for cooperatives (agricultural) */
  COOPERATIVE_RATE: 0,
  /** Minimum tax (cotisation minimale) as % of turnover — capped at 0.5 % */
  MIN_TAX_RATE: 0.5,
  /** Minimum tax floor in MAD centimes (varies by legal form) */
  MIN_TAX_FLOOR: 1_500_00, // 1,500 MAD in centimes
} as const

/**
 * CNSS (Caisse Nationale de Sécurité Sociale) employer contribution rates.
 * All rates are percentages of the employee's gross salary (capped).
 */
export const CNSS_CONFIG = {
  /** Total employer CNSS contribution rate */
  EMPLOYER_RATE: 25.59,
  /** Family allocation — employer share */
  FAMILY_ALLOWANCE: 6.4,
  /** AMO (Assurance Maladie Obligatoire) — employer share */
  AMO_EMPLOYER: 4.11,
  /** Pension — employer share */
  PENSION_EMPLOYER: 8.62,
  /** Work-related injury (AT/MP) — employer share (varies by industry) */
  AT_MP: 1.5,
  /** Indemnité de congé — employer share */
  CONGE: 1.96,
  /** CNSS salary ceiling in MAD centimes per month */
  MONTHLY_CEILING_CENTIMES: 60_000_00, // 60,000 MAD / month
  /** AMO has no ceiling */
  AMO_NO_CEILING: true,
} as const

/**
 * IR (Impôt sur le Revenu) — Personal Income Tax brackets for salary earners.
 * Each bracket defines the upper limit (in MAD) and the applicable marginal rate.
 * The base for IR is the net taxable salary (salaire net imposable).
 */
export const IR_BRACKETS: ReadonlyArray<{
  /** Upper limit of the bracket in MAD (annual) */
  upperLimit: number
  /** Marginal tax rate in % */
  rate: number
  /** Cumulative deduction in MAD */
  deduction: number
}> = [
  { upperLimit: 40_000,  rate: 0,   deduction: 0 },
  { upperLimit: 50_000,  rate: 10,  deduction: 4_000 },
  { upperLimit: 60_000,  rate: 20,  deduction: 9_000 },
  { upperLimit: 80_000,  rate: 30,  deduction: 15_000 },
  { upperLimit: 180_000, rate: 34,  deduction: 18_200 },
  { upperLimit: Infinity, rate: 38,  deduction: 25_400 },
] as const

/**
 * Professional expenses deduction rate (default 20 % for most employees).
 */
export const IR_DEDUCTIONS = {
  /** Standard professional expenses deduction rate */
  PROFESSIONAL_RATE: 20,
  /** Maximum professional deduction in MAD per year */
  PROFESSIONAL_CAP: 30_000,
  /** Social contributions deduction rate */
  SOCIAL_RATE: 100, // CNSS employee share is fully deductible
  /** Standard employee CNSS share */
  EMPLOYEE_CNSS_RATE: 6.40,
  /** AMO employee share */
  EMPLOYEE_AMO_RATE: 2.26,
} as const

/**
 * Tax declaration periods recognised by the Moroccan tax authority (DGI).
 */
export enum DeclarationPeriod {
  /** Monthly TVA declaration */
  MONTHLY = 'monthly',
  /** Quarterly TVA declaration (for small businesses) */
  QUARTERLY = 'quarterly',
  /** Annual IS declaration */
  ANNUAL = 'annual',
}

/**
 * Fiscal year quarters in Morocco (January–December calendar year).
 */
export const FISCAL_QUARTERS = [
  { quarter: 1, months: [1, 2, 3],  label: 'Q1 (Jan–Mar)' } as const,
  { quarter: 2, months: [4, 5, 6],  label: 'Q2 (Apr–Jun)' } as const,
  { quarter: 3, months: [7, 8, 9],  label: 'Q3 (Jul–Sep)' } as const,
  { quarter: 4, months: [10, 11, 12], label: 'Q4 (Oct–Dec)' } as const,
] as const

/**
 * Standard Moroccan fiscal year start and end months.
 */
export const FISCAL_YEAR = { startMonth: 1, endMonth: 12 } as const

/**
 * TVA declaration deadlines (day of the month following the period).
 */
export const TVA_DEADLINES = {
  /** Monthly TVA declaration due date */
  MONTHLY_DUE_DAY: 19,
  /** Quarterly TVA declaration due date */
  QUARTERLY_DUE_DAY: 19,
  /** Annual IS declaration due date (month) */
  IS_DUE_MONTH: 4, // April
  /** Annual IS declaration due date (day) */
  IS_DUE_DAY: 30,
} as const

// ============================================================================
// 2. CORE TYPES
// ============================================================================

/**
 * Moroccan fiscal entity identification.
 */
export interface TaxIdentity {
  /** Tax identification number — Identifiant Fiscal (IF) */
  identifiantFiscal: string
  /** Trade register number — Registre de Commerce (RC) */
  registreCommerce?: string
  /** CNSS registration number */
  cnssNumber?: string
  /** ICE — Identifiant Commun de l'Entreprise (8 digits) */
  ice?: string
  /** Legal form (SA, SARL, SARL AU, SAS, etc.) */
  legalForm?: string
  /** Company name */
  raisonSociale: string
  /** Registered address */
  adresse: string
  /** City */
  ville: string
  /** Postal code */
  codePostal?: string
  /** Phone number */
  telephone?: string
  /** Tax authority centre (centre des impôts) */
  centreImpots?: string
}

/**
 * A single TVA line item within an invoice or tax calculation.
 */
export interface TvaLineItem {
  /** Short description of the good / service */
  description: string
  /** Category key for TVA rate lookup */
  category: string
  /** HT amount in centimes (excluding TVA) */
  amountHtCentimes: number
  /** Applied TVA rate */
  tvaRate: TvaRate
  /** TVA amount in centimes */
  tvaAmountCentimes: number
  /** TTC amount in centimes (HT + TVA) */
  amountTtcCentimes: number
}

/**
 * Result of a TVA calculation on one or more line items.
 */
export interface TvaCalculationResult {
  /** Individual line items with TVA breakdown */
  items: TvaLineItem[]
  /** Total HT in centimes */
  totalHtCentimes: number
  /** Total TVA in centimes */
  totalTvaCentimes: number
  /** Total TTC in centimes */
  totalTtcCentimes: number
  /** Breakdown by TVA rate */
  byRate: Record<number, { htCentimes: number; tvaCentimes: number; ttcCentimes: number }>
}

/**
 * IS (Corporate Tax) calculation result.
 */
export interface IsCalculationResult {
  /** Gross revenue in centimes */
  revenueCentimes: number
  /** Deductible expenses in centimes */
  expensesCentimes: number
  /** Taxable profit (revenu fiscal) in centimes */
  taxableProfitCentimes: number
  /** IS rate applied */
  rate: number
  /** IS amount due in centimes */
  isDueCentimes: number
  /** Cotisation minimale (minimum tax) in centimes */
  cotisationMinimaleCentimes: number
  /** Final IS to pay (max of IS and cotisation minimale) */
  totalIsCentimes: number
  /** Quarterly IS instalments (4 equal payments) in centimes */
  quarterlyInstalmentCentimes: number
}

/**
 * CNSS (Social Security) calculation result for a single employee.
 */
export interface CnssCalculationResult {
  /** Employee's gross monthly salary in centimes */
  grossSalaryCentimes: number
  /** Capped salary base for CNSS in centimes */
  cappedBaseCentimes: number
  /** Employer CNSS total in centimes */
  employerTotalCentimes: number
  /** Breakdown of employer contributions */
  employerBreakdown: {
    familyAllowanceCentimes: number
    amoCentimes: number
    pensionCentimes: number
    atMpCentimes: number
    congeCentimes: number
  }
  /** Employee CNSS share (pension only) in centimes */
  employeePensionCentimes: number
  /** Employee AMO share in centimes */
  employeeAmoCentimes: number
  /** Total employee deductions in centimes */
  employeeTotalCentimes: number
  /** Net salary after employee deductions in centimes */
  netSalaryCentimes: number
}

/**
 * IR (Personal Income Tax) calculation result.
 */
export interface IrCalculationResult {
  /** Annual gross salary in MAD (not centimes — IR brackets use MAD) */
  annualGrossMad: number
  /** Professional expenses deduction in MAD */
  professionalDeductionMad: number
  /** Employee social deductions (CNSS + AMO) in MAD */
  socialDeductionsMad: number
  /** Net taxable salary (SNI) in MAD */
  netTaxableMad: number
  /** IR due in MAD */
  irDueMad: number
  /** Monthly IR deduction in MAD */
  monthlyIrMad: number
  /** Effective tax rate */
  effectiveRate: number
  /** Bracket details used */
  bracketDetails: {
    upperLimit: number
    rate: number
    deduction: number
  }
}

// ============================================================================
// 3. INVOICE TYPES
// ============================================================================

/**
 * Invoice status lifecycle.
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Accepted payment methods for Moroccan invoices.
 */
export type InvoicePaymentMethod =
  | 'bank_transfer'
  | 'card'
  | 'cash'
  | 'cheque'
  | 'mobile_payment'

/**
 * A single invoice line item.
 */
export interface InvoiceLineItem {
  /** Unique line identifier */
  id: string
  /** Product / service description */
  description: string
  /** Quantity */
  quantity: number
  /** Unit price in centimes (HT) */
  unitPriceCentimes: number
  /** TVA rate */
  tvaRate: TvaRate
  /** HT line total in centimes */
  totalHtCentimes: number
  /** TVA amount in centimes */
  tvaCentimes: number
  /** TTC line total in centimes */
  totalTtcCentimes: number
  /** Optional reference to a subscription or product ID */
  referenceId?: string
}

/**
 * Full invoice data structure compliant with Moroccan tax requirements.
 */
export interface Invoice {
  /** Unique invoice identifier (e.g., "FAC-2025-0001") */
  invoiceNumber: string
  /** Invoice status */
  status: InvoiceStatus
  /** Date of issue (ISO 8601) */
  issuedAt: string
  /** Due date (ISO 8601) */
  dueAt: string
  /** Seller / company information */
  seller: TaxIdentity
  /** Buyer / client information */
  buyer: {
    name: string
    adresse: string
    ville: string
    codePostal?: string
    identifiantFiscal?: string
    ice?: string
    telephone?: string
    email?: string
  }
  /** Invoice line items */
  items: InvoiceLineItem[]
  /** Total HT in centimes */
  totalHtCentimes: number
  /** Total TVA in centimes */
  totalTvaCentimes: number
  /** TVA breakdown by rate */
  tvaBreakdown: Record<number, { htCentimes: number; tvaCentimes: number }>
  /** Total TTC in centimes */
  totalTtcCentimes: number
  /** Amount already paid in centimes */
  amountPaidCentimes: number
  /** Remaining balance in centimes */
  balanceDueCentimes: number
  /** Payment method (if paid) */
  paymentMethod?: InvoicePaymentMethod
  /** Payment date (ISO 8601) */
  paidAt?: string
  /** Currency (default MAD) */
  currency: string
  /** Notes / terms */
  notes?: string
  /** Timbre fiscal (stamp duty) in centimes */
  timbreFiscalCentimes: number
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * Input for creating a new invoice.
 */
export interface CreateInvoiceInput {
  /** Seller tax identity */
  seller: TaxIdentity
  /** Buyer information */
  buyer: Invoice['buyer']
  /** Line items to include */
  items: Array<{
    description: string
    quantity: number
    unitPriceCentimes: number
    tvaRate: TvaRate
    referenceId?: string
  }>
  /** Issue date (ISO 8601), defaults to now */
  issuedAt?: string
  /** Payment terms in days, defaults to 30 */
  paymentTermsDays?: number
  /** Currency, defaults to MAD */
  currency?: string
  /** Notes / terms */
  notes?: string
  /** Whether to apply timbre fiscal */
  applyTimbreFiscal?: boolean
}

// ============================================================================
// 4. REVENUE & EXPENSE TRACKING TYPES
// ============================================================================

/**
 * Revenue / expense entry category.
 */
export type TransactionCategory =
  | 'subscription'
  | 'one_time_sale'
  | 'consulting'
  | 'training'
  | 'freelance_commission'
  | 'api_access'
  | 'white_label'
  | 'salary'
  | 'server_infrastructure'
  | 'ai_compute'
  | 'marketing'
  | 'office_rent'
  | 'utilities'
  | 'professional_services'
  | 'banking_fees'
  | 'insurance'
  | 'tax_payment'
  | 'other'

/**
 * Whether a transaction is revenue or an expense.
 */
export type TransactionType = 'revenue' | 'expense'

/**
 * A revenue or expense record for financial tracking.
 */
export interface FinancialTransaction {
  /** Unique identifier */
  id: string
  /** Revenue or expense */
  type: TransactionType
  /** Category */
  category: TransactionCategory
  /** Amount in centimes */
  amountCentimes: number
  /** TVA amount in centimes (if applicable) */
  tvaCentimes: number
  /** TVA rate applied */
  tvaRate: TvaRate
  /** Description */
  description: string
  /** Reference (invoice number, receipt, etc.) */
  reference?: string
  /** Associated invoice ID */
  invoiceId?: string
  /** Date of transaction (ISO 8601) */
  date: string
  /** Fiscal year */
  fiscalYear: number
  /** Fiscal month (1–12) */
  fiscalMonth: number
  /** Whether the item is tax-deductible */
  taxDeductible: boolean
  /** Whether the item has been reconciled */
  reconciled: boolean
  /** Tags for filtering */
  tags: string[]
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * Monthly aggregated financial summary.
 */
export interface MonthlyFinancialSummary {
  /** Fiscal year */
  year: number
  /** Month (1–12) */
  month: number
  /** Total revenue in centimes */
  revenueCentimes: number
  /** Total expenses in centimes */
  expensesCentimes: number
  /** Net profit in centimes */
  netProfitCentimes: number
  /** Total TVA collected (on sales) in centimes */
  tvaCollectedCentimes: number
  /** Total TVA paid (on purchases) in centimes */
  tvaPaidCentimes: number
  /** Net TVA payable to government in centimes (collected − paid, min 0) */
  tvaNetPayableCentimes: number
  /** Number of transactions */
  transactionCount: number
  /** Revenue by category */
  revenueByCategory: Partial<Record<TransactionCategory, number>>
  /** Expenses by category */
  expensesByCategory: Partial<Record<TransactionCategory, number>>
}

/**
 * Quarterly aggregated financial summary.
 */
export interface QuarterlyFinancialSummary {
  /** Fiscal year */
  year: number
  /** Quarter (1–4) */
  quarter: number
  /** Label (e.g. "Q1 (Jan–Mar)") */
  label: string
  /** Months included */
  months: MonthlyFinancialSummary[]
  /** Total revenue in centimes */
  revenueCentimes: number
  /** Total expenses in centimes */
  expensesCentimes: number
  /** Net profit in centimes */
  netProfitCentimes: number
  /** Total TVA collected in centimes */
  tvaCollectedCentimes: number
  /** Total TVA paid in centimes */
  tvaPaidCentimes: number
  /** Net TVA payable in centimes */
  tvaNetPayableCentimes: number
}

// ============================================================================
// 5. TAX DECLARATION TYPES
// ============================================================================

/**
 * Status of a tax declaration filing.
 */
export enum DeclarationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  FILED = 'filed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

/**
 * TVA declaration data for a given period.
 */
export interface TvaDeclaration {
  /** Declaration period */
  period: DeclarationPeriod
  /** Fiscal year */
  year: number
  /** Period number (month 1–12, or quarter 1–4) */
  periodNumber: number
  /** Label (e.g. "January 2025", "Q1 2025") */
  label: string
  /** Declaration status */
  status: DeclarationStatus
  /** Total sales (HT) in centimes */
  totalSalesHtCentimes: number
  /** Total TVA collected on sales in centimes */
  tvaCollectedCentimes: number
  /** Total purchases (HT) in centimes */
  totalPurchasesHtCentimes: number
  /** Total TVA paid on purchases in centimes */
  tvaPaidCentimes: number
  /** Net TVA payable (collected − paid) in centimes */
  tvaNetPayableCentimes: number
  /** Whether a credit balance is carried forward */
  creditCarryForward: boolean
  /** TVA credit carried forward from prior period in centimes */
  priorCreditCentimes: number
  /** TVA credit to carry forward to next period in centimes */
  creditForwardCentimes: number
  /** Amount due after credit in centimes */
  amountDueCentimes: number
  /** Due date (ISO 8601) */
  dueDate: string
  /** Filing date (ISO 8601), if filed */
  filedAt?: string
  /** Payment date (ISO 8601), if paid */
  paidAt?: string
  /** Reference number from the tax authority */
  referenceNumber?: string
  /** TVA breakdown by rate */
  tvaBreakdown: Record<number, { collectedCentimes: number; paidCentimes: number }>
}

/**
 * IS (Corporate Tax) annual declaration.
 */
export interface IsDeclaration {
  /** Fiscal year */
  year: number
  /** Declaration status */
  status: DeclarationStatus
  /** Gross revenue in centimes */
  revenueCentimes: number
  /** Deductible expenses in centimes */
  expensesCentimes: number
  /** Non-deductible expenses in centimes (fines, entertainment > limits, etc.) */
  nonDeductibleCentimes: number
  /** Taxable profit in centimes */
  taxableProfitCentimes: number
  /** IS rate */
  rate: number
  /** IS calculated in centimes */
  isCalculatedCentimes: number
  /** Cotisation minimale in centimes */
  cotisationMinimaleCentimes: number
  /** IS paid via quarterly instalments in centimes */
  instalmentsPaidCentimes: number
  /** Balance due in centimes */
  balanceDueCentimes: number
  /** Due date (ISO 8601) */
  dueDate: string
  /** Filed date (ISO 8601) */
  filedAt?: string
  /** Payment date (ISO 8601) */
  paidAt?: string
  /** Reference number */
  referenceNumber?: string
}

/**
 * CNSS monthly declaration.
 */
export interface CnssDeclaration {
  /** Declaration month */
  year: number
  /** Month (1–12) */
  month: number
  /** Status */
  status: DeclarationStatus
  /** Number of declared employees */
  employeeCount: number
  /** Total declared salaries in centimes */
  totalSalariesCentimes: number
  /** Total employer contributions in centimes */
  employerContributionsCentimes: number
  /** Total employee deductions in centimes */
  employeeDeductionsCentimes: number
  /** Due date (ISO 8601) */
  dueDate: string
  /** Filed date */
  filedAt?: string
  /** Paid date */
  paidAt?: string
}

// ============================================================================
// 6. FINANCIAL REPORT TYPES
// ============================================================================

/**
 * Profit & Loss (P&L) / Compte de Résultat report.
 */
export interface ProfitAndLossReport {
  /** Report title */
  title: string
  /** Fiscal year */
  fiscalYear: number
  /** Period label */
  periodLabel: string
  /** Start date (ISO 8601) */
  startDate: string
  /** End date (ISO 8601) */
  endDate: string
  /** Currency */
  currency: string
  /** Revenue section */
  revenue: PnlSection
  /** Expenses section */
  expenses: PnlSection
  /** Total revenue in centimes */
  totalRevenueCentimes: number
  /** Total expenses in centimes */
  totalExpensesCentimes: number
  /** Operating profit (EBIT) in centimes */
  operatingProfitCentimes: number
  /** IS provision in centimes */
  isProvisionCentimes: number
  /** Net profit after tax in centimes */
  netProfitCentimes: number
  /** Net profit margin in % */
  netProfitMargin: number
  /** Monthly breakdown */
  monthlyBreakdown: MonthlyPnlLine[]
  /** Generated timestamp */
  generatedAt: string
}

/**
 * A section of the P&L (revenue or expenses) with sub-categories.
 */
export interface PnlSection {
  /** Line items grouped by category */
  categories: PnlCategoryLine[]
  /** Section total in centimes */
  totalCentimes: number
}

/**
 * A single P&L category line.
 */
export interface PnlCategoryLine {
  /** Category */
  category: TransactionCategory
  /** Amount in centimes */
  amountCentimes: number
  /** Percentage of total revenue */
  percentageOfRevenue: number
}

/**
 * Monthly P&L summary line.
 */
export interface MonthlyPnlLine {
  /** Month (1–12) */
  month: number
  /** Revenue */
  revenueCentimes: number
  /** Expenses */
  expensesCentimes: number
  /** Net profit */
  netProfitCentimes: number
  /** Cumulative net profit */
  cumulativeNetProfitCentimes: number
}

/**
 * Simplified balance sheet summary (Bilan).
 * Full Moroccan bilan has many more line items; this captures the essentials.
 */
export interface BalanceSheetSummary {
  /** Report title */
  title: string
  /** As-of date (ISO 8601) */
  asOfDate: string
  /** Currency */
  currency: string
  /** Assets section */
  assets: BalanceSheetSide
  /** Liabilities & equity section */
  liabilitiesAndEquity: BalanceSheetSide
  /** Total assets in centimes (must equal total liabilities + equity) */
  totalAssetsCentimes: number
  /** Total liabilities + equity in centimes */
  totalLiabilitiesAndEquityCentimes: number
  /** Balance check (should be 0) */
  balanceDifferenceCentimes: number
  /** Generated timestamp */
  generatedAt: string
}

/**
 * One side of the balance sheet (assets or liabilities & equity).
 */
export interface BalanceSheetSide {
  /** Current (short-term) items */
  current: BalanceSheetLineItem[]
  /** Non-current (long-term) items */
  nonCurrent: BalanceSheetLineItem[]
  /** Total for this side in centimes */
  totalCentimes: number
}

/**
 * A single balance sheet line item.
 */
export interface BalanceSheetLineItem {
  /** Item label */
  label: string
  /** Amount in centimes */
  amountCentimes: number
  /** Sub-items (for nested breakdown) */
  subItems?: BalanceSheetLineItem[]
}

// ============================================================================
// 7. TVA CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate TVA for a single amount at a given rate.
 *
 * @param amountHtCentimes - HT amount in centimes
 * @param rate - TVA rate (use TvaRate enum)
 * @returns TVA amount in centimes (rounded to nearest centime)
 *
 * @example
 * ```ts
 * calculateTvaAmount(100_00, TvaRate.STANDARD) // 20_00 (20%)
 * calculateTvaAmount(100_00, TvaRate.ESSENTIAL) // 7_00 (7%)
 * ```
 */
export function calculateTvaAmount(
  amountHtCentimes: number,
  rate: TvaRate,
): number {
  return Math.round(amountHtCentimes * (rate / 100))
}

/**
 * Calculate TVA for multiple line items and produce a detailed breakdown.
 *
 * @param items - Array of objects with description, category, and HT amount
 * @returns Full TVA calculation result with per-item, total, and per-rate breakdown
 *
 * @example
 * ```ts
 * const result = calculateTva([
 *   { description: 'SaaS Subscription', category: 'saas', amountHtCentimes: 50_000_00 },
 *   { description: 'Server Hosting', category: 'saas', amountHtCentimes: 10_000_00 },
 * ])
 * // result.totalTvaCentimes === 12_000_00
 * ```
 */
export function calculateTva(
  items: Array<{
    description: string
    category: string
    amountHtCentimes: number
    /** Override the category-based rate */
    tvaRate?: TvaRate
  }>,
): TvaCalculationResult {
  const lineItems: TvaLineItem[] = []
  const byRate: TvaCalculationResult['byRate'] = {}

  let totalHt = 0
  let totalTva = 0

  for (const item of items) {
    const rate = item.tvaRate ?? (TVA_RATE_BY_CATEGORY[item.category] ?? TvaRate.STANDARD)
    const tva = calculateTvaAmount(item.amountHtCentimes, rate)
    const ttc = item.amountHtCentimes + tva

    lineItems.push({
      description: item.description,
      category: item.category,
      amountHtCentimes: item.amountHtCentimes,
      tvaRate: rate,
      tvaAmountCentimes: tva,
      amountTtcCentimes: ttc,
    })

    totalHt += item.amountHtCentimes
    totalTva += tva

    if (!byRate[rate]) {
      byRate[rate] = { htCentimes: 0, tvaCentimes: 0, ttcCentimes: 0 }
    }
    byRate[rate].htCentimes += item.amountHtCentimes
    byRate[rate].tvaCentimes += tva
    byRate[rate].ttcCentimes += ttc
  }

  return {
    items: lineItems,
    totalHtCentimes: totalHt,
    totalTvaCentimes: totalTva,
    totalTtcCentimes: totalHt + totalTva,
    byRate,
  }
}

/**
 * Extract the TVA component from a TTC amount at a given rate.
 *
 * @param amountTtcCentimes - Total TTC amount in centimes
 * @param rate - TVA rate
 * @returns Object with HT amount and TVA amount
 */
export function extractTvaFromTtc(
  amountTtcCentimes: number,
  rate: TvaRate,
): { htCentimes: number; tvaCentimes: number } {
  // HT = TTC / (1 + rate/100)
  const divisor = 1 + rate / 100
  const ht = Math.round(amountTtcCentimes / divisor)
  return { htCentimes: ht, tvaCentimes: amountTtcCentimes - ht }
}

// ============================================================================
// 8. IS (CORPORATE TAX) CALCULATION
// ============================================================================

/**
 * Calculate the IS (Impôt sur les Sociétés) for a fiscal year.
 *
 * The IS is the greater of:
 *   1. 30 % of the taxable profit (revenue − deductible expenses)
 *   2. Cotisation minimale (0.5 % of turnover, minimum 1,500 MAD)
 *
 * @param revenueCentimes - Total gross revenue in centimes
 * @param expensesCentimes - Total deductible expenses in centimes
 * @param options - Optional overrides
 * @returns Full IS calculation result
 *
 * @example
 * ```ts
 * const result = calculateIS(1_000_000_00, 600_000_00)
 * // taxableProfit = 400,000 MAD → IS = 120,000 MAD
 * // cotisation minimale = 0.5% × 1,000,000 = 5,000 MAD
 * // totalIs = max(120,000, 5,000) = 120,000 MAD
 * ```
 */
export function calculateIS(
  revenueCentimes: number,
  expensesCentimes: number,
  options?: {
    /** Override the standard IS rate */
    isRate?: number
    /** Override the minimum tax rate */
    minTaxRate?: number
    /** Override the minimum tax floor */
    minTaxFloorCentimes?: number
  },
): IsCalculationResult {
  const rate = options?.isRate ?? IS_CONFIG.STANDARD_RATE
  const taxableProfit = Math.max(0, revenueCentimes - expensesCentimes)

  // IS on profit
  const isDue = Math.round(taxableProfit * (rate / 100))

  // Cotisation minimale
  const minTaxRate = options?.minTaxRate ?? IS_CONFIG.MIN_TAX_RATE
  const minTaxFloor = options?.minTaxFloorCentimes ?? IS_CONFIG.MIN_TAX_FLOOR
  const cotisationMinimale = Math.max(
    Math.round(revenueCentimes * (minTaxRate / 100)),
    minTaxFloor,
  )

  const totalIs = Math.max(isDue, cotisationMinimale)

  return {
    revenueCentimes,
    expensesCentimes,
    taxableProfitCentimes: taxableProfit,
    rate,
    isDueCentimes: isDue,
    cotisationMinimaleCentimes: cotisationMinimale,
    totalIsCentimes: totalIs,
    quarterlyInstalmentCentimes: Math.ceil(totalIs / 4),
  }
}

// ============================================================================
// 9. CNSS (SOCIAL SECURITY) CALCULATION
// ============================================================================

/**
 * Calculate CNSS employer and employee contributions for a single employee.
 *
 * The employer contribution is ~25.59 % of the capped salary base.
 * The employee contributes ~6.40 % (pension) + 2.26 % (AMO) of the capped base.
 *
 * @param grossSalaryCentimes - Monthly gross salary in centimes
 * @param options - Optional overrides
 * @returns Full CNSS calculation breakdown
 *
 * @example
 * ```ts
 * const result = calculateCNSS(15_000_00) // 15,000 MAD gross
 * // cappedBase = 15,000 MAD (under ceiling)
 * // employerTotal ≈ 3,839 MAD
 * // netSalary ≈ 12,001 MAD
 * ```
 */
export function calculateCNSS(
  grossSalaryCentimes: number,
  options?: {
    /** Override the monthly ceiling in centimes */
    ceilingCentimes?: number
    /** Override employer rate */
    employerRate?: number
    /** Override AT/MP rate */
    atMpRate?: number
  },
): CnssCalculationResult {
  const ceiling = options?.ceilingCentimes ?? CNSS_CONFIG.MONTHLY_CEILING_CENTIMES
  const atMpRate = options?.atMpRate ?? CNSS_CONFIG.AT_MP

  // Cap the base for pension/Family/AT-MP/Conge (AMO has no ceiling)
  const cappedBase = Math.min(grossSalaryCentimes, ceiling)

  // Employer contributions
  const familyAllowance = Math.round(cappedBase * (CNSS_CONFIG.FAMILY_ALLOWANCE / 100))
  // AMO has no ceiling
  const amo = Math.round(grossSalaryCentimes * (CNSS_CONFIG.AMO_EMPLOYER / 100))
  const pension = Math.round(cappedBase * (CNSS_CONFIG.PENSION_EMPLOYER / 100))
  const atMp = Math.round(cappedBase * (atMpRate / 100))
  const conge = Math.round(cappedBase * (CNSS_CONFIG.CONGE / 100))

  const employerTotal = familyAllowance + amo + pension + atMp + conge

  // Employee contributions
  const employeePension = Math.round(cappedBase * (IR_DEDUCTIONS.EMPLOYEE_CNSS_RATE / 100))
  const employeeAmo = Math.round(grossSalaryCentimes * (IR_DEDUCTIONS.EMPLOYEE_AMO_RATE / 100))
  const employeeTotal = employeePension + employeeAmo

  const netSalary = grossSalaryCentimes - employeeTotal

  return {
    grossSalaryCentimes,
    cappedBaseCentimes: cappedBase,
    employerTotalCentimes: employerTotal,
    employerBreakdown: {
      familyAllowanceCentimes: familyAllowance,
      amoCentimes: amo,
      pensionCentimes: pension,
      atMpCentimes: atMp,
      congeCentimes: conge,
    },
    employeePensionCentimes: employeePension,
    employeeAmoCentimes: employeeAmo,
    employeeTotalCentimes: employeeTotal,
    netSalaryCentimes: netSalary,
  }
}

// ============================================================================
// 10. IR (PERSONAL INCOME TAX) CALCULATION
// ============================================================================

/**
 * Calculate IR (Impôt sur le Revenu) for a salaried employee.
 *
 * The IR is computed on the annual net taxable salary (SNI = Salaire Net Imposable):
 *   SNI = Gross Annual − Professional Deduction (max 30,000 MAD) − Social Deductions
 *
 * @param monthlyGrossMad - Monthly gross salary in MAD (not centimes)
 * @param options - Optional overrides
 * @returns Full IR calculation result
 *
 * @example
 * ```ts
 * const result = calculateIR(15_000) // 15,000 MAD/month
 * // Annual gross = 180,000 MAD
 * // IR bracket: 180,000 → rate 34%, deduction 18,200
 * ```
 */
export function calculateIR(
  monthlyGrossMad: number,
  options?: {
    /** Override professional deduction rate */
    professionalRate?: number
    /** Override professional deduction cap */
    professionalCap?: number
    /** Override employee CNSS rate */
    employeeCnssRate?: number
    /** Override employee AMO rate */
    employeeAmoRate?: number
    /** Override CNSS ceiling in MAD */
    cnssCeilingMad?: number
  },
): IrCalculationResult {
  const professionalRate = options?.professionalRate ?? IR_DEDUCTIONS.PROFESSIONAL_RATE
  const professionalCap = options?.professionalCap ?? IR_DEDUCTIONS.PROFESSIONAL_CAP
  const empCnssRate = options?.employeeCnssRate ?? IR_DEDUCTIONS.EMPLOYEE_CNSS_RATE
  const empAmoRate = options?.employeeAmoRate ?? IR_DEDUCTIONS.EMPLOYEE_AMO_RATE
  const cnssCeiling = options?.cnssCeilingMad ?? CNSS_CONFIG.MONTHLY_CEILING_CENTIMES / 100

  const annualGross = monthlyGrossMad * 12

  // Professional expenses deduction
  const professionalDeduction = Math.min(
    Math.round(annualGross * (professionalRate / 100)),
    professionalCap,
  )

  // Social deductions (CNSS pension + AMO)
  const cappedMonthlyBase = Math.min(monthlyGrossMad, cnssCeiling)
  const monthlyCnss = cappedMonthlyBase * (empCnssRate / 100)
  const monthlyAmo = monthlyGrossMad * (empAmoRate / 100)
  const annualSocialDeductions = Math.round((monthlyCnss + monthlyAmo) * 12)

  // Net taxable salary (SNI)
  const sni = Math.max(0, annualGross - professionalDeduction - annualSocialDeductions)

  // Apply IR bracket
  let irDue = 0
  let bracketDetails = IR_BRACKETS[0]

  for (const bracket of IR_BRACKETS) {
    if (sni <= bracket.upperLimit) {
      irDue = Math.round(sni * (bracket.rate / 100) - bracket.deduction)
      bracketDetails = bracket
      break
    }
  }

  irDue = Math.max(0, irDue)
  const monthlyIr = Math.round(irDue / 12)
  const effectiveRate = annualGross > 0 ? (irDue / annualGross) * 100 : 0

  return {
    annualGrossMad: annualGross,
    professionalDeductionMad: professionalDeduction,
    socialDeductionsMad: annualSocialDeductions,
    netTaxableMad: sni,
    irDueMad: irDue,
    monthlyIrMad: monthlyIr,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    bracketDetails,
  }
}

// ============================================================================
// 11. TAX IDENTIFICATION NUMBER (IF) HELPERS
// ============================================================================

/**
 * Validate a Moroccan Identifiant Fiscal (IF) format.
 *
 * The IF is a numeric identifier assigned by the DGI.
 * Common format: up to 15 digits (varies by taxpayer type).
 *
 * @param ifNumber - The IF number to validate
 * @returns true if the format is valid
 */
export function isValidIF(ifNumber: string): boolean {
  if (!ifNumber || typeof ifNumber !== 'string') return false
  // Remove spaces and dashes
  const cleaned = ifNumber.replace(/[\s\-]/g, '')
  // IF is numeric, typically 8–15 digits
  return /^\d{8,15}$/.test(cleaned)
}

/**
 * Normalise an IF number by removing whitespace and dashes.
 *
 * @param ifNumber - The IF number to normalise
 * @returns Cleaned IF number, or null if invalid
 */
export function normaliseIF(ifNumber: string): string | null {
  if (!isValidIF(ifNumber)) return null
  return ifNumber.replace(/[\s\-]/g, '')
}

/**
 * Validate an ICE (Identifiant Commun de l'Entreprise) number.
 * ICE is exactly 8 digits as assigned by Anafege.
 *
 * @param ice - The ICE number to validate
 * @returns true if valid
 */
export function isValidICE(ice: string): boolean {
  if (!ice || typeof ice !== 'string') return false
  const cleaned = ice.replace(/[\s\-]/g, '')
  return /^\d{8}$/.test(cleaned)
}

/**
 * Format an IF number with standard spacing for display.
 *
 * @param ifNumber - The IF number (raw or normalised)
 * @returns Formatted IF string (e.g. "12345678 901234")
 */
export function formatIF(ifNumber: string): string {
  const cleaned = ifNumber.replace(/[\s\-]/g, '')
  // Group in chunks of 8 from the right
  if (cleaned.length <= 8) return cleaned
  const first = cleaned.slice(0, -8)
  const last = cleaned.slice(-8)
  return `${first} ${last}`
}

// ============================================================================
// 12. INVOICE GENERATION HELPERS
// ============================================================================

/**
 * Generate a Moroccan-compliant invoice number.
 *
 * Format: FAC-{YEAR}-{SEQUENTIAL_NUMBER}
 * Example: FAC-2025-0001
 *
 * @param year - Fiscal year
 * @param sequence - Sequential number (1-based)
 * @param options - Optional prefix
 * @returns Formatted invoice number
 */
export function generateInvoiceNumber(
  year: number,
  sequence: number,
  options?: { prefix?: string },
): string {
  const prefix = options?.prefix ?? 'FAC'
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

/**
 * Calculate timbre fiscal (stamp duty) for an invoice.
 *
 * In Morocco, timbre fiscal is a percentage of the TTC amount,
 * typically 0.5 % for most commercial documents, with a minimum.
 *
 * @param amountTtcCentimes - Total TTC amount in centimes
 * @param rate - Timbre rate in % (default 0.5)
 * @param minCentimes - Minimum timbre in centimes (default 0)
 * @returns Timbre fiscal amount in centimes
 */
export function calculateTimbreFiscal(
  amountTtcCentimes: number,
  rate: number = 0.5,
  minCentimes: number = 0,
): number {
  const timbre = Math.round(amountTtcCentimes * (rate / 100))
  return Math.max(timbre, minCentimes)
}

/**
 * Build a full Invoice object from input data.
 *
 * Computes all TVA amounts, totals, and balance due.
 *
 * @param input - Invoice creation input
 * @returns Fully computed Invoice object
 */
export function buildInvoice(input: CreateInvoiceInput): Invoice {
  const now = input.issuedAt ?? new Date().toISOString()
  const dueAt = new Date(now)
  dueAt.setDate(dueAt.getDate() + (input.paymentTermsDays ?? 30))

  const currency = input.currency ?? 'MAD'
  const sequence = Date.now() // simplistic; in production use DB sequence
  const invoiceNumber = generateInvoiceNumber(new Date(now).getFullYear(), sequence % 10000)

  let totalHt = 0
  let totalTva = 0
  const tvaBreakdown: Record<number, { htCentimes: number; tvaCentimes: number }> = {}

  const items: InvoiceLineItem[] = input.items.map((item, idx) => {
    const tva = calculateTvaAmount(item.unitPriceCentimes * item.quantity, item.tvaRate)
    const totalHtLine = item.unitPriceCentimes * item.quantity
    const totalTtcLine = totalHtLine + tva

    totalHt += totalHtLine
    totalTva += tva

    if (!tvaBreakdown[item.tvaRate]) {
      tvaBreakdown[item.tvaRate] = { htCentimes: 0, tvaCentimes: 0 }
    }
    tvaBreakdown[item.tvaRate].htCentimes += totalHtLine
    tvaBreakdown[item.tvaRate].tvaCentimes += tva

    return {
      id: `line-${idx + 1}`,
      description: item.description,
      quantity: item.quantity,
      unitPriceCentimes: item.unitPriceCentimes,
      tvaRate: item.tvaRate,
      totalHtCentimes: totalHtLine,
      tvaCentimes: tva,
      totalTtcCentimes: totalTtcLine,
      referenceId: item.referenceId,
    }
  })

  const totalTtc = totalHt + totalTva
  const timbreFiscal = input.applyTimbreFiscal ? calculateTimbreFiscal(totalTtc) : 0

  return {
    invoiceNumber,
    status: InvoiceStatus.DRAFT,
    issuedAt: now,
    dueAt: dueAt.toISOString(),
    seller: input.seller,
    buyer: input.buyer,
    items,
    totalHtCentimes: totalHt,
    totalTvaCentimes: totalTva,
    tvaBreakdown,
    totalTtcCentimes: totalTtc,
    amountPaidCentimes: 0,
    balanceDueCentimes: totalTtc + timbreFiscal,
    currency,
    notes: input.notes,
    timbreFiscalCentimes: timbreFiscal,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Check if an invoice is overdue based on the current date.
 *
 * @param invoice - The invoice to check
 * @param now - Optional reference date (ISO 8601), defaults to now
 * @returns true if the invoice is overdue
 */
export function isInvoiceOverdue(invoice: Invoice, now?: string): boolean {
  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
    return false
  }
  const reference = now ? new Date(now) : new Date()
  return new Date(invoice.dueAt) < reference
}

/**
 * Record a payment on an invoice and update its status.
 *
 * @param invoice - The current invoice
 * @param paymentCentimes - Amount paid in centimes
 * @param paymentMethod - Payment method used
 * @returns Updated invoice with new status and balance
 */
export function applyInvoicePayment(
  invoice: Invoice,
  paymentCentimes: number,
  paymentMethod: InvoicePaymentMethod,
): Invoice {
  const newPaid = invoice.amountPaidCentimes + paymentCentimes
  const newBalance = Math.max(0, invoice.totalTtcCentimes + invoice.timbreFiscalCentimes - newPaid)

  let status: InvoiceStatus
  if (newBalance <= 0) {
    status = InvoiceStatus.PAID
  } else if (newPaid > 0 && newPaid < invoice.totalTtcCentimes + invoice.timbreFiscalCentimes) {
    status = InvoiceStatus.PARTIALLY_PAID
  } else {
    status = invoice.status
  }

  const now = new Date().toISOString()

  return {
    ...invoice,
    status,
    amountPaidCentimes: newPaid,
    balanceDueCentimes: newBalance,
    paymentMethod,
    paidAt: newBalance <= 0 ? now : invoice.paidAt,
    updatedAt: now,
  }
}

// ============================================================================
// 13. REVENUE / EXPENSE AGGREGATION
// ============================================================================

/**
 * Aggregate financial transactions into a monthly summary.
 *
 * @param transactions - Array of financial transactions
 * @param year - Fiscal year
 * @param month - Fiscal month (1–12)
 * @returns Monthly financial summary
 */
export function aggregateMonthly(
  transactions: FinancialTransaction[],
  year: number,
  month: number,
): MonthlyFinancialSummary {
  const filtered = transactions.filter(
    t => t.fiscalYear === year && t.fiscalMonth === month,
  )

  let revenueCentimes = 0
  let expensesCentimes = 0
  let tvaCollectedCentimes = 0
  let tvaPaidCentimes = 0
  const revenueByCategory: Partial<Record<TransactionCategory, number>> = {}
  const expensesByCategory: Partial<Record<TransactionCategory, number>> = {}

  for (const t of filtered) {
    if (t.type === 'revenue') {
      revenueCentimes += t.amountCentimes
      tvaCollectedCentimes += t.tvaCentimes
      revenueByCategory[t.category] = (revenueByCategory[t.category] ?? 0) + t.amountCentimes
    } else {
      expensesCentimes += t.amountCentimes
      tvaPaidCentimes += t.tvaCentimes
      expensesByCategory[t.category] = (expensesByCategory[t.category] ?? 0) + t.amountCentimes
    }
  }

  const tvaNetPayable = Math.max(0, tvaCollectedCentimes - tvaPaidCentimes)

  return {
    year,
    month,
    revenueCentimes,
    expensesCentimes,
    netProfitCentimes: revenueCentimes - expensesCentimes,
    tvaCollectedCentimes,
    tvaPaidCentimes,
    tvaNetPayableCentimes: tvaNetPayable,
    transactionCount: filtered.length,
    revenueByCategory,
    expensesByCategory,
  }
}

/**
 * Aggregate financial transactions into a quarterly summary.
 *
 * @param transactions - Array of financial transactions
 * @param year - Fiscal year
 * @param quarter - Quarter (1–4)
 * @returns Quarterly financial summary
 */
export function aggregateQuarterly(
  transactions: FinancialTransaction[],
  year: number,
  quarter: number,
): QuarterlyFinancialSummary {
  const q = FISCAL_QUARTERS[quarter - 1]
  if (!q) {
    throw new Error(`Invalid quarter: ${quarter}. Must be 1–4.`)
  }

  const months = q.months.map(m => aggregateMonthly(transactions, year, m))

  let revenueCentimes = 0
  let expensesCentimes = 0
  let tvaCollectedCentimes = 0
  let tvaPaidCentimes = 0

  for (const m of months) {
    revenueCentimes += m.revenueCentimes
    expensesCentimes += m.expensesCentimes
    tvaCollectedCentimes += m.tvaCollectedCentimes
    tvaPaidCentimes += m.tvaPaidCentimes
  }

  return {
    year,
    quarter,
    label: q.label,
    months,
    revenueCentimes,
    expensesCentimes,
    netProfitCentimes: revenueCentimes - expensesCentimes,
    tvaCollectedCentimes,
    tvaPaidCentimes,
    tvaNetPayableCentimes: Math.max(0, tvaCollectedCentimes - tvaPaidCentimes),
  }
}

// ============================================================================
// 14. TAX DECLARATION HELPERS
// ============================================================================

/**
 * Build a TVA declaration for a given month.
 *
 * @param transactions - Financial transactions for the period
 * @param year - Fiscal year
 * @param month - Month (1–12)
 * @param priorCreditCentimes - TVA credit carried forward from prior period
 * @returns TVA declaration ready for filing
 */
export function buildMonthlyTvaDeclaration(
  transactions: FinancialTransaction[],
  year: number,
  month: number,
  priorCreditCentimes: number = 0,
): TvaDeclaration {
  const monthly = aggregateMonthly(transactions, year, month)

  // Build TVA breakdown by rate
  const tvaBreakdown: Record<number, { collectedCentimes: number; paidCentimes: number }> = {}

  for (const t of transactions) {
    if (t.fiscalYear !== year || t.fiscalMonth !== month) continue
    if (!tvaBreakdown[t.tvaRate]) {
      tvaBreakdown[t.tvaRate] = { collectedCentimes: 0, paidCentimes: 0 }
    }
    if (t.type === 'revenue') {
      tvaBreakdown[t.tvaRate].collectedCentimes += t.tvaCentimes
    } else {
      tvaBreakdown[t.tvaRate].paidCentimes += t.tvaCentimes
    }
  }

  const netPayable = Math.max(0, monthly.tvaCollectedCentimes - monthly.tvaPaidCentimes)
  const afterCredit = Math.max(0, netPayable - priorCreditCentimes)
  const creditForward = netPayable < priorCreditCentimes
    ? priorCreditCentimes - netPayable
    : 0

  // Due date: 19th of the following month
  const dueDate = new Date(year, month, TVA_DEADLINES.MONTHLY_DUE_DAY)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return {
    period: DeclarationPeriod.MONTHLY,
    year,
    periodNumber: month,
    label: `${monthNames[month - 1]} ${year}`,
    status: DeclarationStatus.DRAFT,
    totalSalesHtCentimes: monthly.revenueCentimes,
    tvaCollectedCentimes: monthly.tvaCollectedCentimes,
    totalPurchasesHtCentimes: monthly.expensesCentimes,
    tvaPaidCentimes: monthly.tvaPaidCentimes,
    tvaNetPayableCentimes: netPayable,
    creditCarryForward: creditForward > 0,
    priorCreditCentimes,
    creditForwardCentimes: creditForward,
    amountDueCentimes: afterCredit,
    dueDate: dueDate.toISOString(),
    tvaBreakdown,
  }
}

/**
 * Build a TVA declaration for a given quarter.
 *
 * @param transactions - Financial transactions for the period
 * @param year - Fiscal year
 * @param quarter - Quarter (1–4)
 * @param priorCreditCentimes - TVA credit carried forward from prior period
 * @returns TVA declaration ready for filing
 */
export function buildQuarterlyTvaDeclaration(
  transactions: FinancialTransaction[],
  year: number,
  quarter: number,
  priorCreditCentimes: number = 0,
): TvaDeclaration {
  const quarterly = aggregateQuarterly(transactions, year, quarter)

  // Build TVA breakdown by rate
  const tvaBreakdown: Record<number, { collectedCentimes: number; paidCentimes: number }> = {}
  const q = FISCAL_QUARTERS[quarter - 1]

  for (const t of transactions) {
    if (t.fiscalYear !== year || !q.months.includes(t.fiscalMonth)) continue
    if (!tvaBreakdown[t.tvaRate]) {
      tvaBreakdown[t.tvaRate] = { collectedCentimes: 0, paidCentimes: 0 }
    }
    if (t.type === 'revenue') {
      tvaBreakdown[t.tvaRate].collectedCentimes += t.tvaCentimes
    } else {
      tvaBreakdown[t.tvaRate].paidCentimes += t.tvaCentimes
    }
  }

  const netPayable = Math.max(0, quarterly.tvaCollectedCentimes - quarterly.tvaPaidCentimes)
  const afterCredit = Math.max(0, netPayable - priorCreditCentimes)
  const creditForward = netPayable < priorCreditCentimes
    ? priorCreditCentimes - netPayable
    : 0

  // Due date: 19th of the month following the quarter's last month
  const lastMonth = q.months[q.months.length - 1]
  const dueDate = new Date(year, lastMonth, TVA_DEADLINES.QUARTERLY_DUE_DAY)

  return {
    period: DeclarationPeriod.QUARTERLY,
    year,
    periodNumber: quarter,
    label: `${q.label} ${year}`,
    status: DeclarationStatus.DRAFT,
    totalSalesHtCentimes: quarterly.revenueCentimes,
    tvaCollectedCentimes: quarterly.tvaCollectedCentimes,
    totalPurchasesHtCentimes: quarterly.expensesCentimes,
    tvaPaidCentimes: quarterly.tvaPaidCentimes,
    tvaNetPayableCentimes: netPayable,
    creditCarryForward: creditForward > 0,
    priorCreditCentimes,
    creditForwardCentimes: creditForward,
    amountDueCentimes: afterCredit,
    dueDate: dueDate.toISOString(),
    tvaBreakdown,
  }
}

/**
 * Build the annual IS (Corporate Tax) declaration.
 *
 * @param transactions - Financial transactions for the fiscal year
 * @param year - Fiscal year
 * @param instalmentsPaidCentimes - Total IS instalments already paid during the year
 * @returns IS declaration ready for filing
 */
export function buildAnnualIsDeclaration(
  transactions: FinancialTransaction[],
  year: number,
  instalmentsPaidCentimes: number = 0,
): IsDeclaration {
  // Aggregate full year
  const q1 = aggregateQuarterly(transactions, year, 1)
  const q2 = aggregateQuarterly(transactions, year, 2)
  const q3 = aggregateQuarterly(transactions, year, 3)
  const q4 = aggregateQuarterly(transactions, year, 4)

  const revenue = q1.revenueCentimes + q2.revenueCentimes + q3.revenueCentimes + q4.revenueCentimes
  const deductibleExpenses = transactions
    .filter(t => t.fiscalYear === year && t.type === 'expense' && t.taxDeductible)
    .reduce((sum, t) => sum + t.amountCentimes, 0)

  const nonDeductibleExpenses = transactions
    .filter(t => t.fiscalYear === year && t.type === 'expense' && !t.taxDeductible)
    .reduce((sum, t) => sum + t.amountCentimes, 0)

  const isCalc = calculateIS(revenue, deductibleExpenses)

  const balanceDue = Math.max(0, isCalc.totalIsCentimes - instalmentsPaidCentimes)

  // Due date: April 30 of the following year
  const dueDate = new Date(year + 1, TVA_DEADLINES.IS_DUE_MONTH - 1, TVA_DEADLINES.IS_DUE_DAY)

  return {
    year,
    status: DeclarationStatus.DRAFT,
    revenueCentimes: revenue,
    expensesCentimes: deductibleExpenses,
    nonDeductibleCentimes: nonDeductibleExpenses,
    taxableProfitCentimes: isCalc.taxableProfitCentimes,
    rate: isCalc.rate,
    isCalculatedCentimes: isCalc.isDueCentimes,
    cotisationMinimaleCentimes: isCalc.cotisationMinimaleCentimes,
    instalmentsPaidCentimes,
    balanceDueCentimes: balanceDue,
    dueDate: dueDate.toISOString(),
  }
}

/**
 * Build a CNSS monthly declaration.
 *
 * @param employeeSalaries - Array of { grossSalaryCentimes } for each employee
 * @param year - Declaration year
 * @param month - Declaration month (1–12)
 * @returns CNSS declaration ready for filing
 */
export function buildCnssDeclaration(
  employeeSalaries: Array<{ grossSalaryCentimes: number }>,
  year: number,
  month: number,
): CnssDeclaration {
  let totalSalaries = 0
  let employerContributions = 0
  let employeeDeductions = 0

  for (const emp of employeeSalaries) {
    const cnss = calculateCNSS(emp.grossSalaryCentimes)
    totalSalaries += emp.grossSalaryCentimes
    employerContributions += cnss.employerTotalCentimes
    employeeDeductions += cnss.employeeTotalCentimes
  }

  // CNSS is due by the 15th of the following month
  const dueDate = new Date(year, month, 15)

  return {
    year,
    month,
    status: DeclarationStatus.DRAFT,
    employeeCount: employeeSalaries.length,
    totalSalariesCentimes: totalSalaries,
    employerContributionsCentimes: employerContributions,
    employeeDeductionsCentimes: employeeDeductions,
    dueDate: dueDate.toISOString(),
  }
}

// ============================================================================
// 15. FINANCIAL REPORT GENERATION
// ============================================================================

/**
 * Generate a Profit & Loss (Compte de Résultat) report for a fiscal year.
 *
 * @param transactions - Financial transactions for the year
 * @param year - Fiscal year
 * @returns Complete P&L report
 */
export function generateProfitAndLoss(
  transactions: FinancialTransaction[],
  year: number,
): ProfitAndLossReport {
  const yearTx = transactions.filter(t => t.fiscalYear === year)

  // Revenue aggregation by category
  const revenueCategories: PnlCategoryLine[] = []
  const revenueMap = new Map<TransactionCategory, number>()
  let totalRevenue = 0

  for (const t of yearTx) {
    if (t.type !== 'revenue') continue
    totalRevenue += t.amountCentimes
    revenueMap.set(t.category, (revenueMap.get(t.category) ?? 0) + t.amountCentimes)
  }

  for (const [category, amount] of revenueMap) {
    revenueCategories.push({
      category,
      amountCentimes: amount,
      percentageOfRevenue: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    })
  }
  revenueCategories.sort((a, b) => b.amountCentimes - a.amountCentimes)

  // Expense aggregation by category
  const expenseCategories: PnlCategoryLine[] = []
  const expenseMap = new Map<TransactionCategory, number>()
  let totalExpenses = 0

  for (const t of yearTx) {
    if (t.type !== 'expense') continue
    totalExpenses += t.amountCentimes
    expenseMap.set(t.category, (expenseMap.get(t.category) ?? 0) + t.amountCentimes)
  }

  for (const [category, amount] of expenseMap) {
    expenseCategories.push({
      category,
      amountCentimes: amount,
      percentageOfRevenue: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    })
  }
  expenseCategories.sort((a, b) => b.amountCentimes - a.amountCentimes)

  const operatingProfit = totalRevenue - totalExpenses
  const isCalc = calculateIS(totalRevenue, totalExpenses)
  const netProfit = operatingProfit - isCalc.totalIsCentimes
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Monthly breakdown
  const monthlyBreakdown: MonthlyPnlLine[] = []
  let cumulativeNet = 0

  for (let m = 1; m <= 12; m++) {
    const monthly = aggregateMonthly(transactions, year, m)
    const monthProfit = monthly.revenueCentimes - monthly.expensesCentimes
    cumulativeNet += monthProfit
    monthlyBreakdown.push({
      month: m,
      revenueCentimes: monthly.revenueCentimes,
      expensesCentimes: monthly.expensesCentimes,
      netProfitCentimes: monthProfit,
      cumulativeNetProfitCentimes: cumulativeNet,
    })
  }

  return {
    title: `Compte de Résultat — ${year}`,
    fiscalYear: year,
    periodLabel: `1 Jan ${year} – 31 Dec ${year}`,
    startDate: `${year}-01-01T00:00:00.000Z`,
    endDate: `${year}-12-31T23:59:59.999Z`,
    currency: 'MAD',
    revenue: { categories: revenueCategories, totalCentimes: totalRevenue },
    expenses: { categories: expenseCategories, totalCentimes: totalExpenses },
    totalRevenueCentimes: totalRevenue,
    totalExpensesCentimes: totalExpenses,
    operatingProfitCentimes: operatingProfit,
    isProvisionCentimes: isCalc.totalIsCentimes,
    netProfitCentimes: netProfit,
    netProfitMargin: Math.round(netProfitMargin * 100) / 100,
    monthlyBreakdown,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Generate a simplified balance sheet summary.
 *
 * This is a high-level summary; a full Moroccan bilan would require
 * integration with accounting software for detailed line items.
 *
 * @param params - Balance sheet inputs
 * @returns Balance sheet summary
 */
export function generateBalanceSheet(params: {
  /** As-of date (ISO 8601) */
  asOfDate: string
  /** Cash and bank balances in centimes */
  cashCentimes: number
  /** Accounts receivable in centimes */
  accountsReceivableCentimes: number
  /** Prepaid expenses in centimes */
  prepaidExpensesCentimes: number
  /** Total fixed assets (equipment, servers, etc.) in centimes */
  fixedAssetsCentimes: number
  /** Accumulated depreciation in centimes */
  accumulatedDepreciationCentimes: number
  /** Accounts payable in centimes */
  accountsPayableCentimes: number
  /** Tax payable (TVA + IS) in centimes */
  taxPayableCentimes: number
  /** CNSS payable in centimes */
  cnssPayableCentimes: number
  /** Deferred revenue in centimes */
  deferredRevenueCentimes: number
  /** Retained earnings in centimes */
  retainedEarningsCentimes: number
  /** Share capital in centimes */
  shareCapitalCentimes: number
  /** Current year profit/loss in centimes */
  currentYearProfitCentimes: number
  /** Other current assets in centimes */
  otherCurrentAssets?: number
  /** Other non-current assets in centimes */
  otherNonCurrentAssets?: number
  /** Other current liabilities in centimes */
  otherCurrentLiabilities?: number
  /** Other non-current liabilities in centimes */
  otherNonCurrentLiabilities?: number
}): BalanceSheetSummary {
  const netFixedAssets = params.fixedAssetsCentimes - params.accumulatedDepreciationCentimes

  const currentAssets: BalanceSheetLineItem[] = [
    { label: 'Cash & Bank', amountCentimes: params.cashCentimes },
    { label: 'Accounts Receivable', amountCentimes: params.accountsReceivableCentimes },
    { label: 'Prepaid Expenses', amountCentimes: params.prepaidExpensesCentimes },
  ]
  if (params.otherCurrentAssets && params.otherCurrentAssets > 0) {
    currentAssets.push({ label: 'Other Current Assets', amountCentimes: params.otherCurrentAssets })
  }

  const nonCurrentAssets: BalanceSheetLineItem[] = [
    {
      label: 'Net Fixed Assets',
      amountCentimes: netFixedAssets,
      subItems: [
        { label: 'Gross Fixed Assets', amountCentimes: params.fixedAssetsCentimes },
        { label: 'Less: Accumulated Depreciation', amountCentimes: -params.accumulatedDepreciationCentimes },
      ],
    },
  ]
  if (params.otherNonCurrentAssets && params.otherNonCurrentAssets > 0) {
    nonCurrentAssets.push({ label: 'Other Non-Current Assets', amountCentimes: params.otherNonCurrentAssets })
  }

  const currentLiabilities: BalanceSheetLineItem[] = [
    { label: 'Accounts Payable', amountCentimes: params.accountsPayableCentimes },
    { label: 'Tax Payable (TVA + IS)', amountCentimes: params.taxPayableCentimes },
    { label: 'CNSS Payable', amountCentimes: params.cnssPayableCentimes },
    { label: 'Deferred Revenue', amountCentimes: params.deferredRevenueCentimes },
  ]
  if (params.otherCurrentLiabilities && params.otherCurrentLiabilities > 0) {
    currentLiabilities.push({ label: 'Other Current Liabilities', amountCentimes: params.otherCurrentLiabilities })
  }

  const nonCurrentLiabilities: BalanceSheetLineItem[] = []
  if (params.otherNonCurrentLiabilities && params.otherNonCurrentLiabilities > 0) {
    nonCurrentLiabilities.push({ label: 'Other Non-Current Liabilities', amountCentimes: params.otherNonCurrentLiabilities })
  }

  const equity: BalanceSheetLineItem[] = [
    { label: 'Share Capital', amountCentimes: params.shareCapitalCentimes },
    { label: 'Retained Earnings', amountCentimes: params.retainedEarningsCentimes },
    { label: 'Current Year Profit/Loss', amountCentimes: params.currentYearProfitCentimes },
  ]

  const totalCurrentAssets = currentAssets.reduce((s, i) => s + i.amountCentimes, 0)
  const totalNonCurrentAssets = nonCurrentAssets.reduce((s, i) => s + i.amountCentimes, 0)
  const totalCurrentLiabilities = currentLiabilities.reduce((s, i) => s + i.amountCentimes, 0)
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((s, i) => s + i.amountCentimes, 0)
  const totalEquity = equity.reduce((s, i) => s + i.amountCentimes, 0)

  const totalAssets = totalCurrentAssets + totalNonCurrentAssets
  const totalLiabilitiesAndEquity = totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity

  // Combine liabilities + equity into a single side
  const allLiabilitiesAndEquityItems: BalanceSheetLineItem[] = [
    ...currentLiabilities,
    ...nonCurrentLiabilities,
    ...equity,
  ]

  return {
    title: `Bilan — ${new Date(params.asOfDate).getFullYear()}`,
    asOfDate: params.asOfDate,
    currency: 'MAD',
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      totalCentimes: totalAssets,
    },
    liabilitiesAndEquity: {
      current: allLiabilitiesAndEquityItems, // includes equity items
      nonCurrent: [],
      totalCentimes: totalLiabilitiesAndEquity,
    },
    totalAssetsCentimes: totalAssets,
    totalLiabilitiesAndEquityCentimes: totalLiabilitiesAndEquity,
    balanceDifferenceCentimes: totalAssets - totalLiabilitiesAndEquity,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// 16. UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert an amount in centimes to a formatted MAD string.
 *
 * @param centimes - Amount in centimes
 * @param options - Formatting options
 * @returns Formatted string, e.g. "1 250,00 MAD"
 */
export function formatMad(
  centimes: number,
  options?: { includeCurrency?: boolean; thousandsSeparator?: string },
): string {
  const mad = centimes / 100
  const fixed = mad.toFixed(2)
  const sep = options?.thousandsSeparator ?? ' '
  const parts = fixed.split('.')
  const intPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  const formatted = `${intPart}.${parts[1]}`
  return options?.includeCurrency !== false ? `${formatted} MAD` : formatted
}

/**
 * Convert MAD to centimes (rounds to nearest centime).
 *
 * @param mad - Amount in MAD
 * @returns Amount in centimes
 */
export function madToCentimes(mad: number): number {
  return Math.round(mad * 100)
}

/**
 * Get the fiscal quarter for a given month.
 *
 * @param month - Month (1–12)
 * @returns Quarter (1–4)
 */
export function getFiscalQuarter(month: number): number {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`)
  return Math.ceil(month / 3)
}

/**
 * Get the TVA declaration due date for a given period.
 *
 * @param year - Fiscal year
 * @param periodNumber - Month (1–12) for monthly, or quarter (1–4) for quarterly
 * @param period - Declaration period type
 * @returns ISO 8601 due date string
 */
export function getTvaDueDate(
  year: number,
  periodNumber: number,
  period: DeclarationPeriod,
): string {
  if (period === DeclarationPeriod.MONTHLY) {
    // Due: 19th of the following month
    const nextMonth = periodNumber === 12 ? 1 : periodNumber + 1
    const nextYear = periodNumber === 12 ? year + 1 : year
    return new Date(nextYear, nextMonth - 1, TVA_DEADLINES.MONTHLY_DUE_DAY).toISOString()
  }

  // Quarterly: due 19th of the month after the quarter ends
  const q = FISCAL_QUARTERS[periodNumber - 1]
  if (!q) throw new Error(`Invalid quarter: ${periodNumber}`)
  const lastMonth = q.months[q.months.length - 1]
  const nextMonth = lastMonth === 12 ? 1 : lastMonth + 1
  const nextYear = lastMonth === 12 ? year + 1 : year
  return new Date(nextYear, nextMonth - 1, TVA_DEADLINES.QUARTERLY_DUE_DAY).toISOString()
}

/**
 * Determine whether a company should file TVA monthly or quarterly.
 *
 * Quarterly filing is available for companies with annual turnover below a
 * threshold (currently 1,000,000 MAD for services as per CGI art. 106).
 *
 * @param annualTurnoverCentimes - Annual turnover in centimes
 * @returns Recommended declaration period
 */
export function getRecommendedTvaPeriod(
  annualTurnoverCentimes: number,
): DeclarationPeriod {
  const QUARTERLY_THRESHOLD_CENTIMES = 1_000_000_00 // 1,000,000 MAD
  return annualTurnoverCentimes <= QUARTERLY_THRESHOLD_CENTIMES
    ? DeclarationPeriod.QUARTERLY
    : DeclarationPeriod.MONTHLY
}
