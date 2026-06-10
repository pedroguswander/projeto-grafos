import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import GlobeGL from 'react-globe.gl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import logoEtn from './assets/logo-2/logo-branca-isolada2.png'

// ---------------------------------------------------------------------------
// Coordenadas geográficas reais de cada porto (de data/ETN/vertices.csv)
// ---------------------------------------------------------------------------
const PORT_COORDS = {
  ESALG: { lat: 36.125, lon: -5.45 },
  TRAMB: { lat: 40.983, lon: 28.745 },
  BEANR: { lat: 51.216666, lon: 4.416666 },
  NGAPP: { lat: 6.4218, lon: 3.3437 },
  NZAKL: { lat: -36.86667, lon: 174.766667 },
  PABLB: { lat: 8.9375, lon: -79.5625 },
  ESBCN: { lat: 41.38334, lon: 2.18334 },
  DEBRV: { lat: 53.55, lon: 8.58 },
  AUBNE: { lat: -27.5, lon: 153.0156 },
  KRPUS: { lat: 35.1, lon: 129.04 },
  USCHS: { lat: 32.79423, lon: -79.94032 },
  LKCMB: { lat: 6.933334, lon: 79.85 },
  ZADUR: { lat: -29.8437, lon: 31.0156 },
  GBFXT: { lat: 51.9531, lon: 1.35 },
  ITGIT: { lat: 38.416666, lon: 15.9 },
  ECGYE: { lat: -2.169538, lon: -79.902519 },
  DEHAM: { lat: 53.55, lon: 10 },
  HKHKG: { lat: 22.320135, lon: 114.200376 },
  INNSA: { lat: 18.56, lon: 73.02 },
  AEJEA: { lat: 25.14, lon: 55.19 },
  SAJED: { lat: 21.48334, lon: 39.2 },
  TWKHH: { lat: 22.633334, lon: 120.28333 },
  USLAX: { lat: 34.0522, lon: -118.2428 },
  AOLAD: { lat: -9.11, lon: 13.242 },
  PAMIT: { lat: 9.35, lon: -79.9 },
  USMIA: { lat: 25.79371, lon: -80.20735 },
  KEMBA: { lat: -4.0468, lon: 39.6562 },
  UYMVD: { lat: -34.883333, lon: -56.183333 },
  CAMTR: { lat: 45.5, lon: -73.5781 },
  USEWR: { lat: 40.73812, lon: -74.18329 },
  MYPKG: { lat: 3.042, lon: 101.446 },
  PKBQM: { lat: 24.767667, lon: 67.33334 },
  EGPSD: { lat: 31.21583, lon: 32.35722 },
  MAPTM: { lat: 35.885, lon: -5.4847 },
  CNTAO: { lat: 36.08333, lon: 120.35 },
  NLRTM: { lat: 51.91667, lon: 4.5 },
  OMSLL: { lat: 17.014, lon: 54.091 },
  CLSAI: { lat: -33.58, lon: -71.63 },
  BRSSZ: { lat: -23.95, lon: -46.33 },
  CNSHA: { lat: 31.2187, lon: 121.4531 },
  SGSIN: { lat: 1.2812, lon: 103.8437 },
  GHTKD: { lat: 4.88333, lon: -1.75 },
  MYTPP: { lat: 1.405, lon: 103.593 },
  CAVAN: { lat: 49.25, lon: -123.125 },
  CNYTN: { lat: 22.58333, lon: 114.26667 },
  JPYOK: { lat: 35.45, lon: 139.55 },
  BEZEE: { lat: 51.3281, lon: 3.1875 },
}

