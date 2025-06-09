SELECT * FROM public.Usuarios; -- Busca todos os usuarios

SELECT * FROM public.AreasDePesquisa; -- Busca todas as areas

SELECT * FROM public.AreasDePesquisa; -- Busca todas as areas

SELECT a.* -- Busca todas as areas de um determinado ORCID ID
	FROM public.AreasDePesquisa a
	JOIN public.AreasDePesquisaEUsuarios au ON a.id = au.area_id
	JOIN public.Usuarios u ON au.usuario_id = u.id
	WHERE u.orcid_id = '0000-0002-1825-0097';

SELECT u.* -- Busca todos os usuarios de uma certa area
	FROM public.Usuarios u
	JOIN public.AreasDePesquisaEUsuarios au ON u.id = au.usuario_id
	JOIN public.AreasDePesquisa a ON au.area_id = a.id
	WHERE a.area = 'PLN';
