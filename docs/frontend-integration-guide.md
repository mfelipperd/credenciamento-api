# Guia de Integração Frontend: Marcas de Clientes (Stands)

Este documento detalha como integrar o frontend com a nova API de Marcas dos Clientes (pessoas/empresas que compram os stands na feira).

> [!IMPORTANT]
> **Aviso de Terminology / Entidade**: No banco de dados, os compradores de stands da feira estão representados pela entidade **Client** (Clientes), nas tabelas/rotas sob `/finance/clients`. O frontend deve exibir e alertar para o gerenciamento de Marcas dentro do cadastro e edição desses **Clientes** (compradores de stands), permitindo que um único cliente possua múltiplas marcas.

---

## 1. Cadastro e Visualização do Cliente (CRUD Clientes)

### Listar Clientes
Agora você pode filtrar os clientes diretamente por feira usando o parâmetro `fairId`.

* **Método**: `GET`
* **Rota**: `/finance/clients`
* **Query Params**:
  * `fairId` (opcional): ID da feira para obter somente clientes vinculados a ela.
  * `search` (opcional): Busca por nome do cliente.
* **Retorno**: Array de clientes, incluindo suas marcas associadas:
  ```json
  [
    {
      "id": "7fa84b80-4965-4f40-8c29-3733075b31bf",
      "fairId": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Empresa de Bebidas S/A",
      "cnpj": "12.345.678/0001-90",
      "email": "contato@bebidas.com",
      "phone": "(11) 99999-9999",
      "responsavel": "João Silva",
      "createdAt": "2026-06-05T13:30:00.000Z",
      "updatedAt": "2026-06-05T13:30:00.000Z",
      "brands": [
        {
          "id": "e912f2cb-8ca9-4b68-b7cf-ef2b012678fe",
          "clientId": "7fa84b80-4965-4f40-8c29-3733075b31bf",
          "name": "Refrigerante Cola Mix",
          "logoUrl": "http://localhost:8000/uploads/brands/1749163200000-847291039.png",
          "createdAt": "2026-06-05T13:35:00.000Z",
          "updatedAt": "2026-06-05T13:35:00.000Z"
        }
      ]
    }
  ]
  ```

---

## 2. CRUD de Marcas (Brands)

Para lidar com o upload de imagens dos logotipos, as rotas de criação e edição usam o formato `multipart/form-data`.

### Adicionar Marca ao Cliente
Permite adicionar uma nova marca a um cliente já cadastrado.

* **Método**: `POST`
* **Rota**: `/finance/clients/:id/brands`
* **Headers**: `Content-Type: multipart/form-data`
* **Body (Form Data)**:
  * `name` (string): Nome da marca.
  * `logo` (File/Blob): O arquivo de imagem contendo o logotipo.
* **Retorno (201 Created)**:
  ```json
  {
    "id": "e912f2cb-8ca9-4b68-b7cf-ef2b012678fe",
    "clientId": "7fa84b80-4965-4f40-8c29-3733075b31bf",
    "name": "Refrigerante Cola Mix",
    "logoUrl": "http://localhost:8000/uploads/brands/1749163200000-847291039.png",
    "createdAt": "2026-06-05T13:35:00.000Z",
    "updatedAt": "2026-06-05T13:35:00.000Z"
  }
  ```

### Editar Marca
Permite atualizar o nome e/ou o logotipo de uma marca existente.

* **Método**: `PATCH`
* **Rota**: `/finance/brands/:brandId`
* **Headers**: `Content-Type: multipart/form-data`
* **Body (Form Data - campos opcionais)**:
  * `name` (string, opcional): Novo nome da marca.
  * `logo` (File/Blob, opcional): Novo logotipo se desejar substituir o anterior.
* **Retorno (200 OK)**: Retorna a marca atualizada com a nova `logoUrl` caso tenha sido enviada.

### Remover Marca
Exclui permanentemente a marca e apaga seu logotipo físico do servidor.

* **Método**: `DELETE`
* **Rota**: `/finance/brands/:brandId`
* **Retorno (204 No Content)**: Sem corpo de retorno.

---

## 3. Exibição de Marcas no Site Institucional da Feira

Disponibilizamos uma rota **pública** (que não exige token JWT de autenticação no header) para listar todas as marcas que estão presentes nos stands da feira. Esta rota é ideal para consumo pelo frontend do site institucional da feira.

* **Método**: `GET`
* **Rota**: `/finance/brands`
* **Query Params**:
  * `fairId` (obrigatório): O ID da feira da qual deseja-se exibir as marcas dos stands.
* **Retorno**:
  ```json
  [
    {
      "id": "e912f2cb-8ca9-4b68-b7cf-ef2b012678fe",
      "clientId": "7fa84b80-4965-4f40-8c29-3733075b31bf",
      "name": "Refrigerante Cola Mix",
      "logoUrl": "http://localhost:8000/uploads/brands/1749163200000-847291039.png",
      "createdAt": "2026-06-05T13:35:00.000Z",
      "updatedAt": "2026-06-05T13:35:00.000Z",
      "client": {
        "id": "7fa84b80-4965-4f40-8c29-3733075b31bf",
        "name": "Empresa de Bebidas S/A"
      }
    }
  ]
  ```

---

## 4. Recomendações para a UI do Frontend

1. **Alerta Visual**: Adicionar na tela de cadastro/detalhes do cliente (comprador de stand) uma seção clara de "Marcas da Feira" ou "Marcas Representadas".
2. **Gerenciador de Marcas**:
   * Permitir que o usuário veja uma lista de marcas com miniaturas (thumbnail) dos logotipos.
   * Adicionar um botão "+ Adicionar Marca" que abre um modal ou linha com inputs para nome e upload de arquivo de imagem.
   * Botões de "Editar" (que permitem trocar o nome ou reenviar o arquivo de logo) e "Excluir" (com confirmação antes de remover).
3. **Carregamento Assíncrono**: Ao abrir o cadastro de um cliente, use os dados do array `brands` que já vem populado no `GET /finance/clients/:id` para carregar a interface rapidamente.
