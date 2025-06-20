"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save, Plus, Trash2, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Link {
  name: string
  url: string
}

interface Researcher {
  name: string
  orcidId: string
  institution: string
  department?: string
  role?: string
  email?: string
  bio: string
  institutionalPage: string
  researchAreas: string[]
  externalLinks: Link[]
  publications: any[]
  projects: any[]
}

interface EditProfileProps {
  researcher: Researcher
  loading: boolean
  onUpdateResearcher: (updatedResearcher: Researcher) => void
  onRefreshData?: () => Promise<void>
  isAuthenticated: boolean
  token?: string | null
}

const EditProfile: React.FC<EditProfileProps> = ({
  researcher: initialResearcher,
  loading: globalLoading,
  onUpdateResearcher,
  onRefreshData,
  isAuthenticated,
  token,
}) => {
  const [researcher, setResearcher] = useState<Researcher>(initialResearcher)
  const [saving, setSaving] = useState(false)
  const [newArea, setNewArea] = useState("")
  const [newLink, setNewLink] = useState({ name: "", url: "" })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Atualizar estado local quando o pesquisador global mudar
  useEffect(() => {
    setResearcher(initialResearcher)
    setErrors({}) // Limpar erros quando dados mudarem
  }, [initialResearcher])

  // 🆕 FUNÇÃO CORRIGIDA: Validação de dados
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Validar campos obrigatórios
    if (!researcher.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    }

    if (!researcher.orcidId.trim()) {
      newErrors.orcidId = "ORCID ID é obrigatório"
    } else if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(researcher.orcidId)) {
      newErrors.orcidId = "Formato ORCID inválido (ex: 0000-0000-0000-0000)"
    }

    if (!researcher.institution.trim()) {
      newErrors.institution = "Instituição é obrigatória"
    }

    // Validar email se fornecido
    if (researcher.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(researcher.email)) {
      newErrors.email = "Formato de email inválido"
    }

    // Validar página institucional se fornecida
    if (researcher.institutionalPage) {
      try {
        new URL(researcher.institutionalPage)
      } catch {
        newErrors.institutionalPage = "URL inválida"
      }
    }

    // Validar links externos
    researcher.externalLinks.forEach((link, index) => {
      if (!link.name.trim()) {
        newErrors[`link_name_${index}`] = "Nome do link é obrigatório"
      }
      if (!link.url.trim()) {
        newErrors[`link_url_${index}`] = "URL do link é obrigatória"
      } else {
        try {
          new URL(link.url)
        } catch {
          newErrors[`link_url_${index}`] = "URL inválida"
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 🆕 FUNÇÃO CORRIGIDA: Salvar perfil com melhor tratamento de erros
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar formulário antes de enviar
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário antes de salvar.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      console.log("🔄 Iniciando salvamento do perfil...")

      // Preparar dados para envio
      const profileData = {
        name: researcher.name.trim(),
        institution: researcher.institution.trim(),
        department: researcher.department?.trim() || null,
        role: researcher.role?.trim() || null,
        email: researcher.email?.trim() || null,
        bio: researcher.bio.trim(),
        institutionalPage: researcher.institutionalPage?.trim() || null,
        researchAreas: researcher.researchAreas.filter((area) => area.trim()),
        externalLinks: researcher.externalLinks.filter((link) => link.name.trim() && link.url.trim()),
      }

      console.log("📤 Enviando dados:", profileData)

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/profile/${researcher.orcidId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(profileData),
      })

      console.log("📥 Resposta recebida:", response.status)

      const result = await response.json()

      if (!response.ok) {
        console.error("❌ Erro na resposta:", result)
        throw new Error(result.error || `Erro HTTP ${response.status}`)
      }

      console.log("✅ Perfil salvo com sucesso:", result)

      // Converter dados do banco para formato Researcher se necessário
      if (result.data) {
        const updatedResearcher = mapOrcidDataToResearcher(result.data)
        onUpdateResearcher(updatedResearcher)
        setResearcher(updatedResearcher) // Atualizar estado local também
      } else {
        onUpdateResearcher(researcher)
      }

      // Opcionalmente, recarregar dados da API para garantir sincronização
      if (onRefreshData) {
        console.log("🔄 Recarregando dados...")
        await onRefreshData()
      }

      toast({
        title: "✅ Perfil salvo",
        description: isAuthenticated
          ? "As alterações foram salvas com sucesso no banco de dados."
          : "As alterações foram salvas com sucesso.",
      })

      // Limpar erros após salvamento bem-sucedido
      setErrors({})
    } catch (error) {
      console.error("❌ Erro ao salvar perfil:", error)

      let errorMessage = "Não foi possível salvar as alterações. Tente novamente."

      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "❌ Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // 🆕 FUNÇÃO CORRIGIDA: Converter dados do ORCID para formato Researcher
  const mapOrcidDataToResearcher = (orcidData: any): Researcher => {
    try {
      const person = orcidData.person || {}
      const name = person.name || {}
      const givenNames = name["given-names"]?.value || ""
      const familyName = name["family-name"]?.value || ""
      const fullName = `${givenNames} ${familyName}`.trim()

      const employments = orcidData["activities-summary"]?.employments?.["affiliation-group"]?.[0]?.summaries?.[0]
      const institution = employments?.organization?.name || ""
      const department = employments?.["department-name"] || ""
      const role = employments?.["role-title"] || ""

      const email = person.emails?.email?.[0]?.email || ""
      const bio = person.biography?.content || ""

      const keywords = person.keywords?.keyword || []
      const researchAreas = keywords.map((k: any) => k.content).filter(Boolean)

      // Priorizar links do banco de dados
      let externalLinks: Link[] = []

      // Se existem dados extras de links do banco, usar esses
      if (orcidData._links_externos && Array.isArray(orcidData._links_externos)) {
        externalLinks = orcidData._links_externos.map((link: any) => ({
          name: link.name || "Link",
          url: link.url,
        }))
      } else {
        // Caso contrário, usar dados do ORCID
        const researcherUrls = person["researcher-urls"]?.["researcher-url"] || []
        externalLinks = researcherUrls.map((url: any) => ({
          name: url["url-name"] || "Link",
          url: url.url.value,
        }))
      }

      return {
        name: fullName || "Nome não informado",
        orcidId: orcidData["orcid-identifier"]?.path || "",
        institution: institution || "Instituição não informada",
        department: department,
        role: role,
        email: email,
        bio: bio,
        institutionalPage: "", // Não disponível diretamente no ORCID
        researchAreas: researchAreas,
        externalLinks: externalLinks,
        publications: [], // Será preenchido separadamente
        projects: [], // Será preenchido separadamente
      }
    } catch (error) {
      console.error("❌ Erro ao mapear dados do ORCID:", error)
      return initialResearcher // Retornar dados originais em caso de erro
    }
  }

  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setResearcher((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const addResearchArea = () => {
    if (!newArea.trim()) return
    setResearcher((prev) => ({
      ...prev,
      researchAreas: [...prev.researchAreas, newArea.trim()],
    }))
    setNewArea("")
  }

  const removeResearchArea = (index: number) => {
    setResearcher((prev) => ({
      ...prev,
      researchAreas: prev.researchAreas.filter((_, i) => i !== index),
    }))
  }

  const addExternalLink = () => {
    if (!newLink.name.trim() || !newLink.url.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome e a URL do link.",
        variant: "destructive",
      })
      return
    }

    // Validar URL básica
    try {
      new URL(newLink.url)
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida (ex: https://exemplo.com)",
        variant: "destructive",
      })
      return
    }

    setResearcher((prev) => ({
      ...prev,
      externalLinks: [
        ...prev.externalLinks,
        {
          name: newLink.name.trim(),
          url: newLink.url.trim(),
        },
      ],
    }))
    setNewLink({ name: "", url: "" })
  }

  const removeExternalLink = (index: number) => {
    setResearcher((prev) => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index),
    }))

    // Limpar erros relacionados a este link
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`link_name_${index}`]
      delete newErrors[`link_url_${index}`]
      return newErrors
    })
  }

  if (globalLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados do perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Editar Perfil</h1>
        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-sm text-yellow-800">Modo demonstração - dados serão salvos localmente</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Informações Básicas</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <Input
                name="name"
                value={researcher.name}
                onChange={handleBasicInfoChange}
                className={`w-full ${errors.name ? "border-red-500" : "border-blue-200"}`}
                required
              />
              {errors.name && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ORCID ID *</label>
              <Input
                name="orcidId"
                value={researcher.orcidId}
                onChange={handleBasicInfoChange}
                className={`w-full ${errors.orcidId ? "border-red-500" : "border-blue-200"}`}
                placeholder="0000-0000-0000-0000"
                pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]"
                title="Formato: 0000-0000-0000-0000"
                required
              />
              {errors.orcidId && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.orcidId}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instituição *</label>
              <Input
                name="institution"
                value={researcher.institution}
                onChange={handleBasicInfoChange}
                className={`w-full ${errors.institution ? "border-red-500" : "border-blue-200"}`}
                required
              />
              {errors.institution && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.institution}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <Input
                name="department"
                value={researcher.department || ""}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
              <Input
                name="role"
                value={researcher.role || ""}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                name="email"
                type="email"
                value={researcher.email || ""}
                onChange={handleBasicInfoChange}
                className={`w-full ${errors.email ? "border-red-500" : "border-blue-200"}`}
              />
              {errors.email && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
              <Textarea
                name="bio"
                value={researcher.bio}
                onChange={handleBasicInfoChange}
                className="w-full border-blue-200"
                rows={4}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">{researcher.bio.length}/5000 caracteres</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Áreas de Pesquisa</h2>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {researcher.researchAreas.map((area, index) => (
                <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => removeResearchArea(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Remover área de pesquisa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {researcher.researchAreas.length === 0 && (
                <p className="text-gray-500 text-sm">Nenhuma área de pesquisa adicionada</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Adicionar área de pesquisa"
                className="border-blue-200"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addResearchArea()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addResearchArea}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newArea.trim()}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-white border-blue-100">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Links Externos</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Página Institucional</label>
              <Input
                name="institutionalPage"
                value={researcher.institutionalPage}
                onChange={handleBasicInfoChange}
                className={`w-full ${errors.institutionalPage ? "border-red-500" : "border-blue-200"}`}
                type="url"
                placeholder="https://www.instituicao.edu.br/perfil"
              />
              {errors.institutionalPage && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.institutionalPage}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {researcher.externalLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-700">{link.name}</p>
                    <p className="text-xs text-gray-500 break-all">{link.url}</p>
                    {(errors[`link_name_${index}`] || errors[`link_url_${index}`]) && (
                      <div className="flex items-center mt-1 text-red-600 text-xs">
                        <AlertCircle size={12} className="mr-1" />
                        {errors[`link_name_${index}`] || errors[`link_url_${index}`]}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeExternalLink(index)}
                    size="icon"
                    className="shrink-0"
                    title="Remover link"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              {researcher.externalLinks.length === 0 && (
                <p className="text-gray-500 text-sm">Nenhum link externo adicionado</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                placeholder="Nome do link (ex: ResearchGate)"
                className="border-blue-200"
              />
              <Input
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="URL (ex: https://researchgate.net/profile/...)"
                className="border-blue-200"
                type="url"
              />
              <Button
                type="button"
                onClick={addExternalLink}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newLink.name.trim() || !newLink.url.trim()}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EditProfile
