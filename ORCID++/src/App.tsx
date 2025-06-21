"use client"

import { useState, useEffect, useCallback } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Index from "./pages/Index"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import Search from "./pages/Search"
import Publications from "./pages/Publications"
import Projects from "./pages/Projects"
import EditProfile from "./pages/EditProfile"
import Navigation from "./components/Navigation"
import ResearcherProfilePage from "./pages/ResearcherProfilePage"
import EditPublicationPage from "./pages/EditPublicationPage"
import EditProjectPage from "./pages/EditProjectPage"
import PublicationDetailPage from "./pages/PublicationDetailPage"
import ProjectDetailPage from "./pages/ProjectDetailPage"
import Login from "./pages/Login"
import Register from "./pages/Register"
import OAuthCallback from "./pages/OAuthCallback"
import NewPublicationPage from "./pages/NewPublicationPage"
import NewProjectPage from "./pages/NewProjectPage"
import { mockResearcherData, mockResearchers } from "./data/mockData"
import type { Researcher, Publication, Project } from "./types"
import OtherProjectDetailPage from "./components/OtherProjectDetailPage"
import OtherPublicationDetailPage from "./components/OtherPublicationDetailPage"

const queryClient = new QueryClient()

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  researcher: Researcher | null
}

const App = () => {
  // Authentication state
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    researcher: null,
  })

  // Estados centrais - dados dos pesquisadores ficam aqui no App
  const [currentResearcher, setCurrentResearcher] = useState<Researcher | null>(null)
  const [allResearchers, setAllResearchers] = useState<Researcher[]>(mockResearchers)
  const [loading, setLoading] = useState(true)
  const [authLoaded, setAuthLoaded] = useState(false)

  // Load authentication state from localStorage on app start
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const savedAuth = localStorage.getItem("orcid_auth")
        if (savedAuth) {
          const authData = JSON.parse(savedAuth)

          // Validate token expiry if stored
          if (authData.token && authData.expiresAt) {
            const now = Date.now()
            if (now < authData.expiresAt) {
              console.log("🔐 Carregando estado de autenticação salvo:", authData.researcher?.name)
              setAuth({
                isAuthenticated: true,
                token: authData.token,
                researcher: authData.researcher,
              })
              setCurrentResearcher(authData.researcher)
              setAuthLoaded(true)
              setLoading(false)
              return
            } else {
              // Token expired, clear stored auth
              console.log("🔐 Token expirado, limpando autenticação")
              localStorage.removeItem("orcid_auth")
            }
          }
        }
      } catch (error) {
        console.error("Error loading auth state:", error)
        localStorage.removeItem("orcid_auth")
      }

      // Se não há autenticação salva, carrega dados mock
      console.log("📝 Carregando dados mock (usuário não autenticado)")
      setCurrentResearcher(mockResearcherData as Researcher)
      setAuthLoaded(true)
      setLoading(false)
    }

    loadAuthState()
  }, [])

  // Handle successful login
  const handleLogin = useCallback((researcher: Researcher, token: string) => {
    console.log("✅ Login realizado com sucesso:", researcher.name)

    const authData = {
      isAuthenticated: true,
      token,
      researcher,
      expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000, // 20 years (ORCID tokens are long-lived)
    }

    // Update state
    setAuth({
      isAuthenticated: true,
      token,
      researcher,
    })
    setCurrentResearcher(researcher)

    // Persist to localStorage
    try {
      localStorage.setItem("orcid_auth", JSON.stringify(authData))
      console.log("💾 Estado de autenticação salvo no localStorage")
    } catch (error) {
      console.error("Error saving auth state:", error)
    }
  }, [])

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log("🚪 Fazendo logout...")

    setAuth({
      isAuthenticated: false,
      token: null,
      researcher: null,
    })
    setCurrentResearcher(mockResearcherData as Researcher)

    // Clear stored auth
    try {
      localStorage.removeItem("orcid_auth")
      console.log("🗑️ Dados de autenticação removidos do localStorage")
    } catch (error) {
      console.error("Error clearing auth state:", error)
    }
  }, [])

  // Função para atualizar os dados do pesquisador atual
  const handleUpdateCurrentResearcher = useCallback(
    (updatedResearcher: Researcher) => {
      console.log("🔄 Atualizando dados do pesquisador:", updatedResearcher.name)
      setCurrentResearcher(updatedResearcher)

      // Se o usuário está autenticado, também atualizar o estado de auth
      if (auth.isAuthenticated && auth.researcher?.orcidId === updatedResearcher.orcidId) {
        const updatedAuth = {
          ...auth,
          researcher: updatedResearcher,
        }

        setAuth(updatedAuth)

        // Persistir no localStorage
        try {
          const authData = {
            isAuthenticated: true,
            token: auth.token,
            researcher: updatedResearcher,
            expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000,
          }
          localStorage.setItem("orcid_auth", JSON.stringify(authData))
        } catch (error) {
          console.error("Error saving updated auth state:", error)
        }
      }

      // Também atualizar na lista de todos os pesquisadores se necessário
      const researcherIndex = allResearchers.findIndex((r) => r.orcidId === updatedResearcher.orcidId)
      if (researcherIndex !== -1) {
        setAllResearchers((prev) => {
          const updated = [...prev]
          updated[researcherIndex] = updatedResearcher
          return updated
        })
      }
    },
    [auth, allResearchers],
  )

  // Função para atualizar uma publicação específica
  const handleUpdatePublication = useCallback(
    (updatedPublication: Publication) => {
      if (!currentResearcher) return

      const updatedPublications = currentResearcher.publications.map((pub) =>
        pub.id === updatedPublication.id ? updatedPublication : pub,
      )
      const updatedResearcher = { ...currentResearcher, publications: updatedPublications }

      setCurrentResearcher(updatedResearcher)

      // Se o usuário está autenticado, também atualizar o estado de auth
      if (auth.isAuthenticated && auth.researcher) {
        const updatedAuth = { ...auth, researcher: updatedResearcher }
        setAuth(updatedAuth)

        // Persistir no localStorage
        try {
          const authData = {
            isAuthenticated: true,
            token: auth.token,
            researcher: updatedResearcher,
            expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000,
          }
          localStorage.setItem("orcid_auth", JSON.stringify(authData))
        } catch (error) {
          console.error("Error saving updated auth state:", error)
        }
      }
    },
    [auth, currentResearcher],
  )

  // Função para atualizar um projeto específico
  const handleUpdateProject = useCallback(
    (updatedProject: Project) => {
      if (!currentResearcher) return

      const updatedProjects = currentResearcher.projects.map((proj) =>
        proj.id === updatedProject.id ? updatedProject : proj,
      )
      const updatedResearcher = { ...currentResearcher, projects: updatedProjects }

      setCurrentResearcher(updatedResearcher)

      // Se o usuário está autenticado, também atualizar o estado de auth
      if (auth.isAuthenticated && auth.researcher) {
        const updatedAuth = { ...auth, researcher: updatedResearcher }
        setAuth(updatedAuth)

        // Persistir no localStorage
        try {
          const authData = {
            isAuthenticated: true,
            token: auth.token,
            researcher: updatedResearcher,
            expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000,
          }
          localStorage.setItem("orcid_auth", JSON.stringify(authData))
        } catch (error) {
          console.error("Error saving updated auth state:", error)
        }
      }
    },
    [auth, currentResearcher],
  )

  // Função para excluir uma publicação
  const handleDeletePublication = useCallback(
    (publicationId: string) => {
      if (!currentResearcher) return

      const updatedPublications = currentResearcher.publications.filter((pub) => pub.id !== publicationId)
      const updatedResearcher = { ...currentResearcher, publications: updatedPublications }

      setCurrentResearcher(updatedResearcher)

      // Se o usuário está autenticado, também atualizar o estado de auth
      if (auth.isAuthenticated && auth.researcher) {
        const updatedAuth = { ...auth, researcher: updatedResearcher }
        setAuth(updatedAuth)

        // Persistir no localStorage
        try {
          const authData = {
            isAuthenticated: true,
            token: auth.token,
            researcher: updatedResearcher,
            expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000,
          }
          localStorage.setItem("orcid_auth", JSON.stringify(authData))
        } catch (error) {
          console.error("Error saving updated auth state:", error)
        }
      }
    },
    [auth, currentResearcher],
  )

  // Função para excluir um projeto
  const handleDeleteProject = useCallback(
    (projectId: string) => {
      if (!currentResearcher) return

      const updatedProjects = currentResearcher.projects.filter((proj) => proj.id !== projectId)
      const updatedResearcher = { ...currentResearcher, projects: updatedProjects }

      setCurrentResearcher(updatedResearcher)

      // Se o usuário está autenticado, também atualizar o estado de auth
      if (auth.isAuthenticated && auth.researcher) {
        const updatedAuth = { ...auth, researcher: updatedResearcher }
        setAuth(updatedAuth)

        // Persistir no localStorage
        try {
          const authData = {
            isAuthenticated: true,
            token: auth.token,
            researcher: updatedResearcher,
            expiresAt: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000,
          }
          localStorage.setItem("orcid_auth", JSON.stringify(authData))
        } catch (error) {
          console.error("Error saving updated auth state:", error)
        }
      }
    },
    [auth, currentResearcher],
  )

  // Função para buscar dados de um pesquisador específico (para ResearcherProfilePage)
  const getResearcherById = useCallback(
    (id: string): Researcher | null => {
      if (id === "current") {
        return currentResearcher
      }
      return allResearchers.find((r) => r.orcidId === id) || null
    },
    [currentResearcher, allResearchers],
  )

  // Função para simular carregamento de dados com busca na API do ORCID (para ResearcherProfilePage)
  const loadResearcherData = useCallback(
    (id: string, callback: (researcher: Researcher | null) => void) => {
      setLoading(true)

      const fetchResearcherFromOrcid = async () => {
        try {
          setTimeout(() => {
            const researcher = getResearcherById(id)
            callback(researcher)
            setLoading(false)
          }, 500)
        } catch (error) {
          console.error("Erro ao carregar pesquisador:", error)
          callback(null)
          setLoading(false)
        }
      }

      fetchResearcherFromOrcid()
    },
    [getResearcherById],
  )

  // Function to refresh researcher data from ORCID API
  const refreshResearcherData = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.token || !auth.researcher?.orcidId) {
      console.log("⚠️ Não é possível atualizar: usuário não autenticado")
      return
    }

    console.log("🔄 Iniciando atualização dos dados do pesquisador...")
    setLoading(true)

    try {
      const orcidId = auth.researcher.orcidId

      // Fetch updated profile data
      const profileResponse = await fetch(`http://localhost:3000/api/orcid/profile/${orcidId}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: "application/json",
        },
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        console.log("📡 Dados recebidos da API:", profileData)

        // Convert ORCID data to Researcher format, preserving local data
        const updatedResearcher = mapOrcidDataToResearcher(profileData, currentResearcher)

        // Update current researcher
        handleUpdateCurrentResearcher(updatedResearcher)

        console.log("✅ Dados do pesquisador atualizados com sucesso")
      } else {
        console.error("❌ Erro ao buscar dados da API:", profileResponse.status)
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar dados do pesquisador:", error)
    } finally {
      setLoading(false)
    }
  }, [auth, currentResearcher, handleUpdateCurrentResearcher])

  // Helper function to convert ORCID data to Researcher format, preserving existing data
  const mapOrcidDataToResearcher = useCallback((orcidData: any, existingResearcher: Researcher | null): Researcher => {
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

    const researcherUrls = person["researcher-urls"]?.["researcher-url"] || []
    const externalLinks = researcherUrls.map((url: any) => ({
      name: url["url-name"] || "Link",
      url: url.url.value,
    }))

    // Convert works to publications
    const works = orcidData["activities-summary"]?.works?.group || []
    const publications = works.map((workGroup: any, index: number) => {
      const workSummary = workGroup["work-summary"]?.[0]
      return {
        id: workSummary?.["put-code"]?.toString() || `pub-${index}`,
        title: workSummary?.title?.title?.value || "Título não informado",
        authors: [{ name: fullName, orcidId: orcidData["orcid-identifier"]?.path || "" }],
        year: Number.parseInt(workSummary?.["publication-date"]?.year?.value) || new Date().getFullYear(),
        type: workSummary?.type || "journal-article",
        source: workSummary?.["journal-title"]?.value || "",
        identifier: { type: "doi", value: "" },
        abstract: "",
        links: [],
      }
    })

    // Convert fundings to projects
    const fundings = orcidData["activities-summary"]?.fundings?.group || []
    const projects = fundings.map((fundingGroup: any, index: number) => {
      const fundingSummary = fundingGroup["funding-summary"]?.[0]
      return {
        id: fundingSummary?.["put-code"]?.toString() || `proj-${index}`,
        name: fundingSummary?.title?.title?.value || "Projeto sem título",
        title: fundingSummary?.title?.title?.value || "Projeto sem título",
        description: fundingSummary?.["short-description"] || "",
        startYear: Number.parseInt(fundingSummary?.["start-date"]?.year?.value) || new Date().getFullYear(),
        endYear: fundingSummary?.["end-date"]?.year?.value
          ? Number.parseInt(fundingSummary["end-date"].year.value)
          : "Em andamento",
        funding: fundingSummary?.organization?.name || "",
        fundingAgency: fundingSummary?.organization?.name || "",
        fundingAmount: fundingSummary?.amount?.value || "",
        fundingCurrency: fundingSummary?.amount?.["currency-code"] || "BRL",
        role: "",
        publications: [],
      }
    })

    // Merge with existing data, prioritizing API data for basic info but preserving local customizations
    return {
      name: fullName || existingResearcher?.name || "Nome não informado",
      orcidId: orcidData["orcid-identifier"]?.path || existingResearcher?.orcidId || "",
      institution: institution || existingResearcher?.institution || "Instituição não informada",
      department: department || existingResearcher?.department,
      role: role || existingResearcher?.role,
      email: email || existingResearcher?.email,
      bio: bio || existingResearcher?.bio || "",
      researchAreas: researchAreas.length > 0 ? researchAreas : existingResearcher?.researchAreas || [],
      education: existingResearcher?.education || [],
      awards: existingResearcher?.awards || [],
      institutionalPage: existingResearcher?.institutionalPage || "",
      externalLinks: externalLinks.length > 0 ? externalLinks : existingResearcher?.externalLinks || [],
      publications: publications.length > 0 ? publications : existingResearcher?.publications || [],
      projects: projects.length > 0 ? projects : existingResearcher?.projects || [],
    }
  }, [])

  // Function to handle new project creation
  const handleProjectCreated = useCallback(
    async (project: any) => {
      console.log("🆕 Novo projeto criado, atualizando dados...")
      await refreshResearcherData()
    },
    [refreshResearcherData],
  )

  // Function to handle new publication creation
  const handlePublicationCreated = useCallback(
    async (publication: any) => {
      console.log("🆕 Nova publicação criada, atualizando dados...")
      await refreshResearcherData()
    },
    [refreshResearcherData],
  )

  // Debug: Log do estado atual
  useEffect(() => {
    if (authLoaded) {
      console.log("🔍 Estado atual da aplicação:", {
        isAuthenticated: auth.isAuthenticated,
        researcherName: currentResearcher?.name,
        researcherOrcid: currentResearcher?.orcidId,
        authResearcherName: auth.researcher?.name,
        authResearcherOrcid: auth.researcher?.orcidId,
      })
    }
  }, [auth, currentResearcher, authLoaded])

  // Não renderizar até que o estado de autenticação seja carregado
  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando aplicação...</p>
        </div>
      </div>
    )
  }

  // Não renderizar as rotas se currentResearcher ainda não foi carregado
  if (!currentResearcher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do pesquisador...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navigation isAuthenticated={auth.isAuthenticated} onLogout={handleLogout} researcher={auth.researcher} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Index researcher={currentResearcher} loading={loading} />} />
              <Route path="/search" element={<Search />} />
              <Route
                path="/publications"
                element={
                  <Publications
                    publications={currentResearcher.publications}
                    loading={loading}
                    onDeletePublication={handleDeletePublication}
                    orcidId={currentResearcher.orcidId}
                  />
                }
              />
              <Route
                path="/projects"
                element={
                  <Projects
                    projects={currentResearcher.projects}
                    publications={currentResearcher.publications}
                    loading={loading}
                    onDeleteProject={handleDeleteProject}
                    orcidId={currentResearcher.orcidId}
                  />
                }
              />
              <Route
                path="/edit-profile"
                element={
                  <EditProfile
                    researcher={currentResearcher}
                    loading={loading}
                    onUpdateResearcher={handleUpdateCurrentResearcher}
                    onRefreshData={refreshResearcherData}
                    isAuthenticated={auth.isAuthenticated}
                    token={auth.token}
                  />
                }
              />
              <Route
                path="/new-project"
                element={
                  <NewProjectPage
                    orcidId={currentResearcher.orcidId}
                    token={auth.token}
                    onProjectCreated={handleProjectCreated}
                  />
                }
              />
              <Route
                path="/new-publication"
                element={
                  <NewPublicationPage
                    orcidId={currentResearcher.orcidId}
                    token={auth.token}
                    projects={currentResearcher.projects}
                    onPublicationCreated={handlePublicationCreated}
                  />
                }
              />
              <Route
                path="/researcher/:id"
                element={
                  <ResearcherProfilePage
                    getResearcherById={getResearcherById}
                    loadResearcherData={loadResearcherData}
                    loading={loading}
                  />
                }
              />
              <Route path="/publication/:publicationId" element={<PublicationDetailPage />} />
              <Route path="/project/:projectId" element={<ProjectDetailPage />} />
              <Route
                path="/edit-publication/:id"
                element={
                  <EditPublicationPage
                    publications={currentResearcher.publications}
                    projects={currentResearcher.projects}
                    onUpdatePublication={handleUpdatePublication}
                    isAuthenticated={auth.isAuthenticated}
                    token={auth.token}
                    orcidId={currentResearcher.orcidId}
                  />
                }
              />
              <Route
                path="/edit-project/:id"
                element={
                  <EditProjectPage
                    projects={currentResearcher.projects}
                    onUpdateProject={handleUpdateProject}
                    isAuthenticated={auth.isAuthenticated}
                    token={auth.token}
                    orcidId={currentResearcher.orcidId}
                  />
                }
              />
              <Route path="/other-project/:projectId" element={<OtherProjectDetailPage />} />
              <Route path="/other-publication/:publicationId" element={<OtherPublicationDetailPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login/callback" element={<OAuthCallback onLogin={handleLogin} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
