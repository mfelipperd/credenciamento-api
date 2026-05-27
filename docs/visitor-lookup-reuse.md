# Reaproveitamento de Dados de Visitantes entre Feiras

> **Rota privada** — requer autenticação JWT (uso exclusivo na plataforma, por recepcionistas).

---

## Visão Geral

Quando uma recepcionista vai cadastrar um visitante em uma nova feira, é possível pesquisar se esse visitante **já participou de feiras anteriores** e reaproveitar os dados cadastrados. O frontend exibe os dados encontrados pré-preenchidos no formulário, indica quais campos estão incompletos e, ao confirmar, cria um **novo registro** vinculado à feira atual.

---

## Fluxo Completo

```
┌─────────────────────────────────────────────────┐
│          RECEPCIONISTA INICIA CADASTRO           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│   Recepcionista digita dados parciais do        │
│   visitante (ex: nome + CPF/CNPJ)               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│   Frontend chama GET /visitors/lookup           │
│   com os parâmetros disponíveis                 │
└─────────────────┬───────────────────────────────┘
                  │
          ┌───────┴───────┐
          │               │
    Encontrou         Não encontrou
          │               │
          ▼               ▼
┌─────────────────┐  ┌────────────────────────────┐
│ Exibe sugestões │  │ Formulário em branco —     │
│ com dados pré-  │  │ cadastro normal            │
│ preenchidos     │  └────────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Recepcionista seleciona o visitante correto    │
│  Campos incompletos são sinalizados             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Recepcionista completa/corrige os dados        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Frontend chama POST /visitors                  │
│  com todos os dados + campo sourceFairId        │
│  (id da feira de onde os dados vieram)          │
└─────────────────────────────────────────────────┘
```

---

## Endpoints

### 1. Buscar visitante em feiras anteriores

```
GET /visitors/lookup
Authorization: Bearer <token>
```

#### Query Parameters

| Parâmetro | Tipo   | Obrigatório | Descrição                          |
|-----------|--------|-------------|------------------------------------|
| `name`    | string | ✦ mín. 2   | Nome completo ou parcial           |
| `phone`   | string | ✦ mín. 2   | Telefone (com ou sem formatação)   |
| `cnpj`    | string | ✦ mín. 2   | CNPJ (com ou sem pontuação)        |
| `email`   | string | ✦ mín. 2   | E-mail (busca parcial)             |

> **✦ Mínimo 2 parâmetros obrigatórios.** Com menos de 2 a API retorna `[]` (array vazio).  
> Os parâmetros são combinados com lógica **AND** — quanto mais parâmetros, mais precisa a busca.

#### Exemplos de chamada

```
# Nome + CNPJ (mais preciso)
GET /visitors/lookup?name=João Silva&cnpj=12.345.678/0001-90

# Nome + Telefone
GET /visitors/lookup?name=Maria&phone=(11) 99999-8888

# E-mail + Nome
GET /visitors/lookup?email=joao@empresa.com&name=João
```

#### Response `200 OK`

```json
[
  {
    "registrationCode": "VIS-2024-00042",
    "name": "João Silva",
    "email": "joao@empresa.com",
    "phone": "(11) 99999-8888",
    "company": "Empresa LTDA",
    "cnpj": "12.345.678/0001-90",
    "role": "Diretor Comercial",
    "segment": "Tecnologia",
    "city": "São Paulo",
    "state": "SP",
    "missingFields": ["address", "complement"],
    "fairHistory": [
      {
        "fairId": "uuid-da-feira",
        "fairName": "ExpoMultimix 2024",
        "fairYear": 2024,
        "state": "SP",
        "registrationDate": "2024-03-15T10:30:00.000Z"
      }
    ]
  }
]
```

#### Campo `missingFields`

Lista dos campos que estão **vazios ou nulos** no cadastro existente. O frontend deve destacar visualmente esses campos no formulário para que a recepcionista os preencha.

