// Per-customer credit report fixtures for the 3-panel analyst workspace.
// Each customer has a realistic Experian-style report with personal info,
// account history, payment grids, and public records.

export interface CreditAccount {
  accountName: string
  accountNumber: string
  type: string
  balance: number
  creditLimit?: number
  monthlyPayment?: number
  dateOpened: string
  dateOfLastActivity: string
  status: "current" | "late_30" | "late_60" | "late_90" | "charged_off" | "collection"
  responsibility: "individual" | "joint" | "authorized"
  paymentHistory: ("OK" | "30" | "60" | "90" | "ND" | "CO")[] // last 24 months, newest first
  highBalance?: number
  remarks?: string
}

export interface PublicRecord {
  type: string
  dateField: string
  court?: string
  amount?: number
  status: string
  referenceNumber?: string
}

export interface CreditInquiry {
  creditor: string
  date: string
  type: "hard" | "soft"
}

export interface CustomerCreditReport {
  customerId: string
  customerName: string
  reportNumber: string
  reportDate: string
  bureau: "Experian" | "Equifax" | "TransUnion"
  // Personal info section
  personal: {
    name: string
    ssn: string // masked
    dob: string
    currentAddress: string
    previousAddresses: string[]
    employers: { name: string; address: string; dateReported: string }[]
  }
  // Score
  creditScore: number
  scoreRange: string
  scoreFactors: string[]
  // Accounts
  accounts: CreditAccount[]
  // Public records
  publicRecords: PublicRecord[]
  // Inquiries
  inquiries: CreditInquiry[]
  // Summary
  summary: {
    totalAccounts: number
    openAccounts: number
    closedAccounts: number
    delinquentAccounts: number
    derogatoryMarks: number
    totalBalance: number
    totalCreditLimit: number
    monthlyPayments: number
    oldestAccount: string
    averageAccountAge: string
  }
}

// ── Customer 1: Robert Chen / Meridian Corp — HIGH RISK ──────────────────────
// OFAC hit, 3 dissolved companies, adverse media, score 34

