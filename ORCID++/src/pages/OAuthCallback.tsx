import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Researcher, Project } from '../types';

interface OAuthCallbackProps {
  onLogin: (researcher: Researcher, token: string) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasRun = useRef(false);

  // API Base URL corrigida para o servidor local
  const API_BASE_URL = 'http://localhost:3000';

  let contador = 0;

  useEffect(() => {
    const handleOAuthCallback = async () => {
        if (hasRun.current) return;
        hasRun.current = true;

      try {
        // Get URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        console.log("State received:", state);

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || `OAuth Error: ${error}`);
          return;
        }

        // Validate state parameter
        const storedState = sessionStorage.getItem('orcid_oauth_state');
        contador = contador + 1;
        console.log(contador);
        console.log("Stored state:", storedState);
        if (!state || state !== storedState) {
          setStatus('error');
          setErrorMessage('Invalid state parameter. Possible CSRF attack.');
          return;
        }

        // Clear stored state
        sessionStorage.removeItem('orcid_oauth_state');

        if (!code) {
          setStatus('error');
          setErrorMessage('No authorization code received.');
          return;
        }

        // Exchange code for access token using our proxy server
        const tokenResponse = await fetch(`${API_BASE_URL}/api/orcid/token`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'APP-7ZEPLIK1RF37GXE9',
            client_secret: '9c9464df-359b-4dfd-991a-6da80a1f4195',
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'https://9d9c-2804-14d-8084-a3a5-3094-d7cd-95f5-1cf5.ngrok-free.app/login/callback',
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(`Failed to exchange code for token: ${errorData.error || 'Unknown error'}`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, orcid } = tokenData;

        if (!access_token || !orcid) {
          throw new Error('No access token or ORCID ID received');
        }

        // Fetch researcher profile using our proxy server
        const profileResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcid}`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(`Failed to fetch ORCID profile: ${errorData.error || 'Unknown error'}`);
        }

        const profileData = await profileResponse.json();

        // Fetch works (publications) using our proxy server
        const worksResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcid}/works`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        let publications = [];
        if (worksResponse.ok) {
          const worksData = await worksResponse.json();
          
          // Fetch detailed information for each work using our proxy server
          const workPromises = worksData.group?.slice(0, 10).map(async (group: any) => {
            const putCode = group['work-summary'][0]['put-code'];
            try {
              const workResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcid}/work/${putCode}`, {
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'Accept': 'application/json',
                },
              });
              
              if (workResponse.ok) {
                return await workResponse.json();
              }
            } catch (error) {
              console.error(`Failed to fetch work ${putCode}:`, error);
            }
            return null;
          }) || [];

          const workDetails = await Promise.all(workPromises);
          
          // Map ORCID works to our Publication interface
          publications = workDetails
            .filter(work => work !== null)
            .map((work: any) => {
              const title = work.title?.title?.value || 'Untitled';
              const year = work['publication-date']?.year?.value || new Date().getFullYear();
              const type = work.type || 'journal-article';
              const journal = work['journal-title']?.value || '';
              
              // Extract authors
              const authors = [];
              if (work.contributors?.contributor) {
                work.contributors.contributor.forEach((contributor: any) => {
                  if (contributor['credit-name']?.value) {
                    authors.push({
                      name: contributor['credit-name'].value,
                      orcidId: contributor['contributor-orcid']?.path || '',
                    });
                  }
                });
              }

              // Extract external identifiers
              let identifier = { type: 'other', value: '' };
              if (work['external-ids']?.['external-id']?.length > 0) {
                const extId = work['external-ids']['external-id'][0];
                identifier = {
                  type: extId['external-id-type'] || 'other',
                  value: extId['external-id-value'] || '',
                };
              }

              return {
                id: work['put-code']?.toString(),
                title,
                authors,
                year,
                type,
                source: journal,
                identifier,
                abstract: work['short-description'] || '',
                links: [],
              };
            });
        }

        // Fetch funding (projects) using our proxy server
        const fundingResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcid}/fundings`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        let projects: Project[] = [];
        if (fundingResponse.ok) {
          const fundingData = await fundingResponse.json();
          
          // Fetch detailed information for each funding using our proxy server
          const fundingPromises = fundingData.group?.slice(0, 20).map(async (group: any) => {
            const putCode = group['funding-summary'][0]['put-code'];
            try {
              const fundingDetailResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcid}/funding/${putCode}`, {
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'Accept': 'application/json',
                },
              });
              
              if (fundingDetailResponse.ok) {
                return await fundingDetailResponse.json();
              }
            } catch (error) {
              console.error(`Failed to fetch funding ${putCode}:`, error);
            }
            return null;
          }) || [];

          const fundingDetails = await Promise.all(fundingPromises);
          
          // Map ORCID funding to our Project interface
          projects = fundingDetails
            .filter(funding => funding !== null)
            .map((funding: any) => {
              const title = funding.title?.title?.value || 'Untitled Project';
              const description = funding['short-description'] || '';
              
              // Extract start and end dates
              const startDate = funding['start-date'];
              const endDate = funding['end-date'];
              const startYear = startDate?.year?.value ? parseInt(startDate.year.value) : new Date().getFullYear();
              const endYear = endDate?.year?.value ? parseInt(endDate.year.value) : 'Ongoing';
              
              // Extract funding organization
              const organization = funding.organization;
              const fundingAgency = organization?.name || '';
              const fundingCity = organization?.address?.city || '';
              const fundingCountry = organization?.address?.country || '';
              
              // Extract funding type and amount
              const fundingType = funding.type || '';
              const amount = funding.amount;
              const fundingAmount = amount ? `${amount.value} ${amount['currency-code']}` : '';
              
              // Extract external identifiers for funding reference
              let fundingId = '';
              if (funding['external-ids']?.['external-id']?.length > 0) {
                const extId = funding['external-ids']['external-id'][0];
                fundingId = extId['external-id-value'] || '';
              }

              return {
                id: funding['put-code']?.toString() || fundingId,
                name: title,
                title: title,
                description: description || `${fundingType} funding from ${fundingAgency}`,
                startYear,
                endYear,
                funding: fundingAmount,
                fundingAgency: `${fundingAgency}${fundingCity ? `, ${fundingCity}` : ''}${fundingCountry ? `, ${fundingCountry}` : ''}`,
                role: 'Researcher', // ORCID doesn't specify role in funding, defaulting to Researcher
                publications: [], // Would need to be linked separately or manually
              };
            });
        }

        // Map ORCID profile to our Researcher interface
        const researcher: Researcher = {
          name: getDisplayName(profileData),
          orcidId: orcid,
          institution: getAffiliation(profileData),
          department: getDepartment(profileData),
          role: getRole(profileData),
          bio: getBio(profileData),
          email: getEmail(profileData),
          researchAreas: getResearchAreas(profileData),
          education: getEducation(profileData),
          awards: getAwards(profileData),
          institutionalPage: '',
          externalLinks: getExternalLinks(profileData),
          publications,
          projects, // Now populated with funding data
        };

        console.log(researcher);

        setStatus('success');
        
        // Call the onLogin callback with researcher data and token
        onLogin(researcher, access_token);
        
        // Redirect to profile page after a brief delay
        setTimeout(() => {
          navigate('/profile');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    };

    handleOAuthCallback();
  }, []);

  // Helper functions to extract data from ORCID profile
  const getDisplayName = (profile: any): string => {
    const person = profile.person;
    if (person?.name) {
      const given = person.name['given-names']?.value || '';
      const family = person.name['family-name']?.value || '';
      return `${given} ${family}`.trim();
    }
    return 'Unknown Researcher';
  };

  const getAffiliation = (profile: any): string => {
    const employments = profile['activities-summary']?.employments?.['affiliation-group'];
    if (employments && employments.length > 0) {
      const employment = employments[0].summaries[0];
      return employment['organization']?.name || '';
    }
    return '';
  };

  const getDepartment = (profile: any): string => {
    const employments = profile['activities-summary']?.employments?.['affiliation-group'];
    if (employments && employments.length > 0) {
      const employment = employments[0].summaries[0];
      return employment['department-name'] || '';
    }
    return '';
  };

  const getRole = (profile: any): string => {
    const employments = profile['activities-summary']?.employments?.['affiliation-group'];
    if (employments && employments.length > 0) {
      const employment = employments[0].summaries[0];
      return employment['role-title'] || '';
    }
    return '';
  };

  const getBio = (profile: any): string => {
    return profile.person?.biography?.content || '';
  };

  const getEmail = (profile: any): string => {
    const emails = profile.person?.emails?.email;
    if (emails && emails.length > 0) {
      return emails[0].email || '';
    }
    return '';
  };

  const getResearchAreas = (profile: any): string[] => {
    const keywords = profile.person?.keywords?.keyword;
    if (keywords) {
      return keywords.map((kw: any) => kw.content).filter(Boolean);
    }
    return [];
  };

  const getEducation = (profile: any): string[] => {
    const educations = profile['activities-summary']?.educations?.['affiliation-group'];
    if (educations) {
      return educations.map((group: any) => {
        const edu = group.summaries[0];
        const org = edu.organization?.name || '';
        const role = edu['role-title'] || '';
        return `${role} - ${org}`.trim();
      }).filter(Boolean);
    }
    return [];
  };

  const getAwards = (profile: any): string[] => {
    // ORCID doesn't have a standard awards section, this could be implemented
    // by parsing distinctions or other relevant sections
    return [];
  };

  const getExternalLinks = (profile: any): Array<{ name: string; url: string }> => {
    const urls = profile.person?.['researcher-urls']?.['researcher-url'];
    if (urls) {
      return urls.map((url: any) => ({
        name: url['url-name'] || 'External Link',
        url: url.url?.value || '',
      })).filter((link: any) => link.url);
    }
    return [];
  };

  const handleRetry = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">
              {status === 'loading' && 'Processando Login...'}
              {status === 'success' && 'Login Realizado com Sucesso!'}
              {status === 'error' && 'Erro no Login'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">
                  Autenticando com ORCID e carregando seus dados...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-gray-600">
                  Seus dados foram carregados com sucesso. Redirecionando para seu perfil...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <h4 className="font-semibold text-red-800 mb-1">Erro de Autenticação</h4>
                      <p className="text-red-700 text-sm">{errorMessage}</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleRetry} className="w-full">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OAuthCallback;
