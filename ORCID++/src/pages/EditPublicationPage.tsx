import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { mockResearcherData } from '../data/mockData';
import { Publication } from '../types';
import { toast } from '@/hooks/use-toast';

const EditPublicationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // useEffect para carregar dados da publicação via API do ORCID
  useEffect(() => {
    const fetchPublication = async () => {
      setLoading(true);
      try {
        /* TODO: Substituir por busca real na API do ORCID
         * 1. Fazer fetch para: https://pub.orcid.org/v3.0/{orcid-id}/work/{put-code}
         * 2. Headers: Authorization: Bearer {access-token}, Accept: application/json
         * 3. Mapear dados para interface Publication
         * 
         * Exemplo:
         * const orcidId = getCurrentUserOrcidId();
         * const accessToken = getAccessToken();
         * 
         * const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/work/${id}`, {
         *   headers: {
         *     'Authorization': `Bearer ${accessToken}`,
         *     'Accept': 'application/json'
         *   }
         * });
         * const data = await response.json();
         * setPublication(mapOrcidWorkToPublication(data));
         */
        
        // Simulação com dados mockados
        console.log(`Carregando publicação ${id}...`);
        setTimeout(() => {
          const foundPub = mockResearcherData.publications.find((p, index) => index.toString() === id);
          if (foundPub) {
            setPublication(JSON.parse(JSON.stringify(foundPub)));
          }
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Erro ao carregar publicação:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da publicação.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchPublication();
  }, [id]);

  const handleSave = async () => {
    if (!publication) return;
    setSaving(true);
    
    try {
      /* TODO: Implementar salvamento via API do ORCID
       * 1. Mapear dados da interface Publication para formato ORCID Work
       * 2. Fazer PUT request para: https://api.orcid.org/v3.0/{orcid-id}/work/{put-code}
       * 3. Headers: Authorization: Bearer {access-token}, Content-Type: application/json
       * 
       * Exemplo:
       * const workData = mapPublicationToOrcidWork(publication);
       * 
       * const response = await fetch(`https://api.orcid.org/v3.0/${orcidId}/work/${id}`, {
       *   method: 'PUT',
       *   headers: {
       *     'Authorization': `Bearer ${accessToken}`,
       *     'Content-Type': 'application/json'
       *   },
       *   body: JSON.stringify(workData)
       * });
       * 
       * if (!response.ok) {
       *   throw new Error('Erro ao salvar publicação');
       * }
       */
      
      // Simulação de salvamento
      console.log('Salvando alterações da publicação...', publication);
      setTimeout(() => {
        toast({
          title: "Publicação salva",
          description: "As alterações foram salvas com sucesso.",
        });
        setSaving(false);
        navigate(-1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao salvar publicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPublication(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  const handleAuthorChange = (index: number, field: string, value: string) => {
    setPublication(prev => {
      if (!prev) return prev;
      const newAuthors = [...prev.authors];
      newAuthors[index] = { ...newAuthors[index], [field]: value };
      return { ...prev, authors: newAuthors };
    });
  };

  const addAuthor = () => {
    setPublication(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        authors: [...prev.authors, { name: '', orcidId: '' }]
      };
    });
  };

  const removeAuthor = (index: number) => {
    setPublication(prev => {
      if (!prev) return prev;
      const newAuthors = [...prev.authors];
      newAuthors.splice(index, 1);
      return { ...prev, authors: newAuthors };
    });
  };

  const handleLinkChange = (index: number, field: string, value: string) => {
    setPublication(prev => {
      if (!prev) return prev;
      const newLinks = [...prev.links];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, links: newLinks };
    });
  };

  const addLink = () => {
    setPublication(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        links: [...prev.links, { name: '', url: '' }]
      };
    });
  };

  const removeLink = (index: number) => {
    setPublication(prev => {
      if (!prev) return prev;
      const newLinks = [...prev.links];
      newLinks.splice(index, 1);
      return { ...prev, links: newLinks };
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <p>Carregando dados da publicação...</p>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Publicação não encontrada</h2>
            <Button onClick={() => navigate('/publications')}>Voltar para Publicações</Button>
          </div>
        </Card>
      </div>
    );
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
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title" 
              name="title" 
              value={publication.title} 
              onChange={handleChange} 
              className="mt-1"
            />
          </div>

          <div>
            <Label>Autores</Label>
            <div className="space-y-3 mt-2">
              {publication.authors.map((author, index) => (
                <div key={index} className="flex gap-2">
                  <Input 
                    placeholder="Nome"
                    value={author.name}
                    onChange={(e) => handleAuthorChange(index, 'name', e.target.value)}
                  />
                  <Input 
                    placeholder="ORCID ID"
                    value={author.orcidId}
                    onChange={(e) => handleAuthorChange(index, 'orcidId', e.target.value)}
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
              <Button 
                variant="outline" 
                onClick={addAuthor} 
                className="flex items-center gap-2"
              >
                <Plus size={16} /> Adicionar autor
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Ano</Label>
              <Input 
                id="year" 
                name="year" 
                type="number"
                value={publication.year} 
                onChange={handleChange} 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type" 
                name="type" 
                value={publication.type} 
                onChange={handleChange} 
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="Journal Article">Journal Article</option>
                <option value="Conference Paper">Conference Paper</option>
                <option value="Book Chapter">Book Chapter</option>
                <option value="Book">Book</option>
                <option value="Report">Report</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="source">Fonte</Label>
            <Input 
              id="source" 
              name="source" 
              value={publication.source} 
              onChange={handleChange} 
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="identifier.type">Tipo de Identificador</Label>
              <select
                id="identifier.type" 
                value={publication.identifier.type} 
                onChange={(e) => {
                  setPublication(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, type: e.target.value }
                    };
                  });
                }} 
                className="w-full mt-1 border border-gray-300 rounded-md p-2"
              >
                <option value="DOI">DOI</option>
                <option value="ISBN">ISBN</option>
                <option value="ISSN">ISSN</option>
                <option value="PMID">PMID</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="identifier.value">Valor do Identificador</Label>
              <Input 
                id="identifier.value" 
                value={publication.identifier.value} 
                onChange={(e) => {
                  setPublication(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      identifier: { ...prev.identifier, value: e.target.value }
                    };
                  });
                }} 
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="project">Projeto</Label>
            <select
              id="project" 
              name="project" 
              value={publication.project || ''} 
              onChange={handleChange} 
              className="w-full mt-1 border border-gray-300 rounded-md p-2"
            >
              <option value="">Nenhum projeto</option>
              {mockResearcherData.projects.map(project => (
                <option key={project.id} value={project.name}>{project.name}</option>
              ))}
            </select>
          </div>

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
            <Label>Links</Label>
            <div className="space-y-3 mt-2">
              {publication.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input 
                    placeholder="Nome"
                    value={link.name}
                    onChange={(e) => handleLinkChange(index, 'name', e.target.value)}
                  />
                  <Input 
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                  />
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                onClick={addLink} 
                className="flex items-center gap-2"
              >
                <Plus size={16} /> Adicionar link
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              <Save size={18} /> 
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditPublicationPage;