// ---------------------------------------------------------------------------
// Curiosidades e dados dos portos
// ---------------------------------------------------------------------------
const PORT_CURIOSITIES = {
  ESALG: { name: 'Porto de Algeciras', country: 'Espanha', capacity: '5,5 M TEUs/ano', wikiPort: 'Port_of_Algeciras', wikiCity: 'Algeciras', curiosities: ['Porto mais movimentado da Espanha e top-10 europeu em volume de contêineres.', 'Fica no Estreito de Gibraltar — cruzamento entre o Atlântico e o Mediterrâneo.', 'Está a apenas 14 km de Marrocos: a menor distância entre Europa e África.', 'Funciona como hub de transbordo conectando Europa, Américas, Ásia e África.', 'Gibraltar, o rochedo britânico, é visível a 7 km do porto.'] },
  TRAMB: { name: 'Terminal de Ambarli (Istambul)', country: 'Turquia', capacity: '2,5 M TEUs/ano', wikiPort: 'Ambarlı', wikiCity: 'Istanbul', curiosities: ['Principal terminal de contêineres de Istambul e maior porto da Turquia.', 'Localizado no Mar de Mármara — ponte estratégica entre Europa e Ásia.', 'Istambul é a única cidade do mundo que fica em dois continentes.', 'O Estreito do Bósforo, próximo ao terminal, é um dos mais movimentados do planeta.', 'A Turquia é top-10 mundial em exportação de produtos manufaturados.'] },
  BEANR: { name: 'Porto de Antuérpia', country: 'Bélgica', capacity: '12,1 M TEUs/ano', wikiPort: 'Port_of_Antwerp', wikiCity: 'Antwerp', curiosities: ['2º maior porto da Europa, processando mais de 12 M TEUs por ano.', 'Fundado no século XV, é a "joia de Flandres" desde a era das Grandes Navegações.', 'Gateway para três das maiores economias europeias: Alemanha, França e Holanda.', '130 km de cais e 1.500 empresas no complexo portuário — 145 mil empregos diretos.', 'Antuérpia é a capital mundial do comércio de diamantes: 80% do suprimento global passa pela cidade.'] },
  NGAPP: { name: 'Porto de Apapa (Lagos)', country: 'Nigéria', capacity: '1,3 M TEUs/ano', wikiPort: 'Apapa', wikiCity: 'Lagos', curiosities: ['Principal porto da Nigéria e um dos mais movimentados da África Ocidental.', 'Lagos é a maior cidade da África — mais de 15 milhões de habitantes na área metropolitana.', 'A Nigéria é a maior economia da África e o maior produtor de petróleo do continente.', 'O porto enfrenta congestionamento histórico — caminhões esperam dias para entrar.', 'Lagos é berço do Afrobeat de Fela Kuti, o ritmo que conquistou o mundo.'] },
  NZAKL: { name: 'Portos de Auckland', country: 'Nova Zelândia', capacity: '1,0 M TEUs/ano', wikiPort: 'Ports_of_Auckland', wikiCity: 'Auckland', curiosities: ['Principal porto da Nova Zelândia, processando ~55% das importações do país.', 'Auckland fica no Istmo entre o Oceano Pacífico e o Mar de Tasman.', 'A Nova Zelândia ficou mundialmente famosa pelos cenários do Senhor dos Anéis.', 'O país é líder mundial na exportação de kiwi, manteiga e leite em pó.', 'Auckland tem mais barcos per capita do que qualquer outra cidade do mundo.'] },
  PABLB: { name: 'Porto de Balboa (Pacífico)', country: 'Panamá', capacity: '3,7 M TEUs/ano', wikiPort: 'Port_of_Balboa', wikiCity: 'Panama_City', curiosities: ['Localizado na entrada do Pacífico do Canal do Panamá — um dos pontos mais estratégicos do comércio global.', 'O Canal corta 12.800 km da rota entre Atlântico e Pacífico, vital para o comércio.', 'A expansão de 2016 permitiu navios Neopanamax com até 14.000 TEUs.', 'O Panamá arrecada mais de 3 bilhões de dólares em pedágios anuais do canal.', 'Balboa foi fundada pelos espanhóis em 1519 — a primeira cidade europeia no Pacífico.'] },
  ESBCN: { name: 'Porto de Barcelona', country: 'Espanha', capacity: '4,0 M TEUs/ano', wikiPort: 'Port_of_Barcelona', wikiCity: 'Barcelona', curiosities: ['Maior porto de cruzeiros da Europa — mais de 9 milhões de passageiros/ano.', 'Principal gateway marítimo da Espanha para a Europa e o Mediterrâneo.', 'A Sagrada Família, símbolo de Barcelona, está em construção desde 1882.', 'Fica a 2 km da Rambla, a avenida mais famosa da Europa.', 'Espanha é o maior produtor de azeite do mundo — muito exportado por Barcelona.'] },
  DEBRV: { name: 'Porto de Bremerhaven', country: 'Alemanha', capacity: '5,5 M TEUs/ano', wikiPort: 'Port_of_Bremerhaven', wikiCity: 'Bremerhaven', curiosities: ['Maior porto de exportação de automóveis do mundo — milhões de carros alemães partem daqui.', 'Principal terminal de contêineres do norte da Alemanha.', 'Processa cerca de 30% de todos os contêineres da Alemanha.', 'A Alemanha é o 3º maior exportador do mundo — muito passa por Bremerhaven.', 'Bremen, a 65 km, foi um dos pilares da Hansa Merchant League medieval.'] },
  AUBNE: { name: 'Porto de Brisbane', country: 'Austrália', capacity: '1,3 M TEUs/ano', wikiPort: 'Port_of_Brisbane', wikiCity: 'Brisbane', curiosities: ['Principal porto de Queensland e gateway do nordeste australiano.', 'Brisbane sediará os Jogos Olímpicos de 2032.', 'A Austrália é o maior exportador mundial de carvão coqueificável e minério de ferro.', 'O porto fica às margens do rio Brisbane, a 23 km do Oceano Pacífico.', 'Queensland produz 95% de todo o açúcar exportado pela Austrália.'] },
  KRPUS: { name: 'Porto de Busan', country: 'Coreia do Sul', capacity: '23 M TEUs/ano', wikiPort: 'Port_of_Busan', wikiCity: 'Busan', curiosities: ['6º maior porto de contêineres do mundo e o maior da Coreia do Sul.', 'Hub crucial do Nordeste Asiático, conectando Japão, China e o mundo.', 'A Coreia do Sul é o 5º maior exportador de navios — muitos construídos em Busan.', '8 terminais especializados em área de 13,6 km².', 'O Festival de Cinema de Busan (BIFF) é um dos maiores da Ásia.'] },
  USCHS: { name: 'Porto de Charleston', country: 'EUA', capacity: '2,9 M TEUs/ano', wikiPort: 'Port_of_Charleston', wikiCity: 'Charleston,_South_Carolina', curiosities: ['Principal porto do sudeste dos EUA, especializado em veículos e têxteis.', 'Porto mais profundo da Costa Leste dos EUA, recebendo os maiores navios do mundo.', 'Charleston é uma das cidades mais antigas dos EUA — fundada em 1670.', 'Palco de um dos primeiros engajamentos navais da Guerra Civil americana.', 'Carolina do Sul é o maior produtor de pneus dos EUA — Michelin e BMW têm fábricas aqui.'] },
  LKCMB: { name: 'Porto de Colombo', country: 'Sri Lanka', capacity: '7,2 M TEUs/ano', wikiPort: 'Port_of_Colombo', wikiCity: 'Colombo', curiosities: ['Um dos maiores hubs de transbordo da Ásia, no coração do Oceano Índico.', 'A 80 milhas náuticas da principal rota Europa-Ásia — 70% do tráfego mundial passa perto.', 'Crescimento de 400% em volume em 20 anos, de 1,8 para 7,2 M TEUs.', 'O Sri Lanka é o maior exportador de chá per capita do mundo — o famoso "Ceilão".', 'Colombo foi grande entreposto da Rota da Seda Marítima há mais de 2.000 anos.'] },
  ZADUR: { name: 'Porto de Durban', country: 'África do Sul', capacity: '2,9 M TEUs/ano', wikiPort: 'Port_of_Durban', wikiCity: 'Durban', curiosities: ['Maior porto da África e da África do Sul — movimenta mais de 60% das exportações do país.', 'Tem o maior terminal de contêineres do continente africano.', 'A África do Sul é o maior exportador mundial de cromo, manganês e platina.', 'Durban foi o primeiro local de chegada do jovem Mahatma Gandhi, em 1893.', 'A cidade tem praias douradas no Oceano Índico e é destino de safari mundial.'] },
  GBFXT: { name: 'Porto de Felixstowe', country: 'Reino Unido', capacity: '4,0 M TEUs/ano', wikiPort: 'Port_of_Felixstowe', wikiCity: 'Felixstowe', curiosities: ['Maior porto de contêineres do Reino Unido — quase 40% do volume nacional.', 'Privatizado em 1991, hoje operado pela Hutchison Ports (Hong Kong).', 'Porto europeu mais próximo dos mercados asiáticos via Canal de Suez.', 'O Reino Unido é o 5º maior exportador de serviços financeiros do mundo.', 'Suffolk, onde fica o porto, é famoso pelas casas de enxaimel medievais e pelo mar do Norte.'] },
  ITGIT: { name: 'Porto de Gioia Tauro', country: 'Itália', capacity: '3,1 M TEUs/ano', wikiPort: 'Port_of_Gioia_Tauro', wikiCity: 'Gioia_Tauro', curiosities: ['Principal hub de transbordo do Mediterrâneo Central.', 'Localizado na Calábria, na ponta sul da bota italiana — posição ideal para rotas globais.', 'Cerca de 90% dos contêineres são de transbordo — o porto é puro hub logístico.', 'A Calábria produz a bergamota usada no perfume Chanel Nº 5.', 'O porto foi construído em 1995 onde era prevista uma siderúrgica que nunca foi concluída.'] },
  ECGYE: { name: 'Porto de Guayaquil', country: 'Equador', capacity: '1,9 M TEUs/ano', wikiPort: 'Port_of_Guayaquil', wikiCity: 'Guayaquil', curiosities: ['Maior porto do Equador e principal saída das exportações do país.', 'O Equador é o maior exportador mundial de bananas — exportadas por Guayaquil.', 'Localizado no Rio Guayas, a 60 km do Oceano Pacífico.', 'As Ilhas Galápagos, patrimônio UNESCO, pertencem ao Equador a 972 km do porto.', 'O Equador é um dos maiores produtores de cacau fino do mundo.'] },
  DEHAM: { name: 'Porto de Hamburgo', country: 'Alemanha', capacity: '8,3 M TEUs/ano', wikiPort: 'Port_of_Hamburg', wikiCity: 'Hamburg', curiosities: ['2º maior porto da Europa e o maior da Alemanha — "Gateway to the World".', 'Fundado em 1188 por Frederico Barbarossa, com mais de 800 anos de história.', 'Emprega diretamente mais de 150.000 pessoas na região metropolitana.', 'O Rio Elba, onde fica o porto, passou de um dos mais poluídos a um modelo de recuperação ambiental.', 'Hamburgo tem mais de 2.500 pontes — mais do que Amsterdam, Veneza e Londres juntas.'] },
  HKHKG: { name: 'Porto de Hong Kong', country: 'China (RAEHK)', capacity: '17 M TEUs/ano', wikiPort: 'Port_of_Hong_Kong', wikiCity: 'Hong_Kong', curiosities: ['Um dos maiores portos do mundo — foi o mais movimentado por décadas antes de ser superado por Xangai.', 'Operou como porto livre desde 1841, com zero tarifas alfandegárias por 180 anos.', 'O Victoria Harbour, onde ficam os terminais, é um dos panoramas mais fotografados do mundo.', 'Devolvido à China em 1997, mantém sistema jurídico e financeiro próprio até 2047.', 'Hong Kong tem a maior densidade de arranha-céus por km² de qualquer cidade do planeta.'] },
  INNSA: { name: 'Porto de Nhava Sheva (JNPT)', country: 'Índia', capacity: '6,0 M TEUs/ano', wikiPort: 'Jawaharlal_Nehru_Port', wikiCity: 'Mumbai', curiosities: ['Maior porto de contêineres da Índia — responsável por mais de 55% do tráfego nacional.', 'Localizado em Mumbai, a maior cidade da Índia com mais de 20 milhões de habitantes.', 'O JNPT foi inaugurado em 1989 e transformou o comércio exterior indiano.', 'Mumbai é o maior centro financeiro da Ásia do Sul — produz mais de 6% do PIB da Índia.', 'A Índia é o maior exportador de têxteis, medicamentos genéricos e software do mundo.'] },
  AEJEA: { name: 'Porto de Jebel Ali', country: 'Emirados Árabes Unidos', capacity: '14,5 M TEUs/ano', wikiPort: 'Jebel_Ali_Port', wikiCity: 'Dubai', curiosities: ['Maior porto da Região do Golfo e o maior porto artificial do mundo — construído no deserto em 1979.', 'Hub logístico entre Europa, Ásia, África e Américas: 90 linhas de navegação de 150 países.', 'Operado pela DP World, que gerencia 83 terminais em 60 países ao redor do globo.', 'A Zona Franca de Jebel Ali (JAFZA) tem mais de 9.000 empresas de 100 países.', 'Dubai fica a 35 km — o hub aéreo mais conectado do mundo, a 8h de 90% da população mundial.'] },
  SAJED: { name: 'Porto Islâmico de Jeddah', country: 'Arábia Saudita', capacity: '4,2 M TEUs/ano', wikiPort: 'Jeddah_Islamic_Port', wikiCity: 'Jeddah', curiosities: ['Maior porto da Arábia Saudita e principal gateway do Mar Vermelho.', 'Porto de embarque de milhões de peregrinos rumo a Meca, a 80 km.', 'Jeddah é conhecida como "A Noiva do Mar Vermelho" e tem a 3ª maior fonte do mundo.', 'A Arábia Saudita tem 17% das reservas globais de petróleo — as maiores do mundo.', 'A Visão 2030 saudita planeja transformar Jeddah em um dos maiores hubs de cruzeiros do mundo.'] },
  TWKHH: { name: 'Porto de Kaohsiung', country: 'Taiwan', capacity: '10,4 M TEUs/ano', wikiPort: 'Port_of_Kaohsiung', wikiCity: 'Kaohsiung', curiosities: ['Um dos maiores portos do mundo e o principal hub marítimo de Taiwan.', 'Taiwan é responsável por mais de 90% da fabricação global de chips avançados (TSMC).', 'Kaohsiung é o maior centro de reciclagem de navios da Ásia Oriental.', 'O porto opera 24h/365, com crescente automação nos terminais.', 'Fica a 350 km de Shanghai — posição central para a cadeia de suprimentos asiática.'] },
  USLAX: { name: 'Porto de Los Angeles', country: 'EUA', capacity: '10,7 M TEUs/ano', wikiPort: 'Port_of_Los_Angeles', wikiCity: 'Los_Angeles', curiosities: ['Maior complexo portuário dos EUA (com Long Beach) — 40% das importações americanas passam aqui.', 'A Califórnia seria a 5ª maior economia do mundo se fosse um país independente.', 'Recebe a maioria dos produtos fabricados na China vendidos nos supermercados americanos.', 'O congestionamento de 2021 deixou mais de 100 navios esperando — visível do espaço.', 'LA tem o tráfego rodoviário mais congestionado dos EUA, reflexo direto do fluxo portuário.'] },
  AOLAD: { name: 'Porto de Luanda', country: 'Angola', capacity: '0,7 M TEUs/ano', wikiPort: 'Port_of_Luanda', wikiCity: 'Luanda', curiosities: ['Principal porto de Angola e o maior da África Central.', 'Angola é o 2º maior produtor de petróleo da África subsaariana, atrás da Nigéria.', 'O porto está sendo expandido com investimento de mais de 2 bilhões de dólares.', 'Luanda foi fundada pelos portugueses em 1575 e foi capital colonial por séculos.', 'Angola tem das maiores reservas de diamantes do mundo — pedras brutas de alta qualidade.'] },
  PAMIT: { name: 'Porto de Manzanillo (Colón)', country: 'Panamá', capacity: '3,2 M TEUs/ano', wikiPort: 'Manzanillo_International_Terminal', wikiCity: 'Colón,_Panama', curiosities: ['Maior porto de transbordo da América Latina e um dos mais movimentados do Caribe.', 'Localizado na entrada atlântica do Canal do Panamá, em Colón.', 'Colón abriga a 2ª maior zona franca do mundo — mais de 20 bilhões de dólares/ano.', 'Estratégico para a logística entre América do Norte, Europa e América do Sul.', 'Operado pela Evergreen Marine e depois pela empresa MIT (Manzanillo International Terminal).'] },
  USMIA: { name: 'PortMiami', country: 'EUA', capacity: '1,2 M TEUs/ano', wikiPort: 'PortMiami', wikiCity: 'Miami', curiosities: ['Capital mundial dos cruzeiros — mais de 6 milhões de passageiros/ano.', 'Único porto de cruzeiros localizado dentro de uma área urbana nos EUA.', 'Tem o canal de acesso mais fundo da Costa Leste dos EUA (15,5 metros).', 'Miami é a porta de entrada para o comércio entre os EUA e a América Latina e o Caribe.', 'Miami é a única grande metrópole americana fundada por uma mulher — Julia Tuttle, em 1896.'] },
  KEMBA: { name: 'Porto de Mombasa', country: 'Quênia', capacity: '1,6 M TEUs/ano', wikiPort: 'Port_of_Mombasa', wikiCity: 'Mombasa', curiosities: ['Principal porto da África Oriental, servindo Quênia, Uganda, Ruanda e outros países sem litoral.', 'Localizado na ilha de Mombasa, fundado pelos árabes há mais de 1.000 anos.', 'Gateway marítimo para toda a região dos Grandes Lagos africanos.', 'O Quênia é famoso pelo Masai Mara e pelos corredores olímpicos mais rápidos do mundo.', 'A Standard Gauge Railway conecta Mombasa a Nairóbi em apenas 4 horas.'] },
  UYMVD: { name: 'Porto de Montevidéu', country: 'Uruguai', capacity: '1,0 M TEUs/ano', wikiPort: 'Port_of_Montevideo', wikiCity: 'Montevideo', curiosities: ['Principal porto do Uruguai e hub regional para Argentina, Paraguai e Brasil.', 'O Uruguai é o país mais desenvolvido e democrático da América Latina.', 'O porto movimenta grandes exportações de soja, carne e celulose do Cone Sul.', 'Montevidéu fica às margens do Rio da Prata — o estuário mais largo do mundo (220 km).', 'Tem a maior zona portuária franca da América Latina em termos de diversidade de produtos.'] },
  CAMTR: { name: 'Porto de Montreal', country: 'Canadá', capacity: '1,6 M TEUs/ano', wikiPort: 'Port_of_Montreal', wikiCity: 'Montreal', curiosities: ['Principal porto do leste do Canadá e gateway para a bacia do Rio São Lourenço.', 'Montreal é a segunda maior cidade francófona do mundo, depois de Paris.', 'Fica 1.600 km do oceano, acessado por eclusas do sistema de São Lourenço.', 'O Canadá é o 2º maior país do mundo e tem 25% de toda a água doce do planeta.', 'Montreal é um dos maiores centros de inteligência artificial do mundo.'] },
  USEWR: { name: 'Porto Newark/Nova York', country: 'EUA', capacity: '9,0 M TEUs/ano', wikiPort: 'Port_Newark–Elizabeth_Marine_Terminal', wikiCity: 'New_York_City', curiosities: ['Maior complexo portuário da Costa Leste dos EUA, servindo a maior metrópole americana.', 'Foi o nascedouro da conteinerização moderna em 1956 — quando o conceito mudou o mundo.', 'A Estátua da Liberdade fica na Ilha Liberty, bem à vista de quem chega pelo porto.', 'Nova York é o maior centro financeiro do mundo, com mais de 1 trilhão de dólares em ativos.', 'Importa eletrônicos, vestuário e produtos farmacêuticos de todo o mundo.'] },
  MYPKG: { name: 'Porto de Port Klang', country: 'Malásia', capacity: '14,0 M TEUs/ano', wikiPort: 'Port_Klang', wikiCity: 'Port_Klang', curiosities: ['Maior porto da Malásia e um dos 15 maiores do mundo em volume de contêineres.', 'Localizado a 38 km de Kuala Lumpur — as Torres Petronas são visíveis no horizonte.', 'A Malásia é o 2º maior produtor de óleo de palma e grande exportador de equipamentos.', 'Dois terminais principais — Westport e North Port — entre os mais eficientes da Ásia.', 'Port Klang lidera a transformação digital da logística do Sudeste Asiático.'] },
  PKBQM: { name: 'Porto de Karachi (PICT)', country: 'Paquistão', capacity: '2,2 M TEUs/ano', wikiPort: 'Karachi_Port', wikiCity: 'Karachi', curiosities: ['Maior porto do Paquistão e o principal gateway do país para o comércio internacional.', 'Karachi é a maior cidade do Paquistão e 7ª maior do mundo — 20 milhões de habitantes.', 'Processa mais de 95% das exportações e importações do Paquistão.', 'O Paquistão é o maior exportador mundial de têxteis de algodão após China e Índia.', 'O Corredor Econômico China-Paquistão (CPEC) investe bilhões no desenvolvimento portuário.'] },
  EGPSD: { name: 'Porto de Port Said', country: 'Egito', capacity: '4,5 M TEUs/ano', wikiPort: 'Port_Said', wikiCity: 'Port_Said', curiosities: ['Localizado na entrada norte do Canal de Suez — um dos pontos mais estratégicos do comércio global.', 'O Canal de Suez conecta Mediterrâneo ao Mar Vermelho, cortando 7.000 km da rota Europa-Ásia.', 'Em 2021, o Ever Given ficou encalhado por 6 dias bloqueando o canal e afetando 12% do comércio mundial.', 'Port Said foi fundada em 1859 durante a construção do Canal do Suez.', 'O Egito é o maior produtor de algodão extra-longo de fibra do mundo.'] },
  MAPTM: { name: 'Porto Tanger Med', country: 'Marrocos', capacity: '9,0 M TEUs/ano', wikiPort: 'Tanger_Med', wikiCity: 'Tangier', curiosities: ['Maior porto da África e do Mediterrâneo — inaugurado em 2007 e em expansão contínua.', 'Localizado no Estreito de Gibraltar, a 14 km das costas europeias.', 'Transformou o Marrocos em hub logístico entre Europa, África e Américas.', 'A zona industrial do porto tem 1.000+ empresas e 100.000 empregos na região.', 'O Marrocos tem 75% das reservas mundiais de fosfatos — o maior exportador do mundo.'] },
  CNTAO: { name: 'Porto de Qingdao', country: 'China', capacity: '25 M TEUs/ano', wikiPort: 'Port_of_Qingdao', wikiCity: 'Qingdao', curiosities: ['5º maior porto do mundo e um dos mais importantes do norte da China.', 'Qingdao foi colônia alemã de 1898 a 1914 — legado na arquitetura e na cervejaria Tsingtao.', 'A cerveja Tsingtao, fundada pelos alemães em 1903, é a mais exportada da China.', 'Sede das maiores marcas chinesas de eletrônicos: Hisense e Haier.', 'Tem os terminais mais automatizados do mundo — guindastes e caminhões totalmente autônomos.'] },
  NLRTM: { name: 'Porto de Rotterdam', country: 'Holanda', capacity: '15,3 M TEUs/ano', wikiPort: 'Port_of_Rotterdam', wikiCity: 'Rotterdam', curiosities: ['Maior porto da Europa — processa 14% de todas as mercadorias da União Europeia.', 'Foi o maior porto do mundo por 42 anos consecutivos (1962–2004).', 'A área do porto é maior que a cidade de Paris — 12.000 hectares ao longo do Rio Mosa.', 'Meta de zero emissões de CO₂ até 2050, sendo modelo global de porto sustentável.', 'Mais de 500 empresas petroquímicas e 4 refinarias de petróleo ficam nas suas margens.'] },
  OMSLL: { name: 'Porto de Salalah', country: 'Omã', capacity: '4,6 M TEUs/ano', wikiPort: 'Port_of_Salalah', wikiCity: 'Salalah', curiosities: ['Principal hub de transbordo do Oceano Índico — posição privilegiada entre Golfo e Ásia.', 'Desenvolvido em parceria com a Maersk e transformou a logística do Oceano Índico.', 'Salalah fica na região de Dhofar — única parte da Península Arábica com clima de monção.', 'O Omã é um dos países mais estáveis do Golfo, com tradição de neutralidade diplomática.', 'Os mercados de Salalah vendem incenso e mirra — especiarias valiosíssimas na Antiguidade.'] },
  CLSAI: { name: 'Porto de San Antonio', country: 'Chile', capacity: '1,4 M TEUs/ano', wikiPort: 'Puerto_San_Antonio', wikiCity: 'San_Antonio,_Chile', curiosities: ['Maior porto do Chile e principal gateway das exportações chilenas: cobre, frutas e vinho.', 'O Chile é o maior produtor mundial de cobre — 28% da oferta global.', 'Fica a 100 km de Santiago, a maior cidade da América do Sul de clima mediterrâneo.', 'O Chile exporta mais de 800 tipos de frutas, incluindo 40% das uvas de mesa mundiais.', 'Está em expansão para receber mega navios de até 400 metros de comprimento.'] },
  BRSSZ: { name: 'Porto de Santos', country: 'Brasil', capacity: '5,0 M TEUs/ano', wikiPort: 'Port_of_Santos', wikiCity: 'Santos,_São_Paulo', curiosities: ['Maior porto da América Latina e principal gateway do agronegócio brasileiro.', 'O Brasil é o maior exportador mundial de soja, açúcar, café e carne — muito sai por Santos.', 'Movimenta mais de 160 milhões de toneladas de carga por ano.', 'Fica a 72 km de São Paulo, a maior metrópole do Hemisfério Sul (22 milhões de habitantes).', 'Santos foi o porto de entrada de milhões de imigrantes europeus e asiáticos no século XX.'] },
  CNSHA: { name: 'Porto de Xangai', country: 'China', capacity: '47 M TEUs/ano', wikiPort: 'Port_of_Shanghai', wikiCity: 'Shanghai', curiosities: ['Maior porto do mundo pelo 14º ano consecutivo — processa quase 3× o volume do 2º colocado.', 'O Terminal de Yangshan (ilha artificial) é o maior terminal de contêineres automático do mundo.', 'Xangai é o maior centro financeiro da Ásia — sua Bolsa de Valores é a 3ª do mundo.', '125 km de cais e 1.000+ atracadouros, funcionando 24 horas sem interrupção.', 'A China concentra mais de 30% de todo o comércio marítimo global de contêineres.'] },
  SGSIN: { name: 'Porto de Singapura', country: 'Singapura', capacity: '37 M TEUs/ano', wikiPort: 'Port_of_Singapore', wikiCity: 'Singapore', curiosities: ['2º maior porto do mundo e o maior hub de transbordo: 200 linhas para 600 portos.', 'Singapura não tem recursos naturais — sua riqueza é 100% baseada no comércio e logística.', '1ª posição global em eficiência logística e facilidade de fazer negócios (ONU).', 'O novo Tuas Mega Port vai concentrar toda a operação: 65 M TEUs em um único terminal.', 'Fica no Estreito de Malaca — canal mais movimentado do mundo com 100.000 navios/ano.'] },
  GHTKD: { name: 'Porto de Takoradi', country: 'Gana', capacity: '0,6 M TEUs/ano', wikiPort: 'Port_of_Takoradi', wikiCity: 'Sekondi-Takoradi', curiosities: ['Principal porto de exportação de commodities de Gana: cacau, ouro, manganês e petróleo.', 'Gana é o 2º maior produtor mundial de cacau e o maior do continente africano.', 'Construído pelos britânicos em 1928, foi o primeiro porto de águas profundas da África Ocidental.', 'A descoberta de petróleo offshore em 2007 transformou a economia ganesa e o fluxo pelo porto.', 'Gana é um dos países mais estáveis da África — 8 eleições democráticas consecutivas.'] },
  MYTPP: { name: 'Porto de Tanjung Pelepas', country: 'Malásia', capacity: '11,5 M TEUs/ano', wikiPort: 'Port_of_Tanjung_Pelepas', wikiCity: 'Johor_Bahru', curiosities: ['Porto de águas profundas no extremo sul da Malásia — um dos hubs mais modernos do Sudeste Asiático.', 'Inaugurado em 1999, rapidamente ganhou clientes da Maersk e Evergreen de Singapura.', 'Localizado a apenas 20 km de Singapura — concorrência direta com o hub vizinho.', 'Fica na entrada do Estreito de Johor, com acesso ao Estreito de Malaca.', 'Planejado do zero com equipamentos de última geração e alta automação.'] },
  CAVAN: { name: 'Porto de Vancouver', country: 'Canadá', capacity: '3,8 M TEUs/ano', wikiPort: 'Port_of_Vancouver', wikiCity: 'Vancouver', curiosities: ['Maior porto do Canadá em volume total e gateway para o comércio com a Ásia.', '70% do comércio do Canadá com a Ásia passa por Vancouver.', 'Rodeado por montanhas nevadas — um dos panoramas mais bonitos da América do Norte.', 'A costa de British Columbia tem os maiores estoques de salmão do Pacífico Norte.', 'Vancouver foi eleita por anos consecutivos a cidade mais habitável do mundo.'] },
  CNYTN: { name: 'Porto de Yantian (Shenzhen)', country: 'China', capacity: '16,7 M TEUs/ano', wikiPort: 'Yantian_International_Container_Terminals', wikiCity: 'Shenzhen', curiosities: ['Principal porto de Shenzhen e um dos maiores do mundo, no Delta do Rio das Pérolas.', 'Shenzhen era uma vila de pesca em 1980 — hoje tem 17 milhões de habitantes e é o Silicon Valley chinês.', 'O porto é o mais próximo das fábricas de eletrônicos de Dongguan e Guangzhou.', 'A maioria dos gadgets e produtos eletrônicos do mundo passa por Yantian antes do consumidor.', 'O Delta do Rio das Pérolas produz mais de 25% do PIB da China.'] },
  JPYOK: { name: 'Porto de Yokohama', country: 'Japão', capacity: '3,1 M TEUs/ano', wikiPort: 'Port_of_Yokohama', wikiCity: 'Yokohama', curiosities: ['Maior porto do Japão por volume de contêineres e portal histórico do país para o mundo.', 'Yokohama foi aberta ao comércio exterior em 1859, encerrando séculos de isolamento japonês.', 'A cidade tem a maior Chinatown do Japão e uma das maiores da Ásia.', 'O Japão é o 3º maior exportador de carros e semicondutores do mundo — muito passa por aqui.', 'Fica a 30 km de Tóquio — a maior aglomeração urbana do mundo com 38 milhões de pessoas.'] },
  BEZEE: { name: 'Porto de Zeebrugge', country: 'Bélgica', capacity: '2,5 M TEUs/ano', wikiPort: 'Port_of_Zeebrugge', wikiCity: 'Bruges', curiosities: ['Principal porto europeu de exportação de veículos — milhares de carros distribuídos pela Europa.', 'Importante terminal de GNL (gás natural liquefeito) para a Europa após a crise energética de 2022.', 'Localizado no Mar do Norte — saída natural para o corredor ferroviário para o centro europeu.', 'A Bélgica tem o maior número de monumentos históricos por km² da Europa.', 'Bruges, a 15 km, é uma das cidades medievais mais preservadas da Europa — Patrimônio UNESCO.'] },
}