export const MERIDIAN_CORP_REPORT: CustomerCreditReport = {
  customerId: "robert-chen-meridian",
  customerName: "Robert Chen",
  reportNumber: "2024-0614-40",
  reportDate: "April 18, 2026",
  bureau: "Experian",
  personal: {
    name: "CHEN, ROBERT",
    ssn: "XXX-XX-7731",
    dob: "11/05/1968",
    currentAddress: "1 Commerce Square Suite 2000, Wilmington DE 19801",
    previousAddresses: [
      "420 Pacific Ave, San Francisco CA 94133",
      "88 Pine Street Floor 14, New York NY 10005",
    ],
    employers: [
      { name: "MERIDIAN CORP", address: "1 Commerce Square, Wilmington DE", dateReported: "08/2021" },
      { name: "CHEN CAPITAL GROUP INC", address: "88 Pine St, New York NY", dateReported: "06/2018" },
    ],
  },
  creditScore: 512,
  scoreRange: "300–850",
  scoreFactors: [
    "Serious delinquency and public record or collection filed",
    "Amount owed on accounts is too high",
    "Too many accounts with balances",
    "Proportion of balances to credit limits is too high",
  ],
  accounts: [
    {
      accountName: "CHASE BUSINESS CREDIT",
      accountNumber: "4147XXXXXXXX9034",
      type: "Revolving / Credit Card",
      balance: 28400,
      creditLimit: 30000,
      monthlyPayment: 850,
      dateOpened: "09/2021",
      dateOfLastActivity: "03/2026",
      status: "late_90",
      responsibility: "individual",
      highBalance: 30000,
      paymentHistory: ["90","90","60","30","OK","OK","30","60","90","90","60","30","OK","OK","OK","OK","30","60","OK","OK","OK","OK","OK","OK"],
      remarks: "Account 90 days past due",
    },
    {
      accountName: "WELLS FARGO BUSINESS LINE",
      accountNumber: "7731XXXXXXXX2201",
      type: "Line of Credit",
      balance: 47500,
      creditLimit: 50000,
      monthlyPayment: 1200,
      dateOpened: "11/2021",
      dateOfLastActivity: "01/2026",
      status: "charged_off",
      responsibility: "individual",
      highBalance: 50000,
      paymentHistory: ["CO","CO","CO","90","90","60","30","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","ND","ND","ND","ND"],
      remarks: "Charged off as bad debt — $47,500",
    },
    {
      accountName: "AMERICAN EXPRESS BUSINESS",
      accountNumber: "3782XXXXXXXX1005",
      type: "Charge Card",
      balance: 12800,
      creditLimit: 15000,
      monthlyPayment: 400,
      dateOpened: "03/2022",
      dateOfLastActivity: "02/2026",
      status: "late_60",
      responsibility: "individual",
      highBalance: 15000,
      paymentHistory: ["60","30","OK","OK","30","60","30","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","ND","ND"],
      remarks: "60 days past due",
    },
    {
      accountName: "APEX TRADE SOLUTIONS (CLOSED)",
      accountNumber: "9901XXXXXXXX4412",
      type: "Business Loan",
      balance: 0,
      creditLimit: 75000,
      monthlyPayment: 0,
      dateOpened: "01/2019",
      dateOfLastActivity: "11/2020",
      status: "charged_off",
      responsibility: "individual",
      highBalance: 75000,
      paymentHistory: ["CO","CO","CO","CO","90","90","60","30","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
      remarks: "Account closed — charged off. Entity dissolved 11/2020.",
    },
  ],
  publicRecords: [
    {
      type: "Civil Judgment",
      dateField: "09/2022",
      court: "Delaware Court of Chancery",
      amount: 2100000,
      status: "Unsatisfied",
      referenceNumber: "2022-CV-08841",
    },
    {
      type: "Tax Lien",
      dateField: "04/2023",
      court: "IRS / Federal",
      amount: 184000,
      status: "Unpaid",
      referenceNumber: "IRS-2023-DE-7731",
    },
  ],
  inquiries: [
    { creditor: "JPMORGAN CHASE BANK", date: "01/2026", type: "hard" },
    { creditor: "WELLS FARGO BANK", date: "11/2025", type: "hard" },
    { creditor: "AMERICAN EXPRESS", date: "03/2022", type: "hard" },
    { creditor: "EXPERIAN BUSINESS", date: "04/2026", type: "soft" },
  ],
  summary: {
    totalAccounts: 4,
    openAccounts: 3,
    closedAccounts: 1,
    delinquentAccounts: 3,
    derogatoryMarks: 2,
    totalBalance: 88700,
    totalCreditLimit: 95000,
    monthlyPayments: 2450,
    oldestAccount: "01/2019",
    averageAccountAge: "3 years 2 months",
  },
}

// ── Customer 2: Grand Hotels Ltd / Alexandra Chen — CLEAN ────────────────────
// Score 91, all checks passed, strong payment history

export const GRAND_HOTELS_REPORT: CustomerCreditReport = {
  customerId: "grand-hotels-alexandra",
  customerName: "Alexandra Chen",
  reportNumber: "2024-0614-17",
  reportDate: "April 18, 2026",
  bureau: "Experian",
  personal: {
    name: "CHEN, ALEXANDRA",
    ssn: "XXX-XX-9034",
    dob: "08/22/1975",
    currentAddress: "1300 Nicollet Mall, Minneapolis MN 55403",
    previousAddresses: [
      "820 Marquette Ave Suite 1400, Minneapolis MN 55402",
    ],
    employers: [
      { name: "GRAND HOTELS LTD", address: "1300 Nicollet Mall, Minneapolis MN", dateReported: "03/2009" },
    ],
  },
  creditScore: 791,
  scoreRange: "300–850",
  scoreFactors: [
    "Length of credit history is excellent",
    "Low utilization across all revolving accounts",
    "No derogatory marks in 7 years",
    "Diverse mix of credit types",
  ],
  accounts: [
    {
      accountName: "BANK OF AMERICA BUSINESS PLATINUM",
      accountNumber: "4111XXXXXXXX8820",
      type: "Revolving / Credit Card",
      balance: 4200,
      creditLimit: 80000,
      monthlyPayment: 300,
      dateOpened: "04/2010",
      dateOfLastActivity: "04/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 22000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
    {
      accountName: "US BANK COMMERCIAL MORTGAGE",
      accountNumber: "9034XXXXXXXX1103",
      type: "Mortgage / Commercial",
      balance: 1840000,
      monthlyPayment: 12400,
      dateOpened: "06/2012",
      dateOfLastActivity: "04/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 2200000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
    {
      accountName: "WELLS FARGO BUSINESS LINE",
      accountNumber: "6612XXXXXXXX4490",
      type: "Line of Credit",
      balance: 0,
      creditLimit: 250000,
      monthlyPayment: 0,
      dateOpened: "09/2015",
      dateOfLastActivity: "02/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 180000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
    {
      accountName: "AMERICAN EXPRESS CORPORATE",
      accountNumber: "3714XXXXXXXX2209",
      type: "Charge Card",
      balance: 8900,
      creditLimit: 100000,
      monthlyPayment: 500,
      dateOpened: "11/2009",
      dateOfLastActivity: "04/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 45000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
  ],
  publicRecords: [],
  inquiries: [
    { creditor: "WELLS FARGO BANK", date: "02/2026", type: "hard" },
    { creditor: "EXPERIAN BUSINESS", date: "04/2026", type: "soft" },
  ],
  summary: {
    totalAccounts: 4,
    openAccounts: 4,
    closedAccounts: 0,
    delinquentAccounts: 0,
    derogatoryMarks: 0,
    totalBalance: 1853100,
    totalCreditLimit: 430000,
    monthlyPayments: 13200,
    oldestAccount: "11/2009",
    averageAccountAge: "14 years 1 month",
  },
}

// ── Customer 3: James Hartley / Blueprint Events — CAUTION ───────────────────
// KYC in-progress, limited history, one late payment flag

export const BLUEPRINT_EVENTS_REPORT: CustomerCreditReport = {
  customerId: "james-hartley-blueprint",
  customerName: "James Hartley",
  reportNumber: "2024-0614-29",
  reportDate: "April 18, 2026",
  bureau: "Experian",
  personal: {
    name: "HARTLEY, JAMES",
    ssn: "XXX-XX-4821",
    dob: "03/14/1981",
    currentAddress: "420 N 5th St Suite 210, Minneapolis MN 55401",
    previousAddresses: [
      "2201 Fremont Ave S, Minneapolis MN 55405",
    ],
    employers: [
      { name: "BLUEPRINT EVENTS LLC", address: "420 N 5th St Suite 210, Minneapolis MN", dateReported: "06/2018" },
    ],
  },
  creditScore: 668,
  scoreRange: "300–850",
  scoreFactors: [
    "Limited credit history — fewer than 5 accounts",
    "One 30-day late payment in the past 24 months",
    "High utilization on primary business card",
    "No derogatory public records",
  ],
  accounts: [
    {
      accountName: "CHASE BUSINESS UNLIMITED",
      accountNumber: "4147XXXXXXXX4821",
      type: "Revolving / Credit Card",
      balance: 18400,
      creditLimit: 22000,
      monthlyPayment: 550,
      dateOpened: "07/2018",
      dateOfLastActivity: "03/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 22000,
      paymentHistory: ["OK","OK","30","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","ND","ND"],
      remarks: "One 30-day late payment — March 2026",
    },
    {
      accountName: "FIRST NATIONAL BANK — BUSINESS LOC",
      accountNumber: "8821XXXXXXXX0033",
      type: "Line of Credit",
      balance: 9500,
      creditLimit: 25000,
      monthlyPayment: 280,
      dateOpened: "02/2020",
      dateOfLastActivity: "04/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 25000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
    {
      accountName: "MINNEAPOLIS EQUIPMENT FINANCE",
      accountNumber: "3301XXXXXXXX7712",
      type: "Installment / Equipment Loan",
      balance: 14200,
      monthlyPayment: 620,
      dateOpened: "09/2021",
      dateOfLastActivity: "04/2026",
      status: "current",
      responsibility: "individual",
      highBalance: 28000,
      paymentHistory: ["OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK","OK"],
    },
  ],
  publicRecords: [],
  inquiries: [
    { creditor: "CHASE BANK", date: "03/2026", type: "hard" },
    { creditor: "FIRST NATIONAL BANK", date: "01/2026", type: "hard" },
    { creditor: "EXPERIAN BUSINESS", date: "04/2026", type: "soft" },
  ],
  summary: {
    totalAccounts: 3,
    openAccounts: 3,
    closedAccounts: 0,
    delinquentAccounts: 0,
    derogatoryMarks: 0,
    totalBalance: 42100,
    totalCreditLimit: 47000,
    monthlyPayments: 1450,
    oldestAccount: "07/2018",
    averageAccountAge: "5 years 8 months",
  },
}

// ── Lookup by customer name (fuzzy match) ─────────────────────────────────────

const ALL_REPORTS = [MERIDIAN_CORP_REPORT, GRAND_HOTELS_REPORT, BLUEPRINT_EVENTS_REPORT]

export function getCreditReportForCustomer(customerName: string): CustomerCreditReport {
  const lower = customerName.toLowerCase()
  const match = ALL_REPORTS.find((r) =>
    lower.includes(r.customerName.split(" ")[0].toLowerCase()) ||
    lower.includes(r.customerName.split(" ").pop()!.toLowerCase())
  )
  // Default to Meridian Corp (highest risk) for unknown customers in demo
  return match ?? MERIDIAN_CORP_REPORT
}
