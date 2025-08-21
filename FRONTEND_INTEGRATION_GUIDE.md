# Guia de Integração Frontend - Token x-frontend-auth

## Visão Geral
Este guia explica como implementar corretamente a autenticação no frontend para acessar rotas protegidas pelo `FrontendOriginGuard`.

## Como Funciona
O backend valida três elementos:
1. **User-Agent**: Deve ser de um navegador (não Postman/curl)
2. **Origin/Referer**: Deve vir de uma origem permitida
3. **x-frontend-auth**: Token hexadecimal de 64 caracteres

## Implementação Frontend

### 1. Função de Geração de Token
```typescript
// utils/frontendAuth.ts
export function generateFrontendAuth(): string {
  console.log("🔑 Generating simple 64-char hex token (as per backend docs)");

  // Gera um token hexadecimal de 64 caracteres (como esperado pelo backend)
  const array = new Uint8Array(32); // 32 bytes = 64 hex chars
  crypto.getRandomValues(array);
  const token = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  console.log("🔐 Generated 64-char hex token:", token);
  console.log("📏 Token length:", token.length);

  return token;
}

// Função para gerar headers de autenticação frontend
export function getFrontendAuthHeaders(): Record<string, string> {
  const token = generateFrontendAuth();

  const headers = {
    "x-frontend-auth": token,
    "Content-Type": "application/json",
  };

  console.log("📤 Generated headers:", headers);

  return headers;
}
```

### 2. Uso com Axios (Como no seu código)
```typescript
// No seu hook/service
const getVisitors = useCallback(
  async (
    fairId?: string,
    search?: string,
    searchField?: string,
    page?: number,
    limit?: number
  ) => {
    const params: Record<string, string> = {};

    // Só adiciona parâmetros que têm valores válidos
    if (fairId?.trim()) params.fairId = fairId.trim();
    if (search?.trim()) params.search = search.trim();
    if (searchField?.trim() && searchField !== "all")
      params.searchField = searchField.trim();
    if (typeof page === "number" && page > 0) params.page = page.toString();
    if (typeof limit === "number" && limit > 0)
      params.limit = limit.toString();

    const result = await handleRequest({
      request: () =>
        api.get("visitors", {
          params,
          headers: getFrontendAuthHeaders(), // ✅ Headers corretos aqui
        }),
      setLoading,
    });
    
    if (!result) return;

    // Backend retorna formato diferente baseado nos parâmetros
    if (result.data && result.meta) {
      // Resposta paginada
      setVisitors(result.data);
      setPaginationMeta(result.meta);
    } else {
      // Resposta simples (array direto)
      setVisitors(result);
      setPaginationMeta(null);
    }
  },
  [api, setLoading]
);
```

### 3. Debug no Network Tab
Para verificar se está funcionando:

1. **Abra DevTools** (F12)
2. **Vá na aba Network**
3. **Faça a requisição** para `/visitors`
4. **Clique na requisição** e verifique na aba **Headers**:
   - `x-frontend-auth`: deve ter 64 caracteres
   - `Referer`: deve ser `http://localhost:5173/`
   - `Authorization`: deve ter o Bearer token

### 4. Teste Isolado
Se ainda estiver com problema, teste isolado:

```typescript
// Teste direto no console do navegador
const testHeaders = getFrontendAuthHeaders();
console.log('Headers gerados:', testHeaders);
console.log('Tamanho do token:', testHeaders['x-frontend-auth'].length);

// Teste requisição direta
fetch('/visitors?fairId=da6e3a8a-07dd-4964-a892-08a626bdd64f&page=1&limit=1', {
  headers: {
    ...testHeaders,
    'Authorization': 'Bearer seu-jwt-token-aqui'
  }
}).then(r => r.json()).then(console.log);
```

### 5. Problemas Comuns e Soluções

#### ❌ Interceptor do Axios sobrescrevendo headers
```typescript
// PROBLEMA: Se o axios interceptor estiver definindo headers diferentes
api.interceptors.request.use(config => {
  // ❌ ERRADO: pode sobrescrever headers específicos
  config.headers = { 'Content-Type': 'application/json' };
  return config;
});

// ✅ CORRETO: mesclar headers
api.interceptors.request.use(config => {
  config.headers = {
    ...config.headers,
    'Content-Type': 'application/json'
  };
  return config;
});
```