// Bearing entre dois pontos geográficos (graus, 0=Norte, 90=Leste)
function computeBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// ---------------------------------------------------------------------------
// 23 regiões (D_Region) → 23 cores distintas geradas por HSL espaçado
// ---------------------------------------------------------------------------
const REGION_LIST = [
  'Australia', 'Brazil', 'Canada East Coast', 'Canada West', 'Central China',
  'Dubai', 'Hong Kong', 'Japan', 'Korea', 'Mumbai', 'North China',
  'North Continent Europe', 'Saudi Arabia', 'Singapore', 'South Africa',
  'South America West Coast', 'South China', 'UK', 'US East Coast',
  'US Gulf Coast', 'US West Coast', 'West Africa', 'West Med',
]

const REGION_COLOR = {}
REGION_LIST.forEach((region, i) => {
  const hue = Math.round((i * 360) / REGION_LIST.length)
  const light = i % 2 === 0 ? 58 : 46
  REGION_COLOR[region] = `hsl(${hue}, 70%, ${light}%)`
})

const getRegionColor = (region) => REGION_COLOR[region] || '#7f93a8'

// Formata o peso preservando o valor float (sem arredondar para inteiro)
const formatWeight = (w) => {
  const n = Number(w)
  if (Number.isNaN(n)) return '-'
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)))
}

