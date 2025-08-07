# Módulo Drogas

## Descrição
Este módulo monitora logs de drogas no canal especificado e verifica se os usuários mencionados possuem os cargos necessários. Se um usuário não possuir nenhum dos cargos configurados, o bot envia uma mensagem alertando sobre a falta do cargo SET.

## Funcionalidades
- Monitora mensagens no canal de logs de drogas
- Verifica se usuários mencionados possuem cargos específicos
- Envia alertas quando usuários não possuem cargos necessários
- Responde diretamente aos logs com embeds informativos

## Configuração
- **Servidor**: 1326731475797934080
- **Canal de Logs**: 1346116253252714597
- **Cargo SET**: 1326731475818909733

## Cargos Verificados
O módulo verifica se o usuário possui pelo menos um dos seguintes cargos:
- 1326731475818909732
- 1326731475818909731
- 1326731475818909730
- 1326731475818909729
- 1326731475818909728
- 1326731475818909727
- 1326731475818909726
- 1326731475806191716
- 1326731475806191715
- 1326731475806191714
- 1326731475806191713
- 1326731475806191712
- 1326731475806191711
- 1326731475806191710
- 1326731475806191709
- 1326731475806191708
- 1326731475806191707
- 1326731475797934089
- 1326731475797934088
- 1326731475797934087
- 1326731475797934086
- 1326731475797934085
- 1326731475797934084
- 1326731475797934083
- 1326731475797934082
- 1326731475797934081
- 1332041004978536461
- 1332041504545312841

## Como Funciona
1. O bot monitora todas as mensagens no canal configurado
2. Quando uma mensagem contém "SCC Gangs Logs", o bot extrai o ID do usuário mencionado
3. Verifica se o usuário possui algum dos cargos necessários
4. Se não possuir, envia uma mensagem de resposta com embed alertando sobre a falta do cargo SET

## Estrutura de Arquivos
```
drogas/
├── index.js          # Arquivo principal do módulo
├── loader.js         # Carregador do módulo
├── events/
│   └── messageCreate.js  # Evento que monitora mensagens
└── README.md         # Esta documentação
```

## Dependências
- discord.js
- Node.js

## Versão
1.0.0