#### ❌ Cache do navegador
```typescript
// ✅ Force cache bypass temporariamente
const result = await api.get("visitors", {
  params: { ...params, _t: Date.now() }, // Cache buster
  headers: getFrontendAuthHeaders(),
});
```

#### ❌ Headers sendo removidos pelo proxy/CORS
Verifique se há configuração de proxy que remove headers customizados.

### 5. React Hook Exemplo
```javascript
// hooks/useVisitors.js
import { useState } from 'react';
import { getProtectedHeaders } from '../utils/apiClient.js';

export function useVisitors() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchVisitors = async (fairId, authToken) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/visitors?fairId=${fairId}`, {
        headers: {
          ...getProtectedHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar visitantes');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { fetchVisitors, loading, error };
}
```

### 6. Componente React Exemplo
```jsx
// components/VisitorsList.jsx
import React, { useEffect, useState } from 'react';
import { useVisitors } from '../hooks/useVisitors.js';
import { useAuth } from '../hooks/useAuth.js'; // Assumindo que existe

export function VisitorsList({ fairId }) {
  const [visitors, setVisitors] = useState([]);
  const { fetchVisitors, loading, error } = useVisitors();
  const { authToken } = useAuth();
  
  useEffect(() => {
    if (fairId && authToken) {
      fetchVisitors(fairId, authToken)
        .then(setVisitors)
        .catch(console.error);
    }
  }, [fairId, authToken]);
  
  if (loading) return <div>Carregando visitantes...</div>;
  if (error) return <div>Erro: {error}</div>;
  
  return (
    <div>
      <h2>Visitantes</h2>
      {visitors.map(visitor => (
        <div key={visitor.registrationCode}>
          {visitor.name} - {visitor.company}
        </div>
      ))}
    </div>
  );
}
```

## Rotas e Proteção

### Rotas Protegidas (precisam do x-frontend-auth)
- ✅ `GET /visitors` - Lista de visitantes
- ✅ `POST /visitors` - Criação de visitante

### Rotas Públicas (não precisam do token)
- ❌ `GET /visitors/pdf/:fairId` - Download do PDF

## Pontos Importantes

### ✅ O que FAZER:
- Gerar token `x-frontend-auth` a cada requisição
- Usar tokens de exatamente 64 caracteres hexadecimais
- Deixar o navegador gerenciar Origin/Referer automaticamente
- Incluir o token JWT no Authorization header
- Usar User-Agent de navegador real

### ❌ O que NÃO fazer:
- Definir header Origin manualmente (pode causar CORS)
- Reutilizar o mesmo token x-frontend-auth
- Incluir token x-frontend-auth em rotas públicas
- Usar ferramentas de API (Postman) para testar

## Troubleshooting

### Erro: "Cliente de API detectado"
- **Causa**: User-Agent de ferramenta de API
- **Solução**: Usar apenas navegador real

### Erro: "Origem não permitida"
- **Causa**: Referer não está nas origens permitidas
- **Solução**: Verificar se está acessando de localhost:5173

### Erro: "Token de frontend inválido"
- **Causa**: Token não tem 64 caracteres ou formato incorreto
- **Solução**: Usar a função generateFrontendAuth() fornecida

## Origens Permitidas
- `http://localhost:5173` (Development)
- `http://localhost:3001` (Development alt)
- `https://credenciamento-frontend.vercel.app` (Production)
- `https://www.expomultimix.com` (Production www)

## Exemplo Completo de Requisição
```javascript
const response = await fetch('/visitors?fairId=123', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer seu-jwt-token',
    'x-frontend-auth': 'a1b2c3d4e5f6...64chars' // Gerado automaticamente
    // Referer: http://localhost:5173/ (automático)
    // User-Agent: Mozilla/5.0... (automático)
  }
});
```

A implementação está testada e funcionando. Basta seguir este guia para integrar corretamente!