// ===========================================================================
// Mapa-múndi (Plotly scattergeo) — portos e rotas marítimas
// ===========================================================================
function WorldMap({ graphData, pathResult, startPort, endPort, portMeta, onNodeClick }) {
  const plotRef = useRef(null)
  const wrapRef = useRef(null)
  const [plotlyLoaded, setPlotlyLoaded] = useState(!!window.Plotly)
  const [edgeTooltip, setEdgeTooltip] = useState(null)

  useEffect(() => {
    if (window.Plotly) { setPlotlyLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.27.1/plotly.min.js'
    script.onload = () => setPlotlyLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current) return
    renderMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotlyLoaded, graphData, pathResult, startPort, endPort])

  // Usa o path sempre que disponível (inclui fallback DFS do ciclo negativo do BF)
  const activePath = pathResult?.path?.length > 1 ? pathResult.path : []

  const isPathEdge = (from, to) =>
    activePath.length > 1 && activePath.some((n, i) =>
      i < activePath.length - 1 && activePath[i] === from && activePath[i + 1] === to
    )

  function renderMap() {
    const Plotly = window.Plotly

    // Arestas agrupadas em 2 traces (base + rota ativa) usando null como separador
    const baseLon = [], baseLat = []
    const pathLon = [], pathLat = []
    const midLon = [], midLat = [], midCustom = []

    graphData.edges.forEach((edge) => {
      const A = PORT_COORDS[edge.from]
      const B = PORT_COORDS[edge.to]
      if (!A || !B) return
      const inPath = isPathEdge(edge.from, edge.to)
      if (inPath) {
        pathLon.push(A.lon, B.lon, null); pathLat.push(A.lat, B.lat, null)
      } else {
        baseLon.push(A.lon, B.lon, null); baseLat.push(A.lat, B.lat, null)
      }
      midLon.push((A.lon + B.lon) / 2)
      midLat.push((A.lat + B.lat) / 2)
      midCustom.push([edge.from, edge.to, edge.weight, inPath ? 1 : 0])
    })

    const hasRoute = activePath.length > 0
    const baseEdgeTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: baseLon, lat: baseLat,
      line: {
        width: hasRoute ? 0.4 : 0.7,
        color: hasRoute ? 'rgba(255,255,255,0.07)' : 'rgba(180,200,195,0.18)',
      },
      hoverinfo: 'none', showlegend: false,
    }

    // Halo/glow por trás da rota ativa
    const pathGlowTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: pathLon, lat: pathLat,
      line: { width: 22, color: 'rgba(255,215,0,0.09)' },
      hoverinfo: 'none', showlegend: false,
    }

    const pathEdgeTrace = {
      type: 'scattergeo', mode: 'lines',
      lon: pathLon, lat: pathLat,
      line: { width: 5, color: '#FFD700' },
      hoverinfo: 'none', showlegend: false,
    }

    // Marcadores invisíveis para hover: path=30px, outros=8px
    const weightHoverTrace = {
      type: 'scattergeo', mode: 'markers',
      lon: midLon, lat: midLat,
      marker: {
        size: midCustom.map((c) => (c[3] === 1 ? 30 : 8)),
        color: 'rgba(0,0,0,0)',
        opacity: 0,
      },
      customdata: midCustom,
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }

    // Nós agrupados por região (para legenda + cor por região)
    const regionMap = {}
    graphData.nodes.forEach((node) => {
      if (!PORT_COORDS[node.id]) return
      const region = portMeta[node.id]?.region || 'Outro'
      if (!regionMap[region]) regionMap[region] = []
      regionMap[region].push(node)
    })

    const nodeTraces = Object.entries(regionMap).map(([region, nodes]) => ({
      type: 'scattergeo', mode: 'markers+text', name: region,
      lon: nodes.map((n) => PORT_COORDS[n.id].lon),
      lat: nodes.map((n) => PORT_COORDS[n.id].lat),
      text: nodes.map((n) => n.id),
      textposition: 'top center',
      textfont: { family: 'Inter, sans-serif', size: 9, color: '#dbeee5' },
      marker: {
        size: nodes.map((n) =>
          n.id === startPort || n.id === endPort ? 18 :
          activePath.includes(n.id) ? 13 : 9
        ),
        color: nodes.map((n) =>
          n.id === startPort ? '#26c281' :
          n.id === endPort ? '#ff6b6b' :
          activePath.includes(n.id) ? '#FFD700' :
          getRegionColor(region)
        ),
        line: {
          color: nodes.map((n) =>
            n.id === startPort || n.id === endPort || activePath.includes(n.id)
              ? '#ffffff' : 'rgba(255,255,255,0.35)'
          ),
          width: nodes.map((n) =>
            n.id === startPort || n.id === endPort || activePath.includes(n.id) ? 2.2 : 0.8
          ),
        },
      },
      customdata: nodes.map((n) => [
        n.id,
        portMeta[n.id]?.name || '',
        portMeta[n.id]?.country || '',
        region,
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b> — %{customdata[1]} (%{customdata[2]})<br>' +
        '<i>%{customdata[3]}</i><extra></extra>',
      hoverlabel: {
        bgcolor: '#0b241c',
        bordercolor: getRegionColor(region),
        font: { family: 'Inter', color: '#ecfff7', size: 13 },
      },
    }))

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true, landcolor: '#16271f',
        showocean: true, oceancolor: '#0a1a14',
        showlakes: true, lakecolor: '#0a1a14',
        showcountries: true, countrycolor: '#2c4338',
        showcoastlines: true, coastlinecolor: '#3a5a4b',
        bgcolor: 'transparent', framewidth: 0,
      },
      margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      legend: {
        x: 0.005, y: 0.5, yanchor: 'middle',
        bgcolor: 'rgba(11,36,28,0.82)',
        bordercolor: '#2c4338', borderwidth: 1,
        font: { family: 'Inter', color: '#bfe0d2', size: 9 },
        itemsizing: 'constant',
      },
      autosize: true,
      height: 600,
    }

    // scrollZoom: true → o usuário navega/dá zoom no mapa-múndi com o scroll do mouse
    const config = { responsive: true, displayModeBar: false, scrollZoom: true }

    const weightHoverIndex = 3 // base, pathGlow, path, weightHover

    Plotly.react(
      plotRef.current,
      [baseEdgeTrace, pathGlowTrace, pathEdgeTrace, weightHoverTrace, ...nodeTraces],
      layout, config,
    ).then(() => {
      plotRef.current.removeAllListeners('plotly_hover')
      plotRef.current.removeAllListeners('plotly_unhover')
      plotRef.current.removeAllListeners('plotly_click')

      plotRef.current.on('plotly_hover', (data) => {
        const pt = data.points?.[0]
        if (!pt || !Array.isArray(pt.customdata)) return
        if (pt.curveNumber !== weightHoverIndex) return
        const [from, to, weight, inPathFlag] = pt.customdata
        const event = data.event
        if (!event) return
        const rect = wrapRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
        const hoverLayer = plotRef.current.querySelector('.hoverlayer')
        if (hoverLayer) hoverLayer.style.visibility = 'hidden'
        setEdgeTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          from, to, weight, inPath: inPathFlag === 1,
        })
      })

      plotRef.current.on('plotly_unhover', () => {
        const hoverLayer = plotRef.current.querySelector('.hoverlayer')
        if (hoverLayer) hoverLayer.style.visibility = 'visible'
        setEdgeTooltip(null)
      })

      plotRef.current.on('plotly_click', (data) => {
        const pt = data.points?.[0]
        if (!pt || !pt.customdata) return
        const nodeId = pt.customdata[0]
        if (typeof nodeId === 'string' && nodeId.length <= 5 && onNodeClick) onNodeClick(nodeId)
      })
    })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div ref={plotRef} style={{ width: '100%', minHeight: 600, background: 'transparent' }}>
        {!plotlyLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 600, color: '#6f9a89', fontSize: 14 }}>
            Carregando mapa-múndi...
          </div>
        )}
      </div>

      {edgeTooltip && (
        <div
          style={{
            position: 'absolute',
            left: edgeTooltip.x + 14,
            top: edgeTooltip.y - 10,
            pointerEvents: 'none',
            zIndex: 200,
            background: edgeTooltip.inPath ? 'rgba(20,15,0,0.97)' : 'rgba(11,36,28,0.96)',
            border: `1.5px solid ${edgeTooltip.inPath ? '#FFD700' : '#2c4338'}`,
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: edgeTooltip.inPath
              ? '0 4px 24px rgba(255,215,0,0.2), 0 0 0 1px rgba(255,215,0,0.08)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110,
          }}
        >
          <div style={{ fontSize: 11, color: '#6f9a89', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Rota
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ecfff7', fontFamily: 'Inter, sans-serif' }}>
            {edgeTooltip.from} → {edgeTooltip.to}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: edgeTooltip.inPath ? '#FFD700' : '#9cc8b6', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
            ⚖ Peso: {formatWeight(edgeTooltip.weight)}
          </div>
          {edgeTooltip.inPath && (
            <div style={{ fontSize: 10, color: '#FFD700', fontFamily: 'Inter, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}>
              ★ Melhor rota
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// ===========================================================================
// Painel de parada no porto (exibido quando o navio chega a um porto)
// ===========================================================================
function PortStopPanel({ portCode, portMeta, isOrigin, isDestination, onNext, onStop }) {
  const info = PORT_CURIOSITIES[portCode] || {}
  const meta = portMeta?.[portCode] || {}
  const [portImg, setPortImg] = useState(null)
  const [cityImg, setCityImg] = useState(null)
  const [imgLoading, setImgLoading] = useState(true)
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => {
    setPortImg(null)
    setCityImg(null)
    setImgLoading(true)
    let cancelled = false
    async function fetchImg(wikiTitle, setter) {
      try {
        const r = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replace(/_/g, ' '))}`,
        )
        const d = await r.json()
        if (!cancelled && d.thumbnail?.source) setter(d.thumbnail.source)
      } catch {}
    }
    const tasks = []
    if (info.wikiPort) tasks.push(fetchImg(info.wikiPort, setPortImg))
    if (info.wikiCity) tasks.push(fetchImg(info.wikiCity, setCityImg))
    Promise.allSettled(tasks).then(() => { if (!cancelled) setImgLoading(false) })
    return () => { cancelled = true }
  }, [portCode])

  const regionColor = getRegionColor(meta.region || 'Outro')

  return (
    <div className="port-stop-panel">
      {lightboxImg && createPortal(
        <div className="airport-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="airport-lightbox-close" type="button" onClick={() => setLightboxImg(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img src={lightboxImg} className="airport-lightbox-img" alt="" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body,
      )}

      <div className="port-stop-header">
        <div className="port-stop-code-row">
          <span className="port-stop-code" style={{ color: regionColor }}>{portCode}</span>
        </div>
        <button className="port-stop-close" type="button" onClick={onStop} title="Encerrar viagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="port-stop-body">
        <div className="port-stop-meta">
          <div className="port-stop-fullname">{info.name || portCode}</div>
          <div className="port-stop-country">
            {info.country || meta.country || ''}{meta.region ? ` · ${meta.region}` : ''}
          </div>
          {info.capacity && (
            <div className="port-stop-capacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 3v5h-7V8Z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              {info.capacity}
            </div>
          )}
        </div>

        <div className="port-stop-photos">
          {portImg ? (
            <div
              className="port-stop-photo-wrap port-stop-photo-clickable"
              onClick={() => setLightboxImg(portImg)}
              title="Ver foto maior"
            >
              <img src={portImg} alt={`Porto ${portCode}`} className="port-stop-photo"
                onError={(e) => { e.target.closest('.port-stop-photo-wrap').style.display = 'none' }} />
              <div className="port-stop-photo-caption">Porto</div>
            </div>
          ) : imgLoading ? <div className="port-stop-photo-skeleton" /> : null}

          {cityImg ? (
            <div
              className="port-stop-photo-wrap port-stop-photo-clickable"
              onClick={() => setLightboxImg(cityImg)}
              title="Ver foto maior"
            >
              <img src={cityImg} alt={info.country || portCode} className="port-stop-photo"
                onError={(e) => { e.target.closest('.port-stop-photo-wrap').style.display = 'none' }} />
              <div className="port-stop-photo-caption">{info.country || 'Cidade'}</div>
            </div>
          ) : imgLoading ? <div className="port-stop-photo-skeleton" /> : null}
        </div>

        <div className="port-stop-curiosities">
          <div className="port-stop-curiosities-title">Sobre este Porto</div>
          {(info.curiosities || ['Porto de carga internacional.']).map((c, i) => (
            <div key={i} className="port-stop-curiosity">
              <span className="port-stop-curiosity-bullet">⚓</span>
              {c}
            </div>
          ))}
        </div>
      </div>

      <div className="port-stop-actions">
        {isDestination ? (
          <button type="button" className="port-stop-btn finish" onClick={onStop}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            Porto alcançado!
          </button>
        ) : (
          <button type="button" className="port-stop-btn next" onClick={onNext}>
            {isOrigin ? 'Zarpar' : 'Próximo porto'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Globo 3D interativo (react-globe.gl) — modal de visão 3D
// ===========================================================================
function Globe3DModal({ onClose, graphData, pathResult, startPort, endPort, portMeta }) {
  const globeRef = useRef(null)
  const containerRef = useRef(null)
  const flyAnimRef = useRef(null)
  const shipModelRef = useRef(null)
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 })
  const [autoRotate, setAutoRotate] = useState(true)
  const [globeReady, setGlobeReady] = useState(false)
  const [countriesGeoJSON, setCountriesGeoJSON] = useState({ features: [] })
  const [shipData, setShipData] = useState([])
  const [flyState, setFlyState] = useState('idle') // 'idle' | 'sailing' | 'at_port'
  const [currentWpIdx, setCurrentWpIdx] = useState(0)

  // Usa o path sempre que disponível (inclui fallback DFS do ciclo negativo do BF)
  const activePath = useMemo(
    () => (pathResult?.path?.length > 1 ? pathResult.path : []),
    [pathResult],
  )

  const arcsData = useMemo(() => {
    const pathEdges = new Set(
      activePath.slice(0, -1).map((p, i) => `${p}|${activePath[i + 1]}`),
    )
    return graphData.edges
      .map((e) => {
        const A = PORT_COORDS[e.from]
        const B = PORT_COORDS[e.to]
        if (!A || !B) return null
        return {
          startLat: A.lat, startLng: A.lon,
          endLat: B.lat, endLng: B.lon,
          from: e.from, to: e.to,
          weight: e.weight,
          inPath: pathEdges.has(`${e.from}|${e.to}`),
        }
      })
      .filter(Boolean)
  }, [graphData.edges, activePath])

  const pointsData = useMemo(() => {
    const pathSet = new Set(activePath)
    return graphData.nodes
      .filter((n) => PORT_COORDS[n.id])
      .map((n) => ({
        lat: PORT_COORDS[n.id].lat,
        lng: PORT_COORDS[n.id].lon,
        id: n.id,
        region: portMeta[n.id]?.region || 'Outro',
        name: portMeta[n.id]?.name || n.id,
        country: portMeta[n.id]?.country || '',
        isStart: n.id === startPort,
        isEnd: n.id === endPort,
        inPath: pathSet.has(n.id),
      }))
  }, [graphData.nodes, portMeta, startPort, endPort, activePath])

  // Trava o scroll do fundo quando o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => () => clearInterval(flyAnimRef.current), [])

  // Carrega o modelo 3D do navio (GLB)
  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load(
      '/ship.glb',
      (gltf) => {
        const model = gltf.scene
        model.scale.setScalar(0.25)
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach((m) => {
              if ('emissive' in m) m.emissive = new THREE.Color(0xffffff)
              if ('emissiveIntensity' in m) m.emissiveIntensity = 0.3
            })
          }
        })
        shipModelRef.current = model
      },
      undefined,
      (err) => console.warn('ship.glb load error:', err),
    )
  }, [])

  // Carrega bordas de países (GeoJSON) para exibir no globo
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/countries.geojson')
      .then((r) => r.json())
      .then((data) => setCountriesGeoJSON(data))
      .catch(() => {})
  }, [])

  // Ajusta dimensões ao container com ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDimensions({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setDimensions({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Inicializa controles após o globo estar pronto
  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const ctrl = globeRef.current.controls()
    ctrl.autoRotate = autoRotate
    ctrl.autoRotateSpeed = 0.45
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.08
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady])

  // Sincroniza autoRotate
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = autoRotate
  }, [autoRotate])

  // Fecha com Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { handleStop(); onClose() } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleStop() {
    clearInterval(flyAnimRef.current)
    setFlyState('idle')
    setShipData([])
    setCurrentWpIdx(0)
    if (globeRef.current) globeRef.current.controls().autoRotate = autoRotate
  }

  function handleNavegar() {
    if (activePath.length < 2) return
    const coord = PORT_COORDS[activePath[0]]
    if (!coord) return
    clearInterval(flyAnimRef.current)
    setAutoRotate(false)
    const nextCoord = PORT_COORDS[activePath[1]]
    const bearing = nextCoord ? computeBearing(coord.lat, coord.lon, nextCoord.lat, nextCoord.lon) : 0
    setShipData([{ lat: coord.lat, lng: coord.lon, bearing }])
    setCurrentWpIdx(0)
    setFlyState('at_port')
    globeRef.current?.pointOfView({ lat: coord.lat - 1, lng: coord.lon, altitude: 0.55 }, 900)
  }

  function handleNextSailing() {
    const nextIdx = currentWpIdx + 1
    if (nextIdx >= activePath.length) return
    const fromCode = activePath[currentWpIdx]
    const toCode = activePath[nextIdx]
    const fromCoord = PORT_COORDS[fromCode]
    const toCoord = PORT_COORDS[toCode]
    if (!fromCoord || !toCoord) return

    clearInterval(flyAnimRef.current)
    setFlyState('sailing')

    const bearing = computeBearing(fromCoord.lat, fromCoord.lon, toCoord.lat, toCoord.lon)
    setShipData([{ lat: fromCoord.lat, lng: fromCoord.lon, bearing }])
    globeRef.current?.pointOfView(
      { lat: fromCoord.lat - 2, lng: fromCoord.lon, altitude: 0.5 },
      700,
    )

    const STEPS = 140
    const INTERVAL = 18
    let step = 0

    setTimeout(() => {
      flyAnimRef.current = setInterval(() => {
        const t = step / STEPS
        const lat = fromCoord.lat + (toCoord.lat - fromCoord.lat) * t
        const lng = fromCoord.lon + (toCoord.lon - fromCoord.lon) * t
        const camAlt = 0.3 + Math.sin(t * Math.PI) * 0.2

        const camLat = lat - (toCoord.lat - fromCoord.lat) * 0.06
        const camLng = lng - (toCoord.lon - fromCoord.lon) * 0.06
        globeRef.current?.pointOfView({ lat: camLat, lng: camLng, altitude: camAlt }, 0)
        setShipData([{ lat, lng, bearing }])

        step++
        if (step > STEPS) {
          clearInterval(flyAnimRef.current)
          const isLastWp = nextIdx === activePath.length - 1
          let restBearing = bearing
          if (!isLastWp) {
            const afterCoord = PORT_COORDS[activePath[nextIdx + 1]]
            if (afterCoord) restBearing = computeBearing(toCoord.lat, toCoord.lon, afterCoord.lat, afterCoord.lon)
          }
          globeRef.current?.pointOfView(
            { lat: toCoord.lat - 0.5, lng: toCoord.lon, altitude: 0.5 },
            1000,
          )
          setShipData([{ lat: toCoord.lat, lng: toCoord.lon, bearing: restBearing }])
          setCurrentWpIdx(nextIdx)
          setFlyState('at_port')
        }
      }, INTERVAL)
    }, 800)
  }

  const isSailing = flyState === 'sailing'
  const isAtPort = flyState === 'at_port'
  const currentPortCode = isAtPort ? activePath[currentWpIdx] : null

  const flyToRoute = () => {
    if (!globeRef.current || !startPort || !endPort) return
    const A = PORT_COORDS[startPort]
    const B = PORT_COORDS[endPort]
    if (!A || !B) return
    globeRef.current.pointOfView(
      { lat: (A.lat + B.lat) / 2, lng: (A.lon + B.lon) / 2, altitude: 2.0 },
      1200,
    )
  }

  return (
    <div
      className="globe-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="globe-modal-container">

        {/* ── Cabeçalho ── */}
        <div className="globe-modal-header">
          <div className="globe-modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              width="20" height="20" style={{ color: '#26c281', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Mapa de Conexões — Visão 3D
          </div>
          <div className="globe-modal-controls">
            {pathResult?.success && activePath.length >= 2 && flyState === 'idle' && (
              <button type="button" className="globe-ctrl-btn etn-sail-btn" onClick={handleNavegar} title="Iniciar viagem de navio pela rota">
                ⛵ Navegar
              </button>
            )}
            {flyState !== 'idle' && (
              <button type="button" className="globe-ctrl-btn etn-stop-btn" onClick={handleStop} title="Encerrar viagem">
                ✕ Encerrar viagem
              </button>
            )}
            {pathResult?.success && startPort && endPort && (
              <button type="button" className="globe-ctrl-btn" onClick={flyToRoute} title="Centralizar câmera na rota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Focar na rota
              </button>
            )}
            <button
              type="button"
              className={`globe-ctrl-btn${autoRotate ? ' active' : ''}`}
              onClick={() => setAutoRotate((v) => !v)}
              title={autoRotate ? 'Pausar rotação automática' : 'Iniciar rotação automática'}
            >
              {autoRotate ? (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  Pausar rotação
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  Girar globo
                </>
              )}
            </button>
            <button type="button" className="globe-close-btn" onClick={onClose} aria-label="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Barra da rota ativa ── */}
        {pathResult?.success && activePath.length > 0 && (
          <div className="globe-path-bar">
            <span className="globe-path-label">Rota ativa:</span>
            <div className="globe-path-ports">
              {activePath.map((port, i) => (
                <span key={`gp-${port}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{
                    color: port === startPort ? '#26c281' : port === endPort ? '#ff6b6b' : '#f6c56f',
                    fontWeight: 800, fontSize: '0.82rem',
                  }}>{port}</span>
                  {i < activePath.length - 1 && (
                    <span style={{ color: '#3a5a4b', fontSize: '0.75rem' }}>›</span>
                  )}
                </span>
              ))}
            </div>
            {pathResult.cost != null && (
              <span className="globe-path-cost">Peso total: {formatWeight(pathResult.cost)}</span>
            )}
          </div>
        )}

        {/* ── Banner de navegação ── */}
        {isSailing && currentWpIdx < activePath.length - 1 && (
          <div className="etn-sailing-banner">
            <span>⛵</span>
            Navegando de <strong>{activePath[currentWpIdx]}</strong> para <strong>{activePath[currentWpIdx + 1]}</strong>
          </div>
        )}

        {/* ── Corpo do globo ── */}
        <div className="globe-modal-body" ref={containerRef}>
          {!globeReady && (
            <div className="globe-loading">
              <div className="globe-loading-spinner" />
              <div className="globe-loading-text">Carregando globo 3D…</div>
            </div>
          )}

          <GlobeGL
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            onGlobeReady={() => setGlobeReady(true)}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="rgba(38,194,129,0.65)"
            atmosphereAltitude={0.18}
            // ── Bordas de países ──
            polygonsData={countriesGeoJSON.features}
            polygonCapColor={() => 'rgba(0,0,0,0)'}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonStrokeColor={() => 'rgba(38,194,129,0.4)'}
            polygonAltitude={0.001}
            polygonLabel={() => ''}
            // ── Arcos ──
            arcsData={arcsData}
            arcStartLat={(d) => d.startLat}
            arcStartLng={(d) => d.startLng}
            arcEndLat={(d) => d.endLat}
            arcEndLng={(d) => d.endLng}
            arcColor={(d) => {
              if (d.inPath) return '#FFD700'
              return activePath.length > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(38,194,129,0.13)'
            }}
            arcStroke={(d) => {
              if (d.inPath) return 3.0
              return activePath.length > 0 ? 0.18 : 0.28
            }}
            arcDashLength={(d) => d.inPath ? 0.45 : 1}
            arcDashGap={(d) => d.inPath ? 0.2 : 0}
            arcDashAnimateTime={(d) => d.inPath ? 1000 : 0}
            arcAltitudeAutoScale={0.28}
            arcLabel={(d) => `<div style="background:rgba(${d.inPath ? '20,15,0' : '6,26,20'},0.97);border:1.5px solid rgba(${d.inPath ? '255,215,0' : '38,194,129'},0.55);border-radius:9px;padding:7px 12px;font-family:Inter,sans-serif;box-shadow:${d.inPath ? '0 4px 20px rgba(255,215,0,0.2)' : '0 4px 20px rgba(0,0,0,0.5)'}"><span style="color:#ecfff7;font-weight:700">${d.from}</span><span style="color:#3a5a4b;margin:0 6px">→</span><span style="color:#ecfff7;font-weight:700">${d.to}</span><div style="color:${d.inPath ? '#FFD700' : '#9cc8b6'};font-size:11px;margin-top:3px;font-weight:${d.inPath ? '700' : '400'}">Peso: ${formatWeight(d.weight)}${d.inPath ? ' · ★ Melhor rota' : ''}</div></div>`}
            // ── Pontos ──
            pointsData={pointsData}
            pointLat={(d) => d.lat}
            pointLng={(d) => d.lng}
            pointColor={(d) => {
              if (d.isStart) return '#26c281'
              if (d.isEnd)   return '#ff6b6b'
              if (d.inPath)  return '#FFD700'
              return activePath.length > 0
                ? 'rgba(200,220,210,0.45)'
                : getRegionColor(d.region)
            }}
            pointRadius={(d) => {
              if (d.isStart || d.isEnd) return 0.62
              if (d.inPath) return 0.5
              return activePath.length > 0 ? 0.22 : 0.3
            }}
            pointAltitude={(d) => (d.isStart || d.isEnd) ? 0.08 : d.inPath ? 0.05 : 0.01}
            pointLabel={(d) => `<div style="background:rgba(6,26,20,0.97);border:1.5px solid ${getRegionColor(d.region)};border-radius:10px;padding:10px 14px;font-family:Inter,sans-serif;min-width:150px;box-shadow:0 6px 28px rgba(0,0,0,0.6)"><div style="font-weight:800;color:#ecfff7;font-size:15px;letter-spacing:0.03em">${d.id}</div><div style="color:#bfe0d2;font-size:12px;margin-top:3px">${d.name}</div><div style="color:#6f9a89;font-size:10px;margin-top:3px">${d.country} &middot; ${d.region}</div>${d.isStart ? '<div style="color:#26c281;font-size:11px;font-weight:700;margin-top:5px">✦ Porto de origem</div>' : ''}${d.isEnd ? '<div style="color:#ff6b6b;font-size:11px;font-weight:700;margin-top:5px">✦ Porto de destino</div>' : ''}${d.inPath && !d.isStart && !d.isEnd ? '<div style="color:#FFD700;font-size:11px;font-weight:700;margin-top:5px">★ Melhor rota</div>' : ''}</div>`}
            customLayerData={shipData}
            customThreeObject={() => {
              if (!shipModelRef.current) return new THREE.Object3D()
              return shipModelRef.current.clone(true)
            }}
            customThreeObjectUpdate={(obj, d) => {
              const GLOBE_R = 100
              const alt = flyState === 'sailing' ? 0.10 : 0.08
              const phi = ((90 - d.lat) * Math.PI) / 180
              const theta = ((90 - d.lng) * Math.PI) / 180
              const r = GLOBE_R * (1 + alt)

              const sinPhi = Math.sin(phi)
              const cosPhi = Math.cos(phi)
              const cosTheta = Math.cos(theta)
              const sinTheta = Math.sin(theta)

              obj.position.set(
                r * sinPhi * cosTheta,
                r * cosPhi,
                r * sinPhi * sinTheta,
              )

              const up = new THREE.Vector3(sinPhi * cosTheta, cosPhi, sinPhi * sinTheta).normalize()
              const worldY = new THREE.Vector3(0, 1, 0)
              const north = new THREE.Vector3()
                .copy(worldY)
                .addScaledVector(up, -worldY.dot(up))
                .normalize()

              const east = new THREE.Vector3().crossVectors(north, up).normalize()
              const bearingRad = ((d.bearing ?? 0) * Math.PI) / 180

              const forward = new THREE.Vector3()
                .addScaledVector(north, Math.cos(bearingRad))
                .addScaledVector(east, Math.sin(bearingRad))
                .normalize()

              const right = new THREE.Vector3().crossVectors(up, forward).normalize()

              obj.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, up, forward))
            }}
          />

          {/* ── Legenda ── */}
          <div className="globe-legend">
            <div className="globe-legend-title">Legenda</div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#26c281' }} />
              Origem
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#ff6b6b' }} />
              Destino
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }} />
              Melhor rota
            </div>
            <div className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: '#7f93a8' }} />
              Outros portos
            </div>
            <div className="globe-legend-sep" />
            <div className="globe-legend-hint">
              Arraste para girar<br />
              Scroll para zoom<br />
              Passe o mouse nos portos<br />
              {activePath.length >= 2 && flyState === 'idle' && (
                <span style={{ color: '#26c281' }}>⛵ Clique em &apos;Navegar&apos;</span>
              )}
            </div>
          </div>

          {/* ── Painel de parada no porto ── */}
          {isAtPort && currentPortCode && (
            <PortStopPanel
              portCode={currentPortCode}
              portMeta={portMeta}
              isOrigin={currentWpIdx === 0}
              isDestination={currentWpIdx === activePath.length - 1}
              onNext={handleNextSailing}
              onStop={handleStop}
            />
          )}
        </div>

      </div>
    </div>
  )
}

