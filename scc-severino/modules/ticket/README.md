# Sistema de Tickets com Herança de Permissões

Este módulo implementa um sistema de tickets que herda automaticamente as permissões das categorias pai, garantindo que os cargos de staff tenham acesso aos tickets de suas respectivas áreas.

## Funcionalidades

- ✅ Herança automática de permissões da categoria
- ✅ Permissões específicas para criadores de tickets
- ✅ Sistema de categorias configurável
- ✅ Verificação de permissões por categoria
- ✅ Criação de tickets com permissões corretas

## Configuração

### 1. Configurar IDs dos Cargos de Staff

Edite o arquivo `config.js` e adicione os IDs dos cargos de staff para cada categoria:

```javascript
export const CATEGORY_CONFIG = {
  suporte: {
    id: '1386490182085382294',
    name: 'Suporte',
    emoji: '📁',
    description: 'Suporte técnico e ajuda geral',
    staffRoles: [
      '1234567890123456789', // ID do cargo de Suporte
      '9876543210987654321'  // ID do cargo de Moderador
    ]
  },
  bugs: {
    id: '1386490279384846418',
    name: 'Reportar Bugs',
    emoji: '🦠',
    description: 'Reportar erros e problemas técnicos',
    staffRoles: [
      '1111111111111111111', // ID do cargo de Desenvolvedor
      '2222222222222222222'  // ID do cargo de QA
    ]
  },
     revisao: {
     id: '1402054800933392565',
     name: 'Revisão',
     emoji: '🔍',
     description: 'Solicitar revisão de decisões e processos',
     staffRoles: [
       '1277638402019430501', // Cargo de Moderador
       '1226903187055972484', // Cargo de Admin
       '1046404063522197521'  // Cargo de Owner
     ]
   },
  // ... outras categorias
};
```

### 2. Configurar Permissões da Categoria

Para que a herança funcione corretamente, configure as permissões da categoria no Discord:

1. Acesse a categoria no Discord
2. Clique com botão direito → "Editar Categoria"
3. Vá na aba "Permissões"
4. Adicione os cargos de staff com as permissões necessárias:
   - **Ver Canal**: ✅
   - **Enviar Mensagens**: ✅
   - **Ler Histórico de Mensagens**: ✅
   - **Anexar Arquivos**: ✅
   - **Incorporar Links**: ✅
   - **Gerenciar Mensagens**: ✅ (para staff)
   - **Gerenciar Canais**: ✅ (para staff)

### 3. Permissões Automáticas

O sistema automaticamente:

- **Herdará** todas as permissões da categoria pai
- **Negará** acesso para @everyone
- **Concederá** permissões específicas para o criador do ticket
- **Mesclará** permissões conflitantes de forma inteligente

## Como Funciona

### Herança de Permissões

1. **Busca da Categoria**: O sistema busca a categoria pai pelo ID
2. **Extração de Permissões**: Copia todas as permissões configuradas na categoria
3. **Mesclagem Inteligente**: Combina permissões da categoria com permissões específicas do ticket
4. **Aplicação**: Cria o canal com todas as permissões corretas

### Exemplo de Fluxo

```
Categoria "Suporte" tem:
- Cargo "Suporte" com permissões completas
- Cargo "Moderador" com permissões completas

Ticket criado herda:
- Todas as permissões da categoria
- + Permissões específicas para o criador
- + Negação para @everyone
```

## Comandos Disponíveis

- `!abrir-ticket` - Abre um ticket de suporte básico
- `!painel-ticket` - Mostra o painel de tickets (se implementado)

## Eventos

- **interactionCreate**: Gerencia botões e modais do sistema de tickets
- **ready**: Inicialização do módulo

## Utilitários

### `ticketUtils.js`

- `inheritCategoryPermissions()` - Herda permissões da categoria
- `createTicketPermissionsWithInheritance()` - Cria permissões completas
- `createTicketChannelWithInheritance()` - Cria canal com herança
- `hasCategoryPermission()` - Verifica permissões por categoria
- `getMemberCategories()` - Lista categorias do membro

### `ticketPermissions.js`

- Funções auxiliares para gerenciamento de permissões
- Verificação de categorias cheias
- Gerenciamento de cargos de staff

## Troubleshooting

### Erro: "Categoria não encontrada"
- Verifique se o ID da categoria está correto no `config.js`
- Confirme se a categoria existe no servidor

### Erro: "Sem permissão para criar canal"
- Verifique se o bot tem permissão "Gerenciar Canais"
- Confirme se o bot tem permissão na categoria pai

### Permissões não estão sendo herdadas
- Verifique se as permissões estão configuradas na categoria
- Confirme se os IDs dos cargos estão corretos no `config.js`

## Personalização

### Adicionar Nova Categoria

1. Adicione a configuração no `config.js`:
```javascript
nova_categoria: {
  id: 'SEU_ID_DA_CATEGORIA',
  name: 'Nova Categoria',
  emoji: '🔧',
  description: 'Descrição da categoria',
  staffRoles: ['ID_DO_CARGO_1', 'ID_DO_CARGO_2']
}
```

2. Adicione o botão no painel de tickets (se aplicável)

### Modificar Permissões

Edite as constantes no `config.js`:
- `CREATOR_PERMISSIONS` - Permissões para criadores de tickets
- `STAFF_PERMISSIONS` - Permissões para equipe de staff 