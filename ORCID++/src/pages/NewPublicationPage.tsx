"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface NewPublicationPageProps {
  orcidId?: string
  token?: string | null
  projects?: any[]
  onPublicationCreated?: (publication: any) => void
}

const NewPublicationPage: React.FC<NewPublicationPageProps> = ({
  orcidId,
  token,
  projects = [],
  onPublicationCreated,
}) => {
  const navigate = useNavigate()

  const [publication, setPublication] = useState({
    title: "",
    authors: [{ name: "", orcidId: "" }],
    year: new Date().getFullYear(),
    type: "journal-article",
    source: "",
    identifier: { type: "doi", value: "" },
    project: "",
    abstract: "",
    links: [{ name: "", url: "" }],
  })

  const [saving, setSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPublication((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAuthorChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      const newAuthors = [...prev.authors]
      newAuthors[index] = { ...newAuthors[index], [field]: value }
      return { ...prev, authors: newAuthors }
    })
  }

  const addAuthor = () => {
    setPublication((prev) => ({
      ...prev,
      authors: [...prev.authors, { name: "", orcidId: "" }],
    }))
  }

  const removeAuthor = (index: number) => {
    setPublication((prev) => {
      const newAuthors = [...prev.authors]
      newAuthors.splice(index, 1)
      return { ...prev, authors: newAuthors }
    })
  }

  const handleLinkChange = (index: number, field: string, value: string) => {
    setPublication((prev) => {
      const newLinks = [...prev.links]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return { ...prev, links: newLinks }
    })
  }

  const addLink = () => {
    setPublication((prev) => ({
      ...prev,
      links: [...prev.links, { name: "", url: "" }],
    }))
  }

  const removeLink = (index: number) => {
    setPublication((prev) => {
      const newLinks = [...prev.links]
      newLinks.splice(index, 1)
      return { ...prev, links: newLinks }
    })
  }

  const handleSave = async () => {
    // Validação básica
    if (!publication.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da publicação é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (publication.authors.length === 0 || !publication.authors[0].name.trim()) {
      toast({
        title: "Erro",
        description: "Pelo menos um autor é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (!orcidId) {
      toast({
        title: "Erro",
        description: "ORCID ID não encontrado. Faça login novamente.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      console.log("Criando publicação via API...", publication)

      // Filtrar autores válidos
      const validAuthors = publication.authors.filter((author) => author.name.trim())

      // Filtrar links válidos
      const validLinks = publication.links.filter((link) => link.name.trim() && link.url.trim())

      // Preparar dados para envio
      const publicationData = {
        title: publication.title.trim(),
        year: publication.year,
        type: publication.type,
        source: publication.source.trim() || null,
        abstract: publication.abstract.trim() || null,
        identifier: publication.identifier.value.trim()
          ? {
              type: publication.identifier.type,
              value: publication.identifier.value.trim(),
            }
          : null,
        authors: validAuthors,
        links: validLinks.length > 0 ? validLinks : null,
      }

      // Fazer requisição para o endpoint
      const response = await fetch(`http://localhost:3000/api/publication/${orcidId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(publicationData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar publicação")
      }

      toast({
        title: "Publicação criada",
        description: "A nova publicação foi criada com sucesso.",
      })

      // Chamar callback se fornecido
      if (onPublicationCreated && result.data) {
        onPublicationCreated(result.data)
      }

      navigate("/publications")
    } catch (error) {
      console.error("Erro ao criar publicação:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível criar a publicação.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Nova Publicação</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              value={publication.title}
              onChange={handleChange}
              className="mt-1"
              placeholder="Digite o título da publicação"
            />
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
            <Input
              id="source"
              name="source"
              value={publication.source}
              onChange={handleChange}
              className="mt-1"
              placeholder="Nome da revista, conferência ou editora"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="identifier.type">Tipo de Identificador</Label>
              <select
                id="identifier.type"
                value={publication.identifier.type}
                onChange={(e) => {
                  setPublication((prev) => ({
                    ...prev,
                    identifier: { ...prev.identifier, type: e.target.value },
                  }))
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
                  setPublication((prev) => ({
                    ...prev,
                    identifier: { ...prev.identifier, value: e.target.value },
                  }))
                }}
                className="mt-1"
                placeholder="Ex: 10.1000/xyz123"
              />
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <Label htmlFor="project">Projeto Associado</Label>
              <select
                id="project"
                name="project"
                value={publication.project}
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
              placeholder="Digite o resumo da publicação"
            />
          </div>

          <div>
            <Label>Links Adicionais (opcional)</Label>
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
            <h3 className="font-medium text-blue-800 mb-2">Dicas para uma boa publicação:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Inclua todos os autores na ordem correta</li>
              <li>• Adicione o DOI se disponível para facilitar a localização</li>
              <li>• Escreva um resumo claro e conciso</li>
              <li>• Associe a um projeto se aplicável</li>
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
              {saving ? "Criando..." : "Criar publicação"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default NewPublicationPage
