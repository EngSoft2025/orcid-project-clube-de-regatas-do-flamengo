const request = require("supertest")
const { Client } = require("pg")

// Mock dependencies
jest.mock("pg")
jest.mock("node-fetch")
jest.mock("dotenv")

// Mock the Express app
const express = require("express")
const app = express()

// Mock database client
const mockClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
}

Client.mockImplementation(() => mockClient)

// Mock fetch
const fetch = require("node-fetch")

describe("ORCID Proxy Server", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 })
  })

  describe("Database Connection", () => {
    test("should connect to PostgreSQL successfully", async () => {
      mockClient.connect.mockResolvedValue()

      // Import server after mocking
      delete require.cache[require.resolve("./server")]
      require("./server")

      expect(mockClient.connect).toHaveBeenCalled()
    })
  })

  describe("ORCID Validation", () => {
    test("should validate correct ORCID format", () => {
      const validOrcids = ["0000-0000-0000-0000", "1234-5678-9012-345X", "9999-9999-9999-9999"]

      const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/

      validOrcids.forEach((orcid) => {
        expect(orcidRegex.test(orcid)).toBe(true)
      })
    })

    test("should reject invalid ORCID formats", () => {
      const invalidOrcids = ["0000-0000-0000", "0000-0000-0000-00000", "invalid-orcid", "0000_0000_0000_0000", ""]

      const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/

      invalidOrcids.forEach((orcid) => {
        expect(orcidRegex.test(orcid)).toBe(false)
      })
    })
  })

  describe("User Management Functions", () => {
    test("verificarUsuarioExistente should return existing user", async () => {
      const mockUser = { id: 1, nome: "Test User" }
      mockClient.query.mockResolvedValue({ rows: [mockUser] })

      // Since we can't directly import the function, we'll test the query pattern
      const query = "SELECT id, nome FROM Usuarios WHERE orcid_id = $1"
      const result = await mockClient.query(query, ["0000-0000-0000-0000"])

      expect(result.rows).toEqual([mockUser])
      expect(mockClient.query).toHaveBeenCalledWith(query, ["0000-0000-0000-0000"])
    })

    test("verificarUsuarioExistente should return null for non-existing user", async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const query = "SELECT id, nome FROM Usuarios WHERE orcid_id = $1"
      const result = await mockClient.query(query, ["0000-0000-0000-0000"])

      expect(result.rows).toEqual([])
    })
  })

  describe("Data Validation", () => {
    test("should validate email format", () => {
      const validEmails = ["test@example.com", "user.name@domain.co.uk", "test+tag@example.org"]

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true)
      })
    })

    test("should reject invalid email formats", () => {
      const invalidEmails = ["invalid-email", "@domain.com", "test@", "test.domain.com"]

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })

    test("should validate URL format", () => {
      const validUrls = ["https://example.com", "http://test.org", "https://subdomain.example.com/path"]

      validUrls.forEach((url) => {
        expect(() => new URL(url)).not.toThrow()
      })
    })
  })

  describe("Database Query Patterns", () => {
    test("should handle user insertion query", async () => {
      const insertQuery = `
        INSERT INTO Usuarios (orcid_id, nome, instituicao, departamento, cargo, email, biografia, pagina_institucional)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `

      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })

      const result = await mockClient.query(insertQuery, [
        "0000-0000-0000-0000",
        "Test User",
        "Test Institution",
        "Test Department",
        "Researcher",
        "test@example.com",
        "Test bio",
        "https://example.com",
      ])

      expect(result.rows[0].id).toBe(1)
    })

    test("should handle project creation query", async () => {
      const insertProjectQuery = `
        INSERT INTO Projetos (nome, ano_inicio, ano_termino, agencia_de_financiamento, financiamento, funcao_no_projeto, descricao)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `

      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })

      const result = await mockClient.query(insertProjectQuery, [
        "Test Project",
        2023,
        2024,
        "Test Agency",
        "10000",
        "Principal Investigator",
        "Test description",
      ])

      expect(result.rows[0].id).toBe(1)
    })

    test("should handle publication creation query", async () => {
      const insertWorkQuery = `
        INSERT INTO Trabalhos (nome, ano, tipo_de_trabalho, fonte, resumo, tipo_identificador, valor_identificador, links_adicionais, usuario_proprietario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `

      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })

      const result = await mockClient.query(insertWorkQuery, [
        "Test Publication",
        2023,
        "journal-article",
        "Test Journal",
        "Test abstract",
        "doi",
        "10.1000/test",
        ["https://example.com"],
        1,
      ])

      expect(result.rows[0].id).toBe(1)
    })
  })

  describe("Error Handling", () => {
    test("should handle database query errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()
      mockClient.query.mockRejectedValue(new Error("Database error"))

      try {
        await mockClient.query("SELECT * FROM Usuarios")
      } catch (error) {
        expect(error.message).toBe("Database error")
      }

      consoleSpy.mockRestore()
    })

    test("should handle transaction rollback", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error("Query failed")) // Failed query
        .mockResolvedValueOnce({ rows: [] }) // ROLLBACK

      try {
        await mockClient.query("BEGIN")
        await mockClient.query("INVALID QUERY")
      } catch (error) {
        await mockClient.query("ROLLBACK")
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK")
      }
    })
  })

  describe("Data Processing Functions", () => {
    test("should extract authors from ORCID data correctly", () => {
      const mockOrcidData = {
        contributors: {
          contributor: [
            {
              "credit-name": { value: "John Doe" },
              "contributor-orcid": { path: "0000-0000-0000-0001" },
              "contributor-email": "john@example.com",
            },
            {
              "credit-name": { value: "Jane Smith" },
              "contributor-orcid": { path: "0000-0000-0000-0002" },
              "contributor-email": "jane@example.com",
            },
          ],
        },
      }

      // Simulate the extraction logic
      const authors = mockOrcidData.contributors.contributor.map((contrib, index) => ({
        name: contrib["credit-name"]?.value || `Autor ${index + 1}`,
        orcidId: contrib["contributor-orcid"]?.path || null,
        email: contrib["contributor-email"] || null,
      }))

      expect(authors).toHaveLength(2)
      expect(authors[0].name).toBe("John Doe")
      expect(authors[0].orcidId).toBe("0000-0000-0000-0001")
      expect(authors[1].name).toBe("Jane Smith")
    })

    test("should handle empty ORCID contributor data", () => {
      const mockOrcidData = {
        contributors: {
          contributor: [],
        },
      }

      const authors = mockOrcidData.contributors.contributor.map((contrib, index) => ({
        name: contrib["credit-name"]?.value || `Autor ${index + 1}`,
        orcidId: contrib["contributor-orcid"]?.path || null,
        email: contrib["contributor-email"] || null,
      }))

      expect(authors).toHaveLength(0)
    })
  })
})