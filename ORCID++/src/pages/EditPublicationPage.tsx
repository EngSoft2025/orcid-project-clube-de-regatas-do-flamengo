"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import type { Publication, Project } from "../types"
import { toast } from "@/hooks/use-toast"

interface EditPublicationPageProps {
  publications: Publication[]
  projects: Project[]
  onUpdatePublication: (publication: Publication) => void
  isAuthenticated: boolean
  token: string | null
  orcidId?: string
  researcher?: any
}

const EditPublicationPage: React.FC<EditPublicationPageProps> = ({
  publications,
  projects,
  onUpdatePublication,
  isAuthenticated,
  token,
  orcidId,
  researcher,
}) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [publication, setPublication] = useState<Publication | null>(null)
  const [saving, setSaving] = useState(false)

  // Carrega a publicação pelos dados já disponíveis
  useEffect(() => {
    if (!id) return

    const foundPub = publications.find((p) => p.id === id)

    if (foundPub) {
      const publicationCopy = JSON.parse(JSON.stringify(foundPub))
      // Garantir que sempre temos pelo menos um autor
      if (!publicationCopy.authors || publicationCopy.authors.length === 0) {
        publicationCopy.authors = [{ name: "", orcidId: "" }]
      }
      setPublication(publicationCopy)
      console.log("✅ Publicação encontrada:", publicationCopy)
    } else if (id && publications.length > 0) {
      console.log("❌ Publicação não encontrada na lista")
      toast({
        title: "Publicação não encontrada",
        description: "A publicação solicitada não foi encontrada.",
        variant: "destructive",
      })
      navigate("/publications")
    }
  }, [id, publications, navigate])

  const handleSave = async () => {
    if (!publication) return

    // Validação dos autores
    const validAuthors = publication.authors.filter((author) => author.name.trim())
    if (validAuthors.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos um autor com nome é obrigatório.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Verificar se temos o ORCID ID
      let currentOrcidId = orcidId

      // Se não temos orcidId, tentar extrair do researcher
      if (!currentOrcidId && researcher) {
        currentOrcidId = researcher.orcidId || researcher["orcid-identifier"]?.path
      }

      console.log("🔧 Salvando publicação:")
      console.log("- ORCID ID usado:", currentOrcidId)
      console.log("- Publication ID:", publication.id)
      console.log("- Publication data:", publication)

      if (!currentOrcidId) {
        throw new Error("ORCID ID não encontrado. Verifique se o usuário está logado corretamente.")
      }

      // Preparar dados para envio - incluindo todos os autores
      const publicationData = {
        title: publication.title,
        year: publication.year,
        type: publication.type,
        source: publication.source,
        abstract: publication.abstract,
        identifier: publication.identifier,
        authors: validAuthors, // Enviar apenas autores válidos
        links: publication.links.filter((link) => link.name.trim() && link.url.trim()),
      }

      console.log("📤 Enviando dados:", publicationData)

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/publication/${currentOrcidId}/${publication.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(publicationData),
      })

      const result = await response.json()

      console.log("📥 Resposta do servidor:", result)

      if (!response.ok) {
        console.error("❌ Erro na resposta:", result)
        throw new Error(result.error || "Erro ao salvar publicação")
      }

      // Converter dados do banco para formato Publication se necessário
      if (result.data) {
        const updatedPublication = mapOrcidDataToPublication(result.data, publication.id)
        onUpdatePublication(updatedPublication)
      } else {
        onUpdatePublication(publication)
      }

      toast({
        title: "Publicação salva",
        description: "As alterações foram salvas com sucesso.",
      })

      navigate("/publications")
    } catch (error) {
      console.error("❌ Erro ao salvar publicação:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Função auxiliar para converter dados do ORCID para formato Publication
  const mapOrcidDataToPublication = (orcidData: any, publicationId: string): Publication => {
    return {
      id: publicationId,
      title: orcidData.title?.title?.value || orcidData.nome || "Publicação sem título",
      year: orcidData["publication-date"]?.year?.value || orcidData.ano || new Date().getFullYear(),
      type: orcidData.type || orcidData.tipo_de_trabalho || "journal-article",
      source: orcidData["journal-title"]?.value || orcidData.fonte || "",
      abstract: orcidData["short-description"] || orcidData.resumo || "",
      identifier: {
        type: orcidData["external-ids"]?.["external-id"]?.[0]?.["external-id-type"] || "",
        value: orcidData["external-ids"]?.["external-id"]?.[0]?.["external-id-value"] || "",
      },
      authors: orcidData.contributors?.contributor?.map((contrib: any) => ({
        name: contrib["credit-name"]?.value || "",
        orcidId: contrib["contributor-orcid"]?.path || "",
      })) || [{ name: "Autor Principal", orcidId: "" }],
      links: [],
      project: "",
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPublication((prev) => {
      if (!prev) return prev
      return { ...prev, [name]: value }
    })
  }

  const handleAuthorChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newAuthors = [...prev.authors]
      newAuthors[index] = { ...newAuthors[index], [field]: value }
      return { ...prev, authors: newAuthors }
    })
  }

  const addAuthor = () => {
    setPublication((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        authors: [...prev.authors, { name: "", orcidId: "" }],
      }
    })
  }

  const removeAuthor = (index: number) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newAuthors = [...prev.authors]
      newAuthors.splice(index, 1)
      return { ...prev, authors: newAuthors }
    })
  }

  const handleLinkChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newLinks = [...prev.links]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return { ...prev, links: newLinks }
    })
  }

  const addLink = () => {
    setPublication((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        links: [...prev.links, { name: "", url: "" }],
      }
    })
  }

  const removeLink = (index: number) => {
    setPublication((prev) => {
      if (!prev) return prev
      const newLinks = [...prev.links]
      newLinks.splice(index, 1)
      return { ...prev, links: newLinks }
    })
  }

  // Loading state enquanto não carregou a publicação
  if (!publication) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-center">
          <p>Carregando dados da publicação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Editar Publicação</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" value={publication.title} onChange={handleChange} className="mt-1" />
          </div>

          <div>
            <Label>Autores *</Label>
            <div className="space-y-3 mt-2">
              {publication.authors.map((author, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome do autor"
                    value={author.name}
                    onChange={(e) => handleAuthorChange(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="ORCID ID (opcional)"
                    value={author.orcidId}
                    onChange={(e) => handleAuthorChange(index, "orcidId", e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeAuthor(index)}
                    disabled={publication.authors.length <= 1}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addAuthor} className="flex items-center gap-2">
                <Plus size={16} /> Adicionar autor
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Ano *</Label>
              <Input
                id="year"
                name="year"
                type="number"
                value={publication.year}
                onChange={handleChange}
                className="mt-1"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo *</Label>
              <select
                id="type"
                name="type"
                value={publication.type}
                onChange={handleChange}
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="journal-article">Artigo de Revista</option>
                <option value="conference-paper">Artigo de Conferência</option>
                <option value="book-chapter">Capítulo de Livro</option>
                <option value="book">Livro</option>
                <option value="report">Relatório</option>
                <option value="thesis">Tese</option>
                <option value="dissertation">Dissertação</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="source">Fonte/Revista</Label>
            <Input id="source" name="source" value={publication.source} onChange={handleChange} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="identifier.type">Tipo de Identificador</Label>
              <select
                id="identifier.type"
                value={publication.identifier.type}
                onChange={(e) => {
                  setPublication((prev) => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, type: e.target.value },
                    }
                  })
                }}
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="doi">DOI</option>
                <option value="isbn">ISBN</option>
                <option value="issn">ISSN</option>
                <option value="pmid">PMID</option>
                <option value="arxiv">arXiv</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <Label htmlFor="identifier.value">Valor do Identificador</Label>
              <Input
                id="identifier.value"
                value={publication.identifier.value}
                onChange={(e) => {
                  setPublication((prev) => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, value: e.target.value },
                    }
                  })
                }}
                className="mt-1"
              />
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <Label htmlFor="project">Projeto Associado</Label>
              <select
                id="project"
                name="project"
                value={publication.project || ""}
                onChange={handleChange}
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="">Nenhum projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="abstract">Resumo</Label>
            <Textarea
              id="abstract"
              name="abstract"
              value={publication.abstract}
              onChange={handleChange}
              rows={5}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Links Adicionais</Label>
            <div className="space-y-3 mt-2">
              {publication.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Nome do link"
                    value={link.name}
                    onChange={(e) => handleLinkChange(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                  />
                  <Button variant="destructive" size="icon" onClick={() => removeLink(index)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addLink} className="flex items-center gap-2">
                <Plus size={16} /> Adicionar link
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Dicas para múltiplos autores:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Adicione todos os autores na ordem correta de publicação</li>
              <li>• Inclua o ORCID ID quando disponível para melhor identificação</li>
              <li>• Autores sem ORCID serão criados como usuários temporários no sistema</li>
              <li>• A ordem dos autores será preservada conforme inserida</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default EditPublicationPage
