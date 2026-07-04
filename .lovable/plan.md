## Objetivo
Cadastrar as 10 cidades mais populosas de cada um dos 24 estados que hoje não possuem cidades em `cidades_autorizados` (todos exceto PR, SC e RS).

## Como
Um único INSERT em `cidades_autorizados` (via tool de dados), preenchendo `estado_id`, `nome` e `ordem` (1 a 10, seguindo o ranking populacional IBGE mais recente).

## Cidades por estado (top 10 por população)

- **AC:** Rio Branco, Cruzeiro do Sul, Sena Madureira, Tarauacá, Feijó, Brasiléia, Plácido de Castro, Senador Guiomard, Xapuri, Mâncio Lima
- **AL:** Maceió, Arapiraca, Rio Largo, Palmeira dos Índios, Penedo, União dos Palmares, São Miguel dos Campos, Coruripe, Delmiro Gouveia, Campo Alegre
- **AM:** Manaus, Parintins, Itacoatiara, Manacapuru, Coari, Tabatinga, Maués, Tefé, Iranduba, Humaitá
- **AP:** Macapá, Santana, Laranjal do Jari, Oiapoque, Mazagão, Porto Grande, Tartarugalzinho, Pedra Branca do Amapari, Vitória do Jari, Amapá
- **BA:** Salvador, Feira de Santana, Vitória da Conquista, Camaçari, Itabuna, Juazeiro, Lauro de Freitas, Ilhéus, Jequié, Teixeira de Freitas
- **CE:** Fortaleza, Caucaia, Juazeiro do Norte, Maracanaú, Sobral, Crato, Itapipoca, Maranguape, Iguatu, Quixadá
- **DF:** Brasília (única cidade — inserida como registro único)
- **ES:** Serra, Vila Velha, Cariacica, Vitória, Cachoeiro de Itapemirim, Linhares, São Mateus, Colatina, Guarapari, Aracruz
- **GO:** Goiânia, Aparecida de Goiânia, Anápolis, Rio Verde, Luziânia, Águas Lindas de Goiás, Valparaíso de Goiás, Trindade, Formosa, Novo Gama
- **MA:** São Luís, Imperatriz, São José de Ribamar, Timon, Caxias, Codó, Paço do Lumiar, Açailândia, Bacabal, Balsas
- **MG:** Belo Horizonte, Uberlândia, Contagem, Juiz de Fora, Betim, Montes Claros, Ribeirão das Neves, Uberaba, Governador Valadares, Ipatinga
- **MS:** Campo Grande, Dourados, Três Lagoas, Corumbá, Ponta Porã, Naviraí, Nova Andradina, Sidrolândia, Aquidauana, Paranaíba
- **MT:** Cuiabá, Várzea Grande, Rondonópolis, Sinop, Tangará da Serra, Cáceres, Sorriso, Lucas do Rio Verde, Barra do Garças, Primavera do Leste
- **PA:** Belém, Ananindeua, Santarém, Marabá, Parauapebas, Castanhal, Abaetetuba, Cametá, Marituba, Bragança
- **PB:** João Pessoa, Campina Grande, Santa Rita, Patos, Bayeux, Sousa, Cajazeiras, Cabedelo, Guarabira, Sapé
- **PE:** Recife, Jaboatão dos Guararapes, Olinda, Caruaru, Petrolina, Paulista, Cabo de Santo Agostinho, Camaragibe, Garanhuns, Vitória de Santo Antão
- **PI:** Teresina, Parnaíba, Picos, Piripiri, Floriano, Campo Maior, Barras, União, Altos, Pedro II
- **RJ:** Rio de Janeiro, São Gonçalo, Duque de Caxias, Nova Iguaçu, Niterói, Belford Roxo, São João de Meriti, Campos dos Goytacazes, Petrópolis, Volta Redonda
- **RN:** Natal, Mossoró, Parnamirim, São Gonçalo do Amarante, Macaíba, Ceará-Mirim, Caicó, Assú, Currais Novos, Nova Cruz
- **RO:** Porto Velho, Ji-Paraná, Ariquemes, Vilhena, Cacoal, Rolim de Moura, Jaru, Guajará-Mirim, Pimenta Bueno, Ouro Preto do Oeste
- **RR:** Boa Vista, Rorainópolis, Caracaraí, Alto Alegre, Mucajaí, Cantá, Pacaraima, Bonfim, São João da Baliza, Normandia
- **SE:** Aracaju, Nossa Senhora do Socorro, Lagarto, Itabaiana, São Cristóvão, Estância, Tobias Barreto, Itabaianinha, Simão Dias, Propriá
- **SP:** São Paulo, Guarulhos, Campinas, São Bernardo do Campo, Santo André, Osasco, São José dos Campos, Ribeirão Preto, Sorocaba, Santos
- **TO:** Palmas, Araguaína, Gurupi, Porto Nacional, Paraíso do Tocantins, Colinas do Tocantins, Guaraí, Tocantinópolis, Dianópolis, Formoso do Araguaia

## Confirmação
- Confirma o cadastro dessas 24 listas exatamente como acima? Se preferir, posso trocar o DF por uma lista de regiões administrativas (ex.: Ceilândia, Taguatinga, Samambaia…) em vez de só "Brasília".
