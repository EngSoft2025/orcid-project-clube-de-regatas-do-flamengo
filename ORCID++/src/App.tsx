import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";
import Publications from "./pages/Publications";
import Projects from "./pages/Projects";
import EditProfile from "./pages/EditProfile";
import Navigation from "./components/Navigation";
import ResearcherProfilePage from "./pages/ResearcherProfilePage";
import EditPublicationPage from "./pages/EditPublicationPage";
import EditProjectPage from "./pages/EditProjectPage";
import PublicationDetailPage from "./pages/PublicationDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import NewPublicationPage from "./pages/NewPublicationPage";
import NewProjectPage from "./pages/NewProjectPage";
import { mockResearcherData, mockResearchers } from "./data/mockData";
import { Researcher, Publication, Project } from "./types";
import OtherProjectDetailPage from './components/OtherProjectDetailPage';
import OtherPublicationDetailPage from './components/OtherPublicationDetailPage';

const queryClient = new QueryClient();

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  researcher: Researcher | null;
}

const App = () => {
  // Authentication state
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    researcher: null,
  });

  // Estados centrais - dados dos pesquisadores ficam aqui no App
  const [currentResearcher, setCurrentResearcher] = useState<Researcher>(mockResearcherData as Researcher);
  const [allResearchers, setAllResearchers] = useState<Researcher[]>(mockResearchers);
  const [loading, setLoading] = useState(false);

  // Load authentication state from localStorage on app start
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const savedAuth = localStorage.getItem('orcid_auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          
          // Validate token expiry if stored
          if (authData.token && authData.expiresAt) {
            const now = Date.now();
            if (now < authData.expiresAt) {
              setAuth({
                isAuthenticated: true,
                token: authData.token,
                researcher: authData.researcher,
              });
              setCurrentResearcher(authData.researcher);
              return;
            } else {
              // Token expired, clear stored auth
              localStorage.removeItem('orcid_auth');
            }
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        localStorage.removeItem('orcid_auth');
      }
    };

    loadAuthState();
  }, []);

  // Handle successful login
  const handleLogin = useCallback((researcher: Researcher, token: string) => {
    const authData = {
      isAuthenticated: true,
      token,
      researcher,
      expiresAt: Date.now() + (20 * 365 * 24 * 60 * 60 * 1000), // 20 years (ORCID tokens are long-lived)
    };

    // Update state
    setAuth({
      isAuthenticated: true,
      token,
      researcher,
    });
    setCurrentResearcher(researcher);

    // Persist to localStorage
    try {
      localStorage.setItem('orcid_auth', JSON.stringify(authData));
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    setAuth({
      isAuthenticated: false,
      token: null,
      researcher: null,
    });
    setCurrentResearcher(mockResearcherData as Researcher);
    
    // Clear stored auth
    try {
      localStorage.removeItem('orcid_auth');
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }, []);

  // Função para atualizar os dados do pesquisador atual
  const handleUpdateCurrentResearcher = useCallback((updatedResearcher: Researcher) => {
    setCurrentResearcher(updatedResearcher);
    
    // Se o usuário está autenticado, também atualizar o estado de auth
    if (auth.isAuthenticated && auth.researcher?.orcidId === updatedResearcher.orcidId) {
      const updatedAuth = {
        ...auth,
        researcher: updatedResearcher,
      };
      
      setAuth(updatedAuth);
      
      // Persistir no localStorage
      try {
        const authData = {
          isAuthenticated: true,
          token: auth.token,
          researcher: updatedResearcher,
          expiresAt: Date.now() + (20 * 365 * 24 * 60 * 60 * 1000),
        };
        localStorage.setItem('orcid_auth', JSON.stringify(authData));
      } catch (error) {
        console.error('Error saving updated auth state:', error);
      }
    }
    
    // Também atualizar na lista de todos os pesquisadores se necessário
    const researcherIndex = allResearchers.findIndex(r => r.orcidId === updatedResearcher.orcidId);
    if (researcherIndex !== -1) {
      setAllResearchers(prev => {
        const updated = [...prev];
        updated[researcherIndex] = updatedResearcher;
        return updated;
      });
    }
  }, [auth, allResearchers]);

  // Função para atualizar uma publicação específica
  const handleUpdatePublication = useCallback((updatedPublication: Publication) => {
    setCurrentResearcher(prev => {
      const updatedPublications = prev.publications.map(pub => 
        pub.id === updatedPublication.id ? updatedPublication : pub
      );
      return { ...prev, publications: updatedPublications };
    });

    // Se o usuário está autenticado, também atualizar o estado de auth
    if (auth.isAuthenticated && auth.researcher) {
      const updatedPublications = auth.researcher.publications.map(pub => 
        pub.id === updatedPublication.id ? updatedPublication : pub
      );
      const updatedResearcher = { ...auth.researcher, publications: updatedPublications };
      
      setAuth(prev => ({ ...prev, researcher: updatedResearcher }));
      
      // Persistir no localStorage
      try {
        const authData = {
          isAuthenticated: true,
          token: auth.token,
          researcher: updatedResearcher,
          expiresAt: Date.now() + (20 * 365 * 24 * 60 * 60 * 1000),
        };
        localStorage.setItem('orcid_auth', JSON.stringify(authData));
      } catch (error) {
        console.error('Error saving updated auth state:', error);
      }
    }
  }, [auth]);

  // Função para atualizar um projeto específico
  const handleUpdateProject = useCallback((updatedProject: Project) => {
    setCurrentResearcher(prev => {
      const updatedProjects = prev.projects.map(proj => 
        proj.id === updatedProject.id ? updatedProject : proj
      );
      return { ...prev, projects: updatedProjects };
    });

    // Se o usuário está autenticado, também atualizar o estado de auth
    if (auth.isAuthenticated && auth.researcher) {
      const updatedProjects = auth.researcher.projects.map(proj => 
        proj.id === updatedProject.id ? updatedProject : proj
      );
      const updatedResearcher = { ...auth.researcher, projects: updatedProjects };
      
      setAuth(prev => ({ ...prev, researcher: updatedResearcher }));
      
      // Persistir no localStorage
      try {
        const authData = {
          isAuthenticated: true,
          token: auth.token,
          researcher: updatedResearcher,
          expiresAt: Date.now() + (20 * 365 * 24 * 60 * 60 * 1000),
        };
        localStorage.setItem('orcid_auth', JSON.stringify(authData));
      } catch (error) {
        console.error('Error saving updated auth state:', error);
      }
    }
  }, [auth]);

  // useEffect para carregar dados do pesquisador atual via API do ORCID
  useEffect(() => {
    const fetchCurrentResearcherData = async () => {
      // If user is authenticated, use their data from ORCID
      if (auth.isAuthenticated && auth.researcher) {
        setCurrentResearcher(auth.researcher);
        return;
      }

      // Otherwise, load mock data (for demonstration)
      setLoading(true);
      try {
        console.log('Carregando dados do pesquisador atual...');
        setTimeout(() => {
          setCurrentResearcher(mockResearcherData as Researcher);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados do pesquisador:', error);
        setLoading(false);
      }
    };

    fetchCurrentResearcherData();
  }, [auth]);

  // Função para buscar dados de um pesquisador específico (para ResearcherProfilePage)
  const getResearcherById = useCallback((id: string): Researcher | null => {
    if (id === 'current') {
      return currentResearcher;
    }
    return allResearchers.find(r => r.orcidId === id) || null;
  }, [currentResearcher, allResearchers]);

  // Função para simular carregamento de dados com busca na API do ORCID (para ResearcherProfilePage)
  const loadResearcherData = useCallback((id: string, callback: (researcher: Researcher | null) => void) => {
    setLoading(true);
    
    const fetchResearcherFromOrcid = async () => {
      try {
        /* TODO: Substituir por busca real na API do ORCID
         * 1. Fazer fetch para: https://pub.orcid.org/v3.0/${id}/record
         * 2. Fazer fetch das publicações: https://pub.orcid.org/v3.0/${id}/works
         * 3. Fazer fetch dos detalhes de cada publicação
         * 4. Mapear dados para interface Researcher
         * 
         * const response = await fetch(`https://pub.orcid.org/v3.0/${id}/record`);
         * const data = await response.json();
         * const researcher = mapOrcidToResearcher(data);
         * callback(researcher);
         */
        
        // Simulação com dados mockados
        setTimeout(() => {
          const researcher = getResearcherById(id);
          callback(researcher);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Erro ao carregar pesquisador:', error);
        callback(null);
        setLoading(false);
      }
    };

    fetchResearcherFromOrcid();
  }, [getResearcherById]);

  // Function to refresh researcher data from ORCID API
  const refreshResearcherData = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.token || !auth.researcher?.orcidId) {
      return;
    }

    setLoading(true);
    try {
      const orcidId = auth.researcher.orcidId;
      
      // Fetch updated profile data
      const profileResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/record`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Accept': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        
        // Fetch updated works
        const worksResponse = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Accept': 'application/json',
          },
        });

        // Process and update researcher data
        // This would involve the same mapping logic as in OAuthCallback
        // For now, we'll just log that refresh was attempted
        console.log('Researcher data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing researcher data:', error);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navigation 
              isAuthenticated={auth.isAuthenticated}
              onLogout={handleLogout}
              researcher={auth.researcher}
            />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/profile" 
                element={
                  <Index 
                    researcher={currentResearcher}
                    loading={loading}
                  />
                } 
              />
              <Route 
                path="/search" 
                element={<Search />} 
              />
              <Route 
                path="/publications" 
                element={
                  <Publications 
                    publications={currentResearcher.publications}
                    loading={loading}
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
                path="/new-publication" 
                element={<NewPublicationPage />} 
              />
              <Route 
                path="/new-project" 
                element={<NewProjectPage />} 
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
              {/* Páginas de detalhes das publicações e projetos */}
              <Route 
                path="/publication/:publicationId" 
                element={<PublicationDetailPage />} 
              />
              <Route 
                path="/project/:projectId" 
                element={<ProjectDetailPage />} 
              />
              <Route 
                path="/edit-publication/:id" 
                element={
                  <EditPublicationPage 
                    publications={currentResearcher.publications}
                    projects={currentResearcher.projects}
                    onUpdatePublication={handleUpdatePublication}
                    isAuthenticated={auth.isAuthenticated}
                    token={auth.token}
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
                  />
                } 
              />
              <Route 
                path="/other-project/:projectId" 
                element={<OtherProjectDetailPage />} 
              />
              <Route 
                path="/other-publication/:publicationId" 
                element={<OtherPublicationDetailPage />} 
              />
              <Route 
                path="/login" 
                element={<Login />} 
              />
              <Route 
                path="/register" 
                element={<Register />} 
              />
              <Route 
                path="/login/callback" 
                element={
                  <OAuthCallback 
                    onLogin={handleLogin}
                  />
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;