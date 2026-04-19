/**
 * TinyFish Health Endpoint — Unit Tests
 *
 * Tests GET /api/tinyfish/health:
 *   - Returns portalReconnaissance section with mode, vaultEnabled, portalReconEnabled
 *   - Includes existing health check data alongside portal recon status
 *
 * Requirements: 8.7
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}))

const mockHealthCheck = vi.fn()
vi.mock("@/lib/tinyfish/client", () => ({
  healthCheck: () => mockHealthCheck(),
}))

let mockPortalReconMode: "mock" | "misconfigured" | "live" = "mock"
let mockVaultEnabled = false
let mockPortalReconEnabled = false

vi.mock("@/lib/env", () => ({
  get getPortalReconMode() {
    return () => mockPortalReconMode
  },
  get TINYFISH_VAULT_ENABLED() {
    return mockVaultEnabled
  },
  get TINYFISH_PORTAL_RECON_ENABLED() {
    return mockPortalReconEnabled
  },
}))

// ─── Import route handler after mocks ──────────────────────────────────────

import { GET } from "./route"

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/tinyfish/health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPortalReconMode = "mock"
    mockVaultEnabled = false
    mockPortalReconEnabled = false
  })

  it("returns portalReconnaissance section in mock mode", async () => {
    mockHealthCheck.mockResolvedValueOnce({
      ok: true,
      mode: "mock",
      details: "TinyFish mock mode active",
    })

    const res = await GET()
    const json = await res.json()

    expect(json.data.portalReconnaissance).toEqual({
      mode: "mock",
      vaultEnabled: false,
      portalReconEnabled: false,
    })
  })

  it("returns portalReconnaissance with live mode when fully configured", async () => {
    mockPortalReconMode = "live"
    mockVaultEnabled = true
    mockPortalReconEnabled = true
    mockHealthCheck.mockResolvedValueOnce({
      ok: true,
      mode: "live",
      details: "TinyFish live mode configured",
    })

    const res = await GET()
    const json = await res.json()

    expect(json.data.portalReconnaissance).toEqual({
      mode: "live",
      vaultEnabled: true,
      portalReconEnabled: true,
    })
  })

  it("returns portalReconnaissance with misconfigured mode", async () => {
    mockPortalReconMode = "misconfigured"
    mockVaultEnabled = false
    mockPortalReconEnabled = true
    mockHealthCheck.mockResolvedValueOnce({
      ok: false,
      mode: "misconfigured",
      details: "Missing config",
    })

    const res = await GET()
    const json = await res.json()

    expect(json.data.portalReconnaissance).toEqual({
      mode: "misconfigured",
      vaultEnabled: false,
      portalReconEnabled: true,
    })
  })

  it("preserves existing health check fields alongside portalReconnaissance", async () => {
    mockHealthCheck.mockResolvedValueOnce({
      ok: true,
      mode: "mock",
      details: "TinyFish mock mode active",
    })

    const res = await GET()
    const json = await res.json()

    expect(json.data.ok).toBe(true)
    expect(json.data.mode).toBe("mock")
    expect(json.data.details).toBe("TinyFish mock mode active")
    expect(json.data.portalReconnaissance).toBeDefined()
  })

  it("returns 500 when healthCheck throws", async () => {
    mockHealthCheck.mockRejectedValueOnce(new Error("Unexpected failure"))

    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/Unexpected failure/)
  })
})
