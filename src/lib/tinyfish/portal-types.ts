export type {
  PortalReconnaissanceMode,
  PortalReconnaissanceResult,
  PortalReconnaissanceResponse,
  Screenshot,
  ParsedPortalData,
  ParsedInvoice,
  ParsedActivity,
  PortalLoginResult,
  PortalReconScenario,
} from "./portal-schemas"

export interface PortalReconOptions {
  invoiceId: string
  customerId?: string
  portalUrl?: string
  invoiceNumber?: string
  invoiceAmount?: number
  sendMessage?: boolean
  messageDraft?: string
  scenario?: import("./portal-schemas").PortalReconScenario
}