// ===========================================================================
// Modal de curiosidades do porto — abre ao clicar num card de conexão
// ===========================================================================
function PortCuriosityModal({ portCode, onClose }) {
  const info = PORT_CURIOSITIES[portCode] || {}
  const regionColor = getRegionColor(info.region || '')
  const accentColor = '#0e9e6b'

  return createPortal(
    <div className="pcm-overlay" onClick={onClose}>
      <div className="pcm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pcm-hero" style={{ background: `linear-gradient(135deg, rgba(14,158,107,0.12) 0%, rgba(6,26,20,0) 60%)` }}>
          <div className="pcm-header">
            <div className="pcm-header-left">
              <span className="pcm-code" style={{ color: accentColor }}>{portCode}</span>
              {info.country && (
                <span className="pcm-region" style={{ background: 'rgba(14,158,107,0.15)', color: accentColor }}>
                  {info.country}
                </span>
              )}
            </div>
            <button className="pcm-close" type="button" onClick={onClose} title="Fechar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="pcm-name">{info.name || portCode}</div>
          {info.capacity && (
            <div className="pcm-capacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {info.capacity}
            </div>
          )}
        </div>
        <div className="pcm-body">
          <div className="pcm-curiosities-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Curiosidades
          </div>
          <div className="pcm-curiosities">
            {(info.curiosities || ['Porto sem curiosidades cadastradas.']).map((c, i) => (
              <div key={i} className="pcm-curiosity">
                <span className="pcm-bullet">✦</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ===========================================================================
// Painel de Rotas & Portos — ETN Shipping
// ===========================================================================
function PainelRotasETN({ onBack }) {
  const [startPort, setStartPort] = useState('')
  const [endPort, setEndPort] = useState('')
  const [pathResult, setPathResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [portMeta, setPortMeta] = useState({})
  const [selectedConnectionPort, setSelectedConnectionPort] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [show3DGlobe, setShow3DGlobe] = useState(false)
  const [hoveredPortModal, setHoveredPortModal] = useState(null)
  const [visibleConns, setVisibleConns] = useState(9)

  // Controle do box de ciclo negativo
  const [cycleDismissed, setCycleDismissed] = useState(false)

  // Modal da nota analítica
  const [showNoteModal, setShowNoteModal] = useState(false)

  // Simulação passo a passo (frontend, independente do backend)
  const [bellmanSteps, setBellmanSteps] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [bellmanVerdict, setBellmanVerdict] = useState(null) // 'done' | 'cycle' | null

  const searchRef = useRef(null)
  const startPortRef = useRef('')
  const endPortRef = useRef('')
  const simulationTimeoutsRef = useRef([])

  const API = 'http://localhost:5000'

  // ─── Carregamento de dados ───────────────────────────────────
  const loadGraphData = async () => {
    try {
      const { data } = await axios.get(`${API}/api/etn/graph-data`)
      const meta = {}
      data.nodes.forEach((n) => {
        meta[n.id] = { name: n.name, country: n.country, region: n.region }
      })
      setPortMeta(meta)
      setGraphData({
        nodes: data.nodes.map((n) => ({ id: n.id, label: n.id, title: n.title })),
        edges: data.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
      })
    } catch (err) {
      console.error('Erro ao carregar grafo ETN:', err)
    }
  }

  useEffect(() => { loadGraphData() }, [])
  useEffect(() => { startPortRef.current = startPort }, [startPort])
  useEffect(() => { endPortRef.current = endPort }, [endPort])

  useEffect(() => () => clearSimulationTimeouts(), [])

  // Recalcula automaticamente ao mudar origem/destino
  useEffect(() => {
    // Limpa resultado antigo e fecha o box de ciclo imediatamente
    setPathResult(null)
    setCycleDismissed(false)
    resetSimulation()
    if (startPort && endPort && startPort !== endPort) {
      calculatePath(startPort, endPort)
      playBellmanFordSteps(startPort)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPort, endPort])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([])
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setVisibleConns(9) }, [selectedConnectionPort])

  // ─── Estruturas derivadas ────────────────────────────────────
  const portOptions = useMemo(() => {
    return [...graphData.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((node) => ({
        value: node.id,
        label: portMeta[node.id]?.name ? `${node.id} — ${portMeta[node.id].name}` : node.id,
      }))
  }, [graphData.nodes, portMeta])

  // Conexões de saída (grafo direcionado) por porto
  const connectionMap = useMemo(() => {
    const map = new Map()
    graphData.nodes.forEach((n) => map.set(n.id, []))
    graphData.edges.forEach((edge) => {
      if (!map.has(edge.from)) map.set(edge.from, [])
      map.get(edge.from).push({
        code: edge.to,
        name: portMeta[edge.to]?.name || '',
        weight: edge.weight,
      })
    })
    for (const [key, values] of map.entries()) {
      values.sort((a, b) => a.code.localeCompare(b.code))
      map.set(key, values)
    }
    return map
  }, [graphData.edges, graphData.nodes, portMeta])

  const bellmanTableNodes = useMemo(
    () => [...graphData.nodes].map((n) => n.id).sort((a, b) => a.localeCompare(b)),
    [graphData.nodes],
  )

  // Lista de adjacência DIRECIONADA para a simulação
  const buildAdjacency = () => {
    const adjacency = new Map()
    graphData.nodes.forEach((n) => adjacency.set(n.id, []))
    graphData.edges.forEach((edge) => {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
      adjacency.get(edge.from).push({ to: edge.to, weight: Number(edge.weight) })
    })
    return adjacency
  }

  // ─── Grafo sem ciclos negativos (para Bellman-Ford) ─────────
  const findNegativeCycle = (edges, nodeIds) => {
    const dist = {}
    const prev = {}
    nodeIds.forEach((n) => { dist[n] = 0; prev[n] = null })
    let x = null
    for (let i = 0; i < nodeIds.length; i++) {
      x = null
      for (const e of edges) {
        if (dist[e.from] + e.weight < dist[e.to] - 1e-9) {
          dist[e.to] = dist[e.from] + e.weight
          prev[e.to] = e.from
          x = e.to
        }
      }
    }
    if (x === null) return null
    for (let i = 0; i < nodeIds.length; i++) x = prev[x]
    const cycle = [x]
    let v = prev[x]
    while (v !== x) { cycle.push(v); v = prev[v] }
    cycle.push(x)
    cycle.reverse()
    return cycle
  }

  const removeNegativeCycles = (rawEdges, nodes) => {
    const nodeIds = nodes.map((n) => n.id)
    let edges = rawEdges.map((e) => ({ from: e.from, to: e.to, weight: Number(e.weight) }))
    while (true) {
      const cycle = findNegativeCycle(edges, nodeIds)
      if (cycle === null) break
      let worstIdx = -1
      let worstW = Infinity
      for (let i = 0; i < cycle.length - 1; i++) {
        const a = cycle[i], b = cycle[i + 1]
        const idx = edges.findIndex((e) => e.from === a && e.to === b)
        if (idx >= 0 && edges[idx].weight < worstW) {
          worstW = edges[idx].weight
          worstIdx = idx
        }
      }
      if (worstIdx < 0) break
      edges.splice(worstIdx, 1)
    }
    return edges
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const decycledEdges = useMemo(
    () => removeNegativeCycles(graphData.edges, graphData.nodes),
    [graphData.edges, graphData.nodes],
  )

  const buildBellmanAdjacency = () => {
    const adjacency = new Map()
    graphData.nodes.forEach((n) => adjacency.set(n.id, []))
    decycledEdges.forEach((edge) => {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
      adjacency.get(edge.from).push({ to: edge.to, weight: edge.weight })
    })
    return adjacency
  }

  // ─── Simulação Bellman-Ford ──────────────────────────────────
  const BF_ITERATION_CAP = 12


  const generateBellmanFordSteps = (start) => {
    const adjacency = buildBellmanAdjacency()
    const nodeIds = bellmanTableNodes
    const dist = {}
    const prev = {}
    nodeIds.forEach((n) => { dist[n] = Infinity; prev[n] = null })
    dist[start] = 0

    const V = nodeIds.length
    const maxIter = Math.min(V - 1, BF_ITERATION_CAP)
    const steps = []
    let stoppedEarly = false

    for (let i = 0; i < maxIter; i++) {
      let updated = false
      for (const u of nodeIds) {
        if (dist[u] === Infinity) continue
        for (const { to, weight } of adjacency.get(u) || []) {
          if (dist[u] + weight < dist[to]) {
            dist[to] = dist[u] + weight
            prev[to] = u
            updated = true
          }
        }
      }
      const rows = {}
      nodeIds.forEach((n) => {
        rows[n] = dist[n] === Infinity ? '∞' : `(${formatWeight(dist[n])}, ${prev[n] || '—'})`
      })
      steps.push({ iteration: i + 1, rows })
      if (!updated) { stoppedEarly = true; break }
    }

    // Verificação de ciclo negativo (1 passada extra de relaxamento)
    let negativeCycle = false
    if (!stoppedEarly) {
      for (const u of nodeIds) {
        if (dist[u] === Infinity) continue
        for (const { to, weight } of adjacency.get(u) || []) {
          if (dist[u] + weight < dist[to]) { negativeCycle = true; break }
        }
        if (negativeCycle) break
      }
    }
    return { steps, negativeCycle }
  }

  const clearSimulationTimeouts = () => {
    simulationTimeoutsRef.current.forEach((id) => clearTimeout(id))
    simulationTimeoutsRef.current = []
  }

  const resetSimulation = () => {
    clearSimulationTimeouts()
    setBellmanSteps([])
    setIsSimulating(false)
    setBellmanVerdict(null)
  }

  const playBellmanFordSteps = (start) => {
    resetSimulation()
    if (!start) return
    const { steps, negativeCycle } = generateBellmanFordSteps(start)
    if (!steps.length) return
    setIsSimulating(true)
    steps.forEach((step, index) => {
      const id = setTimeout(() => {
        setBellmanSteps((prev) => [...prev, step])
        if (index === steps.length - 1) {
          setIsSimulating(false)
          setBellmanVerdict(negativeCycle ? 'cycle' : 'done')
        }
      }, index * 1100)
      simulationTimeoutsRef.current.push(id)
    })
  }

  // ─── Seleção origem/destino ──────────────────────────────────
  const handlePortClick = (nodeId) => {
    const cStart = startPortRef.current
    const cEnd = endPortRef.current
    if (nodeId === cStart) { setStartPort(''); return }
    if (nodeId === cEnd) { setEndPort(''); return }
    if (!cStart) { setStartPort(nodeId); return }
    if (!cEnd) { setEndPort(nodeId); return }
    // ambos definidos → reinicia a partir do novo clique
    setEndPort('')
    setStartPort(nodeId)
  }

  const calculatePath = async (cStart, cEnd) => {
    if (!cStart || !cEnd || cStart === cEnd) return
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/etn/bellman-ford`, { start: cStart, end: cEnd })
      setPathResult(data)
    } catch (error) {
      console.error('Erro ao calcular caminho:', error)
      setPathResult({ success: false, hasNegativeCycle: false, message: 'Erro ao calcular caminho.' })
    } finally {
      setLoading(false)
    }
  }

  const resetSelection = async () => {
    setSelectedConnectionPort(null)
    setSearchQuery('')
    setSearchResults([])
    setStartPort('')
    setEndPort('')
    setPathResult(null)
    resetSimulation()
    await loadGraphData()
  }

  // ─── Busca de portos ─────────────────────────────────────────
  const handleSearch = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); setSelectedConnectionPort(null); return }
    const lower = q.toLowerCase()
    const matches = graphData.nodes
      .filter((n) =>
        n.id.toLowerCase().includes(lower) ||
        (portMeta[n.id]?.name || '').toLowerCase().includes(lower))
      .slice(0, 8)
    setSearchResults(matches)
  }

  const handleSearchSelect = (nodeId) => {
    setSearchQuery(portMeta[nodeId]?.name ? `${nodeId} — ${portMeta[nodeId].name}` : nodeId)
    setSearchResults([])
    setSelectedConnectionPort({
      id: nodeId,
      connections: connectionMap.get(nodeId) || [],
    })
  }

  const handleStartChange = (value) => {
    if (value && value === endPort) return
    setStartPort(value)
  }
  const handleEndChange = (value) => {
    if (value && value === startPort) return
    setEndPort(value)
  }

  const formattedCost = pathResult?.success && pathResult?.cost != null
    ? formatWeight(pathResult.cost)
    : ''

  return (
    <div className="app-modern-bg painel-etn-theme" style={{ position: 'relative' }}>
      <header className="app-modern-header">
        <div className="header-top-actions">
          <button onClick={onBack} className="global-metrics-back-button" type="button" title="Voltar">
            <span className="global-metrics-back-icon-etn" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="global-metrics-back-text">Voltar</span>
          </button>
        </div>

        <div className="clean-header">
          <div className="clean-header-brand">
            <img src={logoEtn} alt="Logo ETN Shipping" className="clean-header-logo" />
          </div>
          <div className="clean-header-content">
            <h1 className="clean-header-title">Painel de Rotas &amp; Portos</h1>
            <p className="dashboard-header-subtitle">
              Navegue pela malha marítima global, explore os portos e calcule o menor caminho com Bellman-Ford.
            </p>
          </div>
        </div>
      </header>

      <main className="app-modern-main">
        {/* ── Trigger card — nota analítica ── */}
        <button type="button" className="etn-note-trigger" onClick={() => setShowNoteModal(true)}>
          <span className="etn-note-trigger-icon">⚠</span>
          <span className="etn-note-trigger-text">
            Este grafo contém <strong>ciclos negativos</strong> — o Bellman-Ford usa um grafo tratado (arestas mais negativas removidas iterativamente).
          </span>
          <span className="etn-note-trigger-cta">Saiba mais →</span>
        </button>

        {/* ── Modal da nota analítica ── */}
        {showNoteModal && (
          <div
            className="etn-note-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNoteModal(false) }}
            role="dialog"
            aria-modal="true"
          >
            <div className="etn-note-modal">
              <div className="etn-note-modal-header">
                <div className="etn-note-modal-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    width="18" height="18" style={{ color: '#26c281', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Como funciona o grafo Bellman-Ford?
                </div>
                <button type="button" className="etn-note-close" onClick={() => setShowNoteModal(false)} aria-label="Fechar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="etn-note-modal-body">

                {/* Seção 1 */}
                <div className="etn-note-section">
                  <div className="etn-note-section-num">1</div>
                  <div>
                    <div className="etn-note-section-title">Ciclos negativos no grafo</div>
                    <p className="etn-note-section-text">
                      O grafo ETN é <strong>direcionado</strong> e possui arestas com peso negativo representando rotas deficitárias.
                      Alguns conjuntos de arestas formam <strong>ciclos negativos</strong> — circuitos cujos pesos somam um valor
                      negativo. Quando existe um ciclo negativo alcançável a partir da origem, o problema do menor caminho torna-se
                      <strong> indefinido</strong>: percorrer o ciclo repetidamente reduz o custo indefinidamente.
                    </p>
                    <p className="etn-note-section-text">
                      Para contornar isso, o painel aplica um pré-processamento: detecta cada ciclo negativo com uma passagem de
                      Bellman-Ford de super-fonte virtual (todas as distâncias iniciam em 0), identifica a aresta de menor peso
                      dentro do ciclo e a remove. O processo repete até que nenhum ciclo negativo persista.
                    </p>
                  </div>
                </div>

                {/* Seção 2 — SVGs antes/depois */}
                <div className="etn-note-section">
                  <div className="etn-note-section-num">2</div>
                  <div style={{ width: '100%' }}>
                    <div className="etn-note-section-title">Antes e depois</div>
                    <div className="etn-note-diagrams">

                      {/* Antes */}
                      <div className="etn-note-diagram-wrap">
                        <div className="etn-note-diagram-label">Antes</div>
                        <svg viewBox="0 0 180 140" className="etn-note-svg" aria-hidden="true">
                          {/* Arestas */}
                          <defs>
                            <marker id="arr-before" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                              <polygon points="0 0, 7 3.5, 0 7" fill="#26c281" opacity="0.7"/>
                            </marker>
                          </defs>
                          {/* A→B */}
                          <line x1="30" y1="110" x2="85" y2="28" stroke="#26c281" strokeWidth="1.8" opacity="0.75" markerEnd="url(#arr-before)"/>
                          <text x="36" y="65" fontSize="10" fill="#f6c56f" textAnchor="middle">−5</text>
                          {/* B→C */}
                          <line x1="90" y1="25" x2="148" y2="108" stroke="#26c281" strokeWidth="1.8" opacity="0.75" markerEnd="url(#arr-before)"/>
                          <text x="132" y="65" fontSize="10" fill="#f6c56f" textAnchor="middle">−4</text>
                          {/* C→A */}
                          <line x1="145" y1="115" x2="38" y2="115" stroke="#26c281" strokeWidth="1.8" opacity="0.75" markerEnd="url(#arr-before)"/>
                          <text x="91" y="130" fontSize="10" fill="#f6c56f" textAnchor="middle">+2</text>
                          {/* Nós */}
                          <circle cx="30" cy="115" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="30" y="119" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">A</text>
                          <circle cx="90" cy="22" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="90" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">B</text>
                          <circle cx="150" cy="115" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="150" y="119" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">C</text>
                          {/* Soma */}
                          <text x="90" y="14" textAnchor="middle" fontSize="9" fill="#ff6b6b" fontWeight="700">soma = −7</text>
                        </svg>
                      </div>

                      {/* Seta entre */}
                      <div className="etn-note-diagram-arrow">→</div>

                      {/* Depois */}
                      <div className="etn-note-diagram-wrap">
                        <div className="etn-note-diagram-label">Depois</div>
                        <svg viewBox="0 0 180 140" className="etn-note-svg" aria-hidden="true">
                          <defs>
                            <marker id="arr-after" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                              <polygon points="0 0, 7 3.5, 0 7" fill="#26c281" opacity="0.7"/>
                            </marker>
                          </defs>
                          {/* A→B removida */}
                          <line x1="30" y1="110" x2="85" y2="28" stroke="#f6c56f" strokeWidth="1.4" opacity="0.28" strokeDasharray="5 4"/>
                          <text x="36" y="65" fontSize="10" fill="#f6c56f" opacity="0.35" textAnchor="middle">−5</text>
                          <text x="58" y="78" fontSize="8" fill="#f6c56f" opacity="0.55" textAnchor="middle" fontWeight="700">removida</text>
                          {/* B→C */}
                          <line x1="90" y1="25" x2="148" y2="108" stroke="#26c281" strokeWidth="1.8" opacity="0.75" markerEnd="url(#arr-after)"/>
                          <text x="132" y="65" fontSize="10" fill="#f6c56f" textAnchor="middle">−4</text>
                          {/* C→A */}
                          <line x1="145" y1="115" x2="38" y2="115" stroke="#26c281" strokeWidth="1.8" opacity="0.75" markerEnd="url(#arr-after)"/>
                          <text x="91" y="130" fontSize="10" fill="#f6c56f" textAnchor="middle">+2</text>
                          {/* Nós */}
                          <circle cx="30" cy="115" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="30" y="119" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">A</text>
                          <circle cx="90" cy="22" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="90" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">B</text>
                          <circle cx="150" cy="115" r="14" fill="#0b241c" stroke="#26c281" strokeWidth="1.5"/>
                          <text x="150" y="119" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ecfff7">C</text>
                          {/* Sem ciclo */}
                          <text x="90" y="14" textAnchor="middle" fontSize="9" fill="#26c281" fontWeight="700">sem ciclo negativo</text>
                        </svg>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Seção 3 */}
                <div className="etn-note-section">
                  <div className="etn-note-section-num">3</div>
                  <div>
                    <div className="etn-note-section-title">Análise completa</div>
                    <p className="etn-note-section-text">
                      Esta abordagem é uma <strong>heurística de engenharia</strong>: remove o mínimo de arestas necessário para
                      eliminar todos os ciclos negativos, priorizando as mais negativas. Não há garantia de que o caminho retornado
                      seja ótimo em relação ao grafo original — apenas que é o menor caminho no grafo tratado.
                    </p>
                    <p className="etn-note-section-text">
                      Para a análise completa do Bellman-Ford sobre o grafo original (incluindo detecção de ciclos, distribuição
                      de pesos negativos e comparação com Dijkstra), consulte o <strong>relatório do projeto</strong>.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        <section className="glass-card app-top-bar clean-top-bar">
          <div className="field-group">
            <label>Porto de origem</label>
            <select value={startPort} onChange={(e) => handleStartChange(e.target.value)}>
              <option value="">Selecione a origem</option>
              {portOptions.map((p) => (
                <option key={p.value} value={p.value} disabled={p.value === endPort}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Porto de destino</label>
            <select value={endPort} onChange={(e) => handleEndChange(e.target.value)}>
              <option value="">Selecione o destino</option>
              {portOptions.map((p) => (
                <option key={p.value} value={p.value} disabled={p.value === startPort}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="top-action">
            <button
              onClick={() => calculatePath(startPort, endPort)}
              disabled={loading || !startPort || !endPort}
              className="modern-btn main"
              type="button"
            >
              {loading ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          <div className="top-action">
            <button onClick={resetSelection} className="modern-btn" type="button">Limpar</button>
          </div>
        </section>

        {pathResult?.success ? (
          <section className="glass-card app-route-summary">
            <div className="summary-stats">
              <div className="summary-stat">
                <div className="summary-label">Peso total</div>
                <div className="summary-value">{formattedCost}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-label">Conexões</div>
                <div className="summary-value">{pathResult.connections}</div>
              </div>
            </div>

            <div className="summary-route">
              <div className="summary-route-title">
                Rota encontrada
              </div>
              <div className="summary-route-subtitle">
                Sequência de portos do trajeto (menor caminho)
              </div>

              <div className="summary-route-flow">
                {pathResult.path.map((port, index) => (
                  <div key={index} className="route-flow-item">
                    <span className="route-flow-code">{port}</span>
                    {index < pathResult.path.length - 1 && <span className="route-flow-arrow">→</span>}
                  </div>
                ))}
              </div>

              <div className="path-details">
                {pathResult.path_info.map((port, index) => (
                  <div key={index} className="path-airport">
                    <span className="path-airport-code">{port.code}</span>
                    <span className="path-airport-separator">—</span>
                    <span className="path-airport-city">{port.name} ({port.country})</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : pathResult && pathResult.hasNegativeCycle && !cycleDismissed ? (
          <section className="glass-card etn-cycle-warning">
            <button
              type="button"
              className="etn-cycle-close"
              onClick={() => setCycleDismissed(true)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
            <div className="etn-cycle-warning-icon">⚠</div>
            <div>
              <div className="etn-cycle-warning-title">Ciclo negativo detectado</div>
              <div className="etn-cycle-warning-text">
                Existe um ciclo de peso negativo alcançável neste trajeto, então o problema do menor
                caminho é <strong>indefinido</strong> — seria sempre possível reduzir o custo dando mais
                uma volta no ciclo. Veja a simulação passo a passo abaixo.
              </div>
            </div>
          </section>
        ) : pathResult && pathResult.message ? (
          <section className="glass-card empty-summary">{pathResult.message}</section>
        ) : (
          <section className="glass-card empty-summary">
            Selecione um porto de origem e um de destino para calcular o menor caminho automaticamente.
          </section>
        )}

        <section className="glass-card app-modern-graph" style={{ position: 'relative' }}>
          <div className="map-section-header">
            <div className="map-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                width="16" height="16" style={{ color: '#26c281', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Mapa de Conexões Global
            </div>
            <button
              type="button"
              className="globe-3d-open-btn"
              onClick={() => setShow3DGlobe(true)}
              title="Abrir visualização 3D interativa do mapa"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                width="14" height="14">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Ver em 3D
            </button>
          </div>
          <WorldMap
            graphData={graphData}
            pathResult={pathResult}
            startPort={startPort}
            endPort={endPort}
            portMeta={portMeta}
            onNodeClick={handlePortClick}
          />
        </section>

        {show3DGlobe && (
          <Globe3DModal
            onClose={() => setShow3DGlobe(false)}
            graphData={graphData}
            pathResult={pathResult}
            startPort={startPort}
            endPort={endPort}
            portMeta={portMeta}
          />
        )}

        <div className="airport-connections-panel">
          <div className="airport-connections-header">
            <div className="airport-connections-title">Conexões do Porto</div>
            <div className="airport-connections-subtitle">
              Pesquise um porto para visualizar suas rotas diretas de saída.
            </div>
          </div>

          <div className="airport-connections-search" ref={searchRef}>
            <input
              type="text"
              className="search-bar-input"
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchResults([])
                if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0].id)
              }}
              placeholder="Digite o código ou o nome do porto"
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <ul className="search-bar-dropdown">
                {searchResults.map((n) => (
                  <li key={n.id} className="search-bar-item" onMouseDown={() => handleSearchSelect(n.id)}>
                    <strong className="search-bar-code">{n.id}</strong>
                    <span className="search-bar-city">{portMeta[n.id]?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedConnectionPort ? (
            <>
              <div className="airport-ego-panel-horizontal">
                <div className="ego-block-title">
                  {selectedConnectionPort.id}
                  {portMeta[selectedConnectionPort.id]?.name && (
                    <span className="ego-block-city"> — {portMeta[selectedConnectionPort.id].name}</span>
                  )}
                </div>
                <div className="ego-block-row">
                  <div className="ego-block-item"><span>País:</span> <strong>{portMeta[selectedConnectionPort.id]?.country || '-'}</strong></div>
                  <div className="ego-block-item"><span>Região:</span> <strong>{portMeta[selectedConnectionPort.id]?.region || '-'}</strong></div>
                  <div className="ego-block-item"><span>Rotas de saída:</span> <strong>{selectedConnectionPort.connections.length}</strong></div>
                </div>
              </div>
              <div className="airport-connections-content">
                {selectedConnectionPort.connections.length > 0 ? (
                  <>
                    <div className="airport-connections-list">
                      {selectedConnectionPort.connections.slice(0, visibleConns).map((connection, index) => (
                        <div
                          key={`${selectedConnectionPort.id}-${connection.code}-${index}`}
                          className={`airport-connection-card etn-conn-card${hoveredPortModal?.code === connection.code ? ' etn-conn-card-active' : ''}`}
                          onClick={() => setHoveredPortModal(
                            hoveredPortModal?.code === connection.code ? null : { code: connection.code }
                          )}
                        >
                          <div className="airport-connection-info">
                            <div className="airport-connection-code">{connection.code}</div>
                            {connection.name && <div className="airport-connection-city">{connection.name}</div>}
                          </div>
                          <div className="airport-connection-weight">Peso {formatWeight(connection.weight)}</div>
                        </div>
                      ))}
                    </div>
                    {visibleConns < selectedConnectionPort.connections.length && (
                      <button
                        type="button"
                        className="etn-show-more-btn"
                        onClick={() => setVisibleConns((v) => v + 9)}
                      >
                        Mostrar mais ({selectedConnectionPort.connections.length - visibleConns} restantes)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="airport-connections-no-data">Este porto não possui rotas de saída cadastradas.</div>
                )}
              </div>
            </>
          ) : (
            <div className="airport-connections-empty">Pesquise um porto acima para exibir suas conexões aqui.</div>
          )}
        </div>

        <div className="algorithm-steps-panel">
          <div className="algorithm-steps-header">
            <div className="algorithm-steps-title">
              Passo a passo do Bellman-Ford
            </div>
            <div className="algorithm-steps-subtitle">
              Cada passo é uma iteração de relaxamento de todas as arestas. Com ciclo negativo, as distâncias continuam caindo e o problema torna-se indefinido.
            </div>
          </div>

          {startPort && endPort ? (
            bellmanSteps.length > 0 ? (
              <>
                <div className="algorithm-steps-table-wrap">
                  <table className="algorithm-steps-table">
                    <thead>
                      <tr>
                        <th>Porto</th>
                        {bellmanSteps.map((step, i) => (
                          <th key={`col-${i}`}>
                            {`Iteração ${step.iteration}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bellmanTableNodes.map((nodeId) => (
                        <tr key={nodeId}>
                          <td className="algorithm-node-label">{nodeId}</td>
                          {bellmanSteps.map((step, stepIndex) => {
                            const isFinalPath = stepIndex === bellmanSteps.length - 1 &&
                              bellmanVerdict === 'done' && pathResult?.success &&
                              pathResult.path?.includes(nodeId)

                            // Destaque na coluna da célula destino
                            const highlighted = nodeId === endPort

                            return (
                              <td
                                key={`${nodeId}-${stepIndex}`}
                                className={[
                                  highlighted ? 'is-active-step' : '',
                                  isFinalPath ? 'is-final-path-step' : '',
                                ].filter(Boolean).join(' ')}
                              >
                                <span className={`algorithm-step-value${highlighted ? ' emphasis' : ''}`}>
                                  {step.rows[nodeId]}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="algorithm-steps-status">
                  {isSimulating ? (
                    <span className="algorithm-status-badge running">
                      Executando relaxamento...
                    </span>
                  ) : bellmanVerdict === 'cycle' ? (
                    <span className="algorithm-status-badge cycle">⚠ Ciclo negativo detectado → problema indefinido</span>
                  ) : (
                    <span className="algorithm-status-badge done">
                      Menor caminho encontrado
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="algorithm-steps-empty">
                Selecione origem e destino para iniciar a simulação do algoritmo.
              </div>
            )
          ) : (
            <div className="algorithm-steps-empty">
              Escolha um porto de origem e um de destino para visualizar a execução passo a passo.
            </div>
          )}
        </div>
      </main>

      {hoveredPortModal && (
        <PortCuriosityModal
          portCode={hoveredPortModal.code}
          onClose={() => setHoveredPortModal(null)}
        />
      )}
    </div>
  )
}

export default PainelRotasETN