| Valor possível    | Campo correspondente       |
|-------------------|----------------------------|
| `"phone"`         | Telefone                   |
| `"company"`       | Empresa                    |
| `"cnpj"`          | CNPJ                       |
| `"role"`          | Cargo                      |
| `"segment"`       | Segmento                   |
| `"city"`          | Cidade                     |
| `"state"`         | Estado (UF)                |
| `"address"`       | Endereço                   |
| `"complement"`    | Complemento                |

---

### 2. Criar novo cadastro com dados reaproveitados

Após selecionar o visitante e preencher os campos faltantes, o frontend chama o endpoint normal de criação:

```
POST /visitors
Content-Type: application/json
```

> **Esta rota é pública** — não requer autenticação (usada tanto no formulário público quanto na plataforma interna).

#### Body

```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "(11) 99999-8888",
  "company": "Empresa LTDA",
  "cnpj": "12.345.678/0001-90",
  "role": "Diretor Comercial",
  "segment": "Tecnologia",
  "city": "São Paulo",
  "state": "SP",
  "address": "Rua das Flores, 123",
  "complement": "Sala 5",
  "fairId": "uuid-da-nova-feira",
  "sourceFairId": "uuid-da-feira-de-onde-os-dados-vieram"
}
```

#### Campo `sourceFairId` (opcional)

Informa de qual feira os dados foram reaproveitados. É salvo no banco para manter o histórico de reaproveitamento.

- **Quando enviar:** sempre que o cadastro foi pré-preenchido com dados de uma feira anterior.
- **Quando omitir:** cadastro completamente novo, sem dados reaproveitados.

---

## Implementação sugerida no Frontend

```typescript
// 1. Recepcionista digita dados e clica em "Verificar visitante"
async function verificarVisitante(dados: { name?: string; cnpj?: string; phone?: string; email?: string }) {
  const params = new URLSearchParams();
  if (dados.name)  params.set('name',  dados.name);
  if (dados.cnpj)  params.set('cnpj',  dados.cnpj);
  if (dados.phone) params.set('phone', dados.phone);
  if (dados.email) params.set('email', dados.email);

  // Validar mínimo 2 parâmetros antes de chamar
  if ([dados.name, dados.cnpj, dados.phone, dados.email].filter(Boolean).length < 2) {
    alert('Informe pelo menos 2 dados para buscar o visitante.');
    return;
  }

  const res = await fetch(`/visitors/lookup?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json(); // Array de visitantes encontrados
}

// 2. Usuário seleciona o visitante sugerido
function preencherFormulario(visitante) {
  setFormValues({
    name:      visitante.name,
    email:     visitante.email,
    phone:     visitante.phone,
    company:   visitante.company,
    cnpj:      visitante.cnpj,
    role:      visitante.role,
    segment:   visitante.segment,
    city:      visitante.city,
    state:     visitante.state,
    address:   visitante.address,
    complement: visitante.complement,
    // Salvar referência para enviar no POST
    _sourceFairId: visitante.fairHistory[0]?.fairId ?? null,
  });

  // Destacar campos incompletos
  visitante.missingFields.forEach(field => {
    highlightField(field, 'warning'); // ex: borda amarela
  });
}

// 3. Submeter cadastro
async function submeterCadastro(dados, sourceFairId: string | null) {
  await fetch('/visitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...dados,
      fairId: fairAtualId,
      ...(sourceFairId ? { sourceFairId } : {}),
    }),
  });
}
```

---

## Observações Importantes

- **A busca não matrícula o visitante** — apenas retorna dados para pré-preenchimento. O `POST /visitors` é quem efetivamente cria o registro na nova feira.
- **Dados sempre atualizados:** mesmo que o visitante seja encontrado, a recepcionista pode editar qualquer campo. O novo cadastro salva os dados enviados no POST (não os dados antigos).
- **Múltiplos resultados:** a API pode retornar mais de um visitante. O frontend deve exibir uma lista para seleção.
- **Sem resultado:** se o array vier vazio, exibir formulário em branco normalmente.
- **`fairHistory`** mostra todas as feiras que o visitante já participou, útil para exibir um histórico na interface.
