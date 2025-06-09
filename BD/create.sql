INSERT INTO public.Usuarios (
    orcid_id, nome, instituicao, departamento, cargo, email,
    biografia, links_externos, pagina_institucional
) VALUES (
    '0000-0002-1825-0097',
    'João da Silva',
    'Universidade XYZ',
    'Departamento de Física',
    'Professor Associado',
    'joao.silva@xyz.edu',
    'Pesquisador em física quântica.',
    ARRAY['http://lattes.cnpq.br/joaosilva', 'https://orcid.org/0000-0002-1825-0097'],
    'http://www.xyz.edu/~joaosilva'
);


INSERT INTO AreasDePesquisa (
	area
) VALUES (
	'Inteligência Artificial'
);

INSERT INTO public.AreasDePesquisaEUsuarios (area_id, usuario_id)
VALUES (1, 2), (2, 2);